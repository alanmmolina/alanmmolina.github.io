---
title: Iceberg
date: 2026-07-09
draft: false
tags:
  - notes
  - tools
  - open-table-formats
  - data-engineering
  - iceberg
---

---

Open table formats give a directory of `.parquet` files a memory. [[delta-lake|Delta Lake]] does it with a flat transaction log. **Iceberg** takes a different path. It gives each version of the table its own page in a book, bound together by a tree of pointers you can walk without ever reading the whole shelf. You start at the root and follow the arrows down.

---

Let me show you the problem **Iceberg** was built to solve. You have a table with a decade of sales data, millions of `.parquet` files spread across **S3**. A query comes in: "last month, region West, product category shoes." With a flat commit log, your engine needs to list the metadata directory, find the latest checkpoint, then walk forward through `.json` files to build a snapshot. It works. But the initial listing gets slower as commits accumulate. At Netflix scale, where tables routinely held tens of millions of files, just listing a directory to plan a query was taking longer than running the query itself.

**Iceberg** sidesteps this entirely. Instead of listing, it follows pointers. The metadata tree tells you exactly where to look, one pointer at a time, and every pointer narrows the search. You never ask "what files are in this directory?" You ask "what does this manifest say is relevant?"

![[assets/iceberg/architecture.excalidraw]]

This is an alternative to listing, not an optimization on top of it. Every step of the read path is a dereference, and every dereference carries enough metadata to skip the branches that do not matter.

> [!info] What directory listing cannot do
> When [[delta-lake|Delta Lake]] plans a read, it lists `_delta_log/` to find checkpoint files and recent `.json` commits. On **S3**, a `LIST` operation returns 1,000 objects at a time. A table with 100,000 commits needs 100 sequential `LIST` calls just to know which log files exist. **Iceberg** replaces that with a single `GET`: read `metadata.json`, read the manifest list it points to, read only the manifests your partition filter needs. O(1) planning regardless of table history.

---

## The Minds Behind It

Apache **Iceberg** started at **Netflix** around 2017. The team, led by **Ryan Blue** and **Dan Weeks**, was running some of the largest **Hive** tables in existence on **S3**. They kept hitting the same wall. **Hive** tracked partitions through directory names like `date=2024-01-01/`. When you changed a partition scheme, say from daily to hourly, you had to rewrite every file. When you queried, you had to list every partition directory. And when two writers touched the same partition at the same time, files disappeared without warning.

**Netflix** solved these problems internally and handed the project to the [Apache Software Foundation](https://www.apache.org/) in 2018. It became a top-level ASF project in May 2020. The name came from the internal project codename. At first the team called it "Iceberg" as a play on the iceberg principle: most of the data is below the surface, only the tip is visible. The manifest tree structure, with its widening fan-out from metadata to data files, ended up looking the part too.

**Ryan Blue** later co-founded [Tabular](https://tabular.io/) in 2021 to build a managed **Iceberg** service. In 2024, [Confluent](https://www.confluent.io/) acquired **Tabular**, bringing **Iceberg** expertise into the **Kafka** ecosystem. This matters for the same reason **Delta**'s open-sourcing mattered: a table format governed by a vendor-neutral foundation is infrastructure, not a platform feature.

Today, **Iceberg** lives under the [`apache/iceberg` GitHub organization](https://github.com/apache/iceberg) with hundreds of contributors. The spec is at version 3, with version 4 currently in development. The first version laid out how to manage analytic tables on immutable file formats like `.parquet` and `.orc`. Version 2 introduced row-level deletes: position delete files that mark specific rows in specific files, and equality delete files that mark rows by column value. Version 3 brought variant and geospatial types, nanosecond timestamps, default column values, and binary deletion vectors. It supports the same cross-engine read/write guarantees as **Delta**: **Spark**, **Flink**, **Trino**, **Presto**, [[duckdb|DuckDB]], **Snowflake**, **BigQuery**, **Athena**, and dozens more.[^1] Write with one engine, read with another. The format is the contract.

---

## The Three Layers

Every **Iceberg** table is three things stacked together:

- **Data:** `.parquet` (or `.orc`, `.avro`) files in a directory. Same as **Delta**. Plain, fully portable.
- **Metadata:** A tree of pointer files that describe which data files exist, what they contain, and how to find them without listing directories.
- **Catalog:** A registry that stores the location of the current `metadata.json` and performs the atomic swap that commits every transaction.

When you strip everything else away, **Iceberg** is a directory of `.parquet` files with a set of `.avro` and `.json` files next to it that form a tree. You start at the root and walk down. The rest is engineering on top of that idea.

### The Data Layer: `.parquet`, same as always

The files in an **Iceberg** table are plain `.parquet`. The files use standard `.parquet` encoding, nothing proprietary. (`.orc` and `.avro` are also supported, though `.parquet` is the most common.) If **Iceberg** disappeared tomorrow, every data file would still be readable by **Pandas**, [[duckdb|DuckDB]], or any `.parquet`-compatible tool.

What **Iceberg** adds is structure around the files. Partition values are not directory names. They are fields stored in the manifest files, one tuple per data file: `{ "order_date": "2024-06-15", "region": "west" }`. The files may live in partition directories as an organizational convention, but the directory path is not the source of truth. The manifest entry is.

This separation is what makes partition evolution possible. If you decide to switch from daily partitioning to hourly, you do not rewrite a single data file. You create a new partition spec, and new files adopt it. Old files keep their old partition values in the manifest. Queries use the partition spec that was active when each file was written. The table can have files partitioned under multiple schemes simultaneously, and the engine handles it transparently.

Schema evolution works on the same principle. Every column has a unique integer ID that is independent of its name and position. Renaming a column updates the name but preserves the ID. Reordering columns in the schema is a metadata change that never touches a data file. When a reader opens a file written under an older schema, it maps the file's field IDs to the current schema's column names. The data stays put. The schema adjusts around it.

> [!info] Your data stays portable
> Like **Delta**, **Iceberg** does not invent a new file format. The metadata files are `.avro` and `.json`, readable by any tool that understands the **Iceberg** spec. No proprietary binary format. No vendor wall around your data.

Per-file column statistics are stored in the manifest files, not in the `.parquet` footers. When a file is added to the table, the writer records the min, max, null count, record count, and nan count for every column. These stats live in the manifest so the engine can prune files without opening them. More on that in the read path.

### The Metadata Layer: "manifest tree"

Inside every **Iceberg** table directory, sitting next to the data files, is a metadata folder (defaulting to `metadata/`, configurable via `write.metadata.path`) containing `.avro` and `.json` files that form the metadata tree. This is where **Iceberg**'s design departs most clearly from **Delta**'s.

**Delta**'s metadata is a flat sequence: `.json` files numbered by commit version, replayable from checkpoint to tip. Readers list the directory, find the latest checkpoint, then walk forward. **Iceberg**'s metadata is a tree. Readers follow pointers instead of listing directories.

Here is the tree, from root to leaves. Each level carries just enough information to guide the next step down.

**`metadata.json`** is the root. It lives at a location the catalog knows, typically something like `s3://bucket/table/metadata/00001-abc.metadata.json`. This file stores the table schema (each column by name, type, and unique integer ID), the partition specs (all of them, current and historical), the snapshot log (a list of every committed snapshot with timestamp and summary), the current snapshot ID, and the table's configuration properties. It does not contain data file paths. It points to a snapshot, which points to a manifest list, which points down.

**A snapshot** captures what the table looked like at a specific moment. Each one carries a unique ID, a sequence number, a timestamp, an operation type (append, overwrite, delete), and a pointer to a manifest list file. Snapshots are immutable once committed. You can time-travel to any snapshot by asking the engine to use that snapshot ID instead of the current one. The snapshot log in `metadata.json` is your table's entire history, stored as a list of snapshot entries, each no bigger than a few hundred bytes.

**A manifest list** is a `.avro` file that lists manifest files. Each entry includes the manifest's path, its length, the number of data files it contains, the number of rows added and deleted, and, critically, a partition summary: the min and max values for each partition field across all files in that manifest. This is what makes partition pruning work in a single read.

**A manifest file** is a `.avro` file that lists individual data files. Each entry records the data file path, format, record count, file size, partition values, and per-column statistics (lower bound, upper bound, null count, nan count for floats). A manifest can hold entries for files from any partition. Rather than rewriting every manifest on every commit, the engine reuses manifests from the previous snapshot for partitions that did not change. If only 5 out of 100 partitions changed in a commit, the writer reuses the manifests for the unchanged 95 partitions and writes new manifests only for the 5 that changed.

**Data files** are `.parquet`, `.orc`, or `.avro`. The manifest entries say where they are and what they contain.

```json
{
  "table-uuid": "9c12d7e8-af23-4a5a-a2c8-55c59bd782aa",
  "location": "s3://my-bucket/sales/",
  "current-snapshot-id": 42,
  "schemas": [
    {
      "schema-id": 0,
      "type": "struct",
      "fields": [
        { "id": 1, "name": "order_id", "required": true, "type": "long" },
        { "id": 2, "name": "amount", "required": false, "type": "double" },
        { "id": 3, "name": "order_date", "required": false, "type": "date" }
      ]
    }
  ],
  "partition-specs": [
    {
      "spec-id": 0,
      "fields": [
        { "source-id": 3, "field-id": 1000, "name": "order_date_month", "transform": "month" }
      ]
    }
  ],
  "snapshots": [
    {
      "snapshot-id": 42,
      "parent-snapshot-id": 41,
      "sequence-number": 42,
      "timestamp-ms": 1720000005000,
      "manifest-list": "s3://my-bucket/sales/metadata/snap-42.avro",
      "summary": { "operation": "append", "added-files": "3", "added-records": "1500" }
    }
  ]
}
```

This is a `metadata.json` at version 42. The schema says the table has three columns, each with a unique ID. The partition spec says data is partitioned by month of `order_date`. The snapshot points to a manifest list file. That is all the root stores. The manifest list, the manifests, and the data files are separate objects on the object store, connected by pointers.

> [!info] Why a tree instead of a log?
> **Delta**'s flat commit log is elegant. A directory of `.json` files, one per operation, new files appended at the end. It works well until the directory gets large. **Iceberg**'s tree structure costs more per write (multiple `.avro` files must be created) but pays off on every read. With a manifest list and manifest files, the engine knows which files to read without ever listing what is available. For analytical tables with thousands of partitions, millions of files, and years of history, that tradeoff tilts heavily toward the reads.

### The Catalog Layer

**Delta**'s catalog maps a table name to a directory path. The transaction log at that path is the source of truth. The catalog is a convenience.

**Iceberg**'s catalog is smaller in scope but more active in function. Its core responsibility is storing the location of the current `metadata.json` file. When a reader opens a table, it asks the catalog for that location, reads the file, and follows the pointers down. The catalog does not store the schema, the partitions, or the snapshot log. Those live in `metadata.json`.

But the catalog does something **Delta**'s catalog does not: it commits transactions. Every write to an **Iceberg** table ends with the writer asking the catalog to point to a new metadata file instead of the old one, and to make that change atomically. This is the commit. The file is never renamed into place; the pointer swap is the operation. The catalog performs a compare-and-swap: if the current pointer is what the writer expected, it updates to the new pointer and the commit succeeds. If another writer swapped it first, the compare fails and the writer retries.

The catalog is the linearization point for all writes. It is the one place where concurrent operations meet and serialize themselves. More on this in the write path.

> [!info] The catalog as commit coordinator
> Different catalog implementations provide the atomic swap differently. The **Hive Metastore** uses database transactions. **AWS Glue** uses conditional updates. **Nessie** ([Project Nessie](https://projectnessie.org/)) versions the catalog itself, giving you a `git`-like branch/tag/commit model on top of **Iceberg** tables. **JDBC** catalogs use a row-level lock or optimistic locking on a metadata pointer table. The catalog API is the same regardless: `commit(old-metadata-location, new-metadata-location)` returns success or conflict.
>
> Independently of the catalog, **Iceberg** supports named branches and tags on snapshots. A branch is a mutable reference that moves with new commits, like `main`. A tag is an immutable reference to a specific snapshot, like `audit-2024-q4`. Both let you run queries against a point-in-time or evolving view of the table without managing snapshot IDs manually.

---

## The Read Path

Let us trace a read from the query down to the bytes. You run:

```sql
SELECT * FROM lake.orders WHERE order_date = '2024-06-15' AND amount > 100
```

![[assets/iceberg/read-path.excalidraw]]

The engine asks the catalog for the current metadata location. The catalog returns `s3://bucket/orders/metadata/00042-abc.metadata.json`. The engine reads that file. It finds the current snapshot ID is 42 and the snapshot points to `s3://bucket/orders/metadata/snap-42.avro`, a manifest list.

The engine reads the manifest list. This is a single `.avro` file containing entries for every manifest in the snapshot. For a large table, there might be hundreds of manifest entries, but each entry is small: a path, a partition summary, a few counters. The engine checks the partition summaries against the query filters. The query asks for `order_date = '2024-06-15'` and `amount > 100`. The engine scans the partition summary of each manifest entry. Most do not overlap. Those manifests are skipped entirely. Their paths are never opened.

For the few manifests whose partition summaries overlap the query, the engine reads the manifest files. Each manifest file lists individual data files with full column statistics. The engine checks file-level stats: a file with `amount` stats showing `min: 5, max: 50` gets skipped if the query filters `amount > 100`. A file with `order_date` min and max both outside `2024-06-15` gets skipped. This is file-level pruning, and it costs only the `.avro` reads for the surviving manifest entries. Finally, the engine reads the remaining `.parquet` files and returns the rows.

The entire read path is pointer dereferences. At no point does the engine ask "what is in this directory?" It asks only "what does this metadata file say is here?" The catalog points to the root. The root points to the snapshot. The snapshot points to the manifest list. The manifest list points to manifests. The manifests point to data files. Every arrow narrows the search. By the time the engine touches `.parquet`, it is reading exactly the files that matter.

> [!info] Snapshot isolation
> Like **Delta**, **Iceberg** guarantees snapshot isolation. Even if a writer commits a new snapshot while a reader is mid-query, the reader stays pinned to the version it opened with. No lock is acquired. No write is blocked. The reader simply follows the pointer it grabbed at the start, which points to a frozen moment in the table's history.

---

## The Write Path

Writes follow a similar tree-building pattern but end with an atomic swap. Let us trace an `INSERT`. You run:

```sql
INSERT INTO lake.orders VALUES (...)
```

![[assets/iceberg/write-path.excalidraw]]

The engine asks the catalog for the current metadata location, reads `metadata.json`, and builds the current snapshot (say version 42). It now writes new `.parquet` files to the table directory, inside the appropriate partition subdirectories. These files go to disk with no coordination.

Next, the engine constructs new manifest files for the newly added data files. Each manifest entry records the file path, partition values, and per-column statistics. The engine then writes a new manifest list pointing to the new manifests plus any unchanged manifests from the previous snapshot that it reuses. Then it writes a new `metadata.json` with a new snapshot entry at version 43, pointing to the new manifest list.

Now the commit. The engine asks the catalog to atomically swap the metadata pointer from `metadata/00042-abc.metadata.json` to `metadata/00043-def.metadata.json`. This swap must be atomic. The catalog either makes the new pointer visible or does not.[^2]

If version 43 is still unclaimed, the pointer updates and the write succeeds. Every future reader who asks the catalog for the current metadata location gets the new file and follows it to the new snapshot. If another writer got there first, the pointer swap is rejected. The engine reads the new current snapshot (version 43, from the other writer), rewrites its manifests against the new base, and tries committing at version 44.

This is optimistic concurrency. A writer only finds out someone else got there first when the pointer swap is rejected. At that point it steps back rather than pushing through. The catalog's compare-and-swap is the only coordination point.

> [!warning] Manifest conflicts vs. file conflicts
> **Iceberg**'s conflict detection operates at the snapshot level by default. Two operations that both create a new snapshot from the same parent will conflict, though writers can select what to validate and some retry scenarios succeed when the underlying files do not overlap. Snapshot-level detection is simpler to reason about but can be more conservative with retries. In practice, this matters most for high-frequency streaming writes, where compaction and commit rate tuning become important.

`UPDATE` and `DELETE` do not modify data files in place. An `UPDATE` reads the current snapshot, identifies rows that match the predicate, writes new `.parquet` files with the modified rows, and writes delete files to mark the original rows as removed. The commit creates a new snapshot with the new data files, the delete files, and all unchanged files from the previous snapshot. Files are never modified in place. The old snapshot stays intact while the new one takes over as current.

The entire write path is a tree-building operation. New data files go on disk. New manifests point to them. A new manifest list points to the manifests. A new metadata file points to the manifest list. The catalog swaps the root pointer. That is the whole thing. The catalog is the commit. The pointers are the state.[^3]

---

## What It Unlocks

Most table formats treat partitioning as a physical layout decision. Your partition column becomes a directory name: `date=2024-01-01/`. If you want to change the scheme later, every file has to move. **Iceberg** decouples partitioning from file paths entirely. Partition values are fields in the manifest, not strings in a directory listing. The partition spec is metadata. The files stay wherever they were written.[^4]

This sounds like a small change. It is not. It means partitioning stops being a decision you have to get right on day one, with heavy consequences for getting it wrong. It becomes something the table grows into.

### Hidden Partitioning

You launch a product. The sales table gets a thousand rows a day. Partitioning by month makes sense. The data is small, the writes are sparse. Monthly partitions give you reasonable pruning and keep things tidy.

A year later the table ingests fifty million rows a day. Monthly partitioning means every query scans billions of rows even when you only need last Tuesday's revenue. You need hourly partitioning. With directory-based formats, this is a full table rewrite. Terabytes of `.parquet` reshuffled into new directories, a maintenance window, a backfill job, a lot of crossed fingers.

With **Iceberg**, the migration is a single DDL statement. You change the partition spec, and new files adopt the hourly transform. The old files keep their monthly partition values. They do not move. They do not get rewritten. Queries use whichever spec was active when each file was written. A filter on `order_date = '2024-06-15 14:00:00'` prunes by hour for new files and by month for old ones. Both specs coexist inside the same table, and the engine handles the difference transparently.

Scale is the obvious reason to evolve a partition scheme. But sometimes what needs fixing is a decision made years ago that no longer fits. Someone picked `region` as the partition column on launch day. It made sense at the time. West Coast, East Coast, a handful of regional dashboards. Three years later the business spans forty countries, and a quarter of your queries filter on `country`. `region` is not just useless. It is actively misleading. Files are scattered across partitions that bear no relationship to how anyone accesses the data.

In a directory-based format, fixing this means rewriting everything. Every `.parquet` file moves from one directory hierarchy to another. In **Iceberg**, you add a new partition spec that transforms `country` instead of `region`. Old files stay partitioned by region under the old spec. New files get partitioned by country under the new one. The engine derives partition filters from column predicates, not from directory names, so a query that says `WHERE country = 'Brazil'` automatically prunes files written under the new spec while ignoring the region-based partitions that cannot possibly match.

You do not need a backfill job. There is no window where the table is unavailable. You do not need to get partitioning right on the first try. The table adapts.

---

The manifest tree is a navigation system built on a simple idea. Instead of listing everything and deciding what matters, you follow pointers placed there by the last writer who knew exactly what mattered. Every read starts at the root and walks down. Every write builds a new set of pointers and swaps the root. The catalog holds one address. Everything else flows from there.

---

[^1]: [_Iceberg Table Spec_](https://github.com/apache/iceberg/blob/main/format/spec.md), apache/iceberg, GitHub. The authoritative specification for the Iceberg table format, documenting the full metadata hierarchy, schema evolution, partition transforms, and optimistic concurrency model.
[^2]: [_Iceberg Catalog Spec_](https://iceberg.apache.org/spec/#catalogs), Apache Iceberg. Documents the catalog interface including the atomic commit operation and the compare-and-swap semantics required from catalog implementations.
[^3]: [_Iceberg Table Spec: Optimistic Concurrency_](https://github.com/apache/iceberg/blob/main/format/spec.md#optimistic-concurrency), apache/iceberg, GitHub. Describes the snapshot-based optimistic concurrency model and the conditions under which writers may retry.
[^4]: [_Iceberg Table Spec: Partitioning_](https://github.com/apache/iceberg/blob/main/format/spec.md#partitioning), apache/iceberg, GitHub. Documents hidden partitioning, partition transforms, and partition spec evolution — the basis for changing partition schemes without rewriting data files.
