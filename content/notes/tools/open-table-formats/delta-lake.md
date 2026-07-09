---
title: Delta Lake
date: 2026-07-01
draft: false
tags:
  - notes
  - tools
  - open-table-formats
  - data-engineering
  - delta-lake
---

---

**Delta Lake** wraps your `.parquet` directory in `_delta_log/`, a flat sequence of `.json` files, one per commit: a ledger that records every change the table has ever seen. Replay it and you have a snapshot at any point in time. Time travel, schema enforcement, and safe concurrent writes all fall out of that one idea.

---

## The Minds Behind It

**Delta Lake** came out of **Databricks** around 2017. The team, led by **Michael Armbrust**, had been building **Spark** workloads on cloud object stores for years. They kept running into the same class of problems: **S3** and **ADLS** give you cheap, durable storage, but they don't give you transactions. The [original paper](https://www.vldb.org/pvldb/vol13/p3411-armbrust.pdf), published at the [VLDB conference](https://www.vldb.org/) in 2020, frames it plainly: cloud object stores are great at storing blobs, terrible at being databases.[^1] **Delta Lake** is the translation layer.

In 2019, **Databricks** open-sourced the project through the [Linux Foundation](https://www.linuxfoundation.org/). This matters. A table format that lives inside a single vendor's platform is a feature. A table format governed by an open community with an [Apache 2.0 license](https://www.apache.org/licenses/LICENSE-2.0) is infrastructure.

Today, **Delta Lake** lives under the [`delta-io` GitHub organization](https://github.com/delta-io/delta) with over 190 contributors from more than 70 organizations, including **Adobe**, **Amazon**, **Apple**, **Microsoft**, and others who have no interest in letting one company own the format their data lives in. The project is currently at version 4.3.0 and supports query engines across the board: **Spark**, **Trino**, **Presto**, **Flink**, [[duckdb|DuckDB]], **Snowflake**, **BigQuery**, **Athena**, **Redshift**. You can write with one engine and read with another. The format is the contract.

---

## The Three Layers

Every **Delta** table is three things sitting on top of each other:

- **Data:** `.parquet` files in a directory. This is the raw storage. The bytes.
- **Metadata:** A transaction log in `_delta_log/`. This is the ledger. Every change to the table, adding files, removing files, altering the schema, is an entry in this log.
- **Catalog:** A registry that maps a table name like `lake.orders` to a path like `s3://my-bucket/orders/`. The catalog tells you where to look. The log tells you what you'll find there.

When you strip everything else away, **Delta Lake** is a directory of `.parquet` files with a directory of `.json` files next to it that say which `.parquet` files matter and which ones don't. The rest is engineering on top of that idea.

![[assets/delta-lake/architecture.excalidraw]]

### The Data Layer: just `.parquet` (mostly)

The files in a **Delta** table directory are plain `.parquet`. There is no wrapper format, no custom encoding. If **Delta Lake** disappeared tomorrow, you could still read every data file with any `.parquet` reader. The vocabulary column holds strings. The quantity column holds integers. Nothing about the file itself says "I belong to a **Delta** table."

> [!info] Your data stays portable
> This is worth underlining: **Delta Lake** does not invent a new file format. The data files are standard `.parquet`, readable by **Pandas**, [[duckdb|DuckDB]], or any other `.parquet`-compatible tool. The Delta-specific part is the `_delta_log/` directory sitting next to them. That separation means your data is never locked into a proprietary format.

What **Delta Lake** adds is structure around the files. The directory layout follows partition conventions: `date=2024-01-01/part-0000.parquet`, `date=2024-01-02/part-0000.parquet`, and so on. This is a convention, not a requirement of the protocol, but it makes listing and pruning fast. There is also a `_change_data/` directory for **Change Data Feed** files, optional, separate from the main data, used by streaming readers that need to know exactly which rows changed.

Deletion vectors are another piece that lives at the data layer without changing the data files themselves. Instead of rewriting a 5 GB file to remove three rows, **Delta Lake** can write a tiny binary file that marks those three rows as "gone." The data file stays. The deletion vector says which parts to skip. It's a performance trick, not a format change, but it means the data layer sometimes has more than just `.parquet`. Per-file column statistics are stored in the transaction log, not in the `.parquet` files themselves. When you add a file to the table, **Delta Lake** records the min, max, and null count for every column in that file. This is what makes partition pruning work without opening a single file. More on that when we trace a read.

### The Metadata Layer: "transaction log"

Inside every **Delta** table directory, there is a `_delta_log/` subdirectory. It contains `.json` files, one per commit, named with zero-padded version numbers:

```
_delta_log/00000000000000000000.json
_delta_log/00000000000000000001.json
_delta_log/00000000000000000002.json
```

Each file is newline-delimited JSON. Each line is an action. The [protocol](https://github.com/delta-io/delta/blob/master/PROTOCOL.md) defines five core action types:[^2]

- `add`: "this file is now part of the table." Includes the file path, size, modification time, partition values, and column statistics.
- `remove`: "this file is no longer part of the table." Includes a deletion timestamp and optionally the same metadata as add, so readers can skip tombstoned files.
- `metaData`: "the table's schema, partitioning, and configuration." The first commit must contain one. Subsequent commits can overwrite it entirely.
- `protocol`: "the minimum reader and writer versions required to work with this table." Bumped when the protocol adds features that older clients can't handle.
- `txn`: "an application-level marker." Used by streaming systems to record progress and make writes idempotent.

Here is a taste of what a commit looks like. Someone created a table and inserted a few rows:

```json
{
  "metaData": {
    "id": "af23c9d7-fff1-4a5a-a2c8-55c59bd782aa",
    "format": { "provider": "parquet", "options": {} },
    "schemaString": {
      "type": "struct",
      "fields": [
        { "name": "id", "type": "integer", "nullable": true },
        { "name": "name", "type": "string", "nullable": true }
      ]
    },
    "partitionColumns": [],
    "configuration": {},
    "createdTime": 1720000000000
  }
}
{
  "protocol": {
    "minReaderVersion": 1,
    "minWriterVersion": 2
  }
}
{
  "add": {
    "path": "part-00000-abc.c000.snappy.parquet",
    "partitionValues": {},
    "size": 4523,
    "modificationTime": 1720000000000,
    "dataChange": true,
    "stats": {
      "numRecords": 100,
      "minValues": { "id": 1, "name": "Alice" },
      "maxValues": { "id": 100, "name": "Zoe" }
    }
  }
}
```

Version 0 of the table. The first line declares who this table is and what it looks like. The second line sets the protocol bar. The third line says "here is a file, it has 100 rows, ids range from 1 to 100."

Now version 1. Someone ran a DELETE:

```json
{
  "remove": {
    "path": "part-00000-abc.c000.snappy.parquet",
    "deletionTimestamp": 1720000003600,
    "dataChange": true
  }
}
{
  "add": {
    "path": "part-00000-def.c000.snappy.parquet",
    "partitionValues": {},
    "size": 4200,
    "modificationTime": 1720000003600,
    "dataChange": true,
    "stats": {
      "numRecords": 99,
      "minValues": { "id": 1, "name": "Alice" },
      "maxValues": { "id": 100, "name": "Zoe" }
    }
  }
}
```

The old file is gone. A new file with 99 rows replaces it. That's how `UPDATE` and `DELETE` work under the hood: read the file, rewrite it without the unwanted rows, commit a remove for the old one and an add for the new one. No file is modified in place. No partial state ever exists.

Over time, the log grows. A table with thousands of commits would require readers to replay thousands of `.json` files just to figure out which files exist. That's where checkpoints come in. A checkpoint is a `.parquet` file, `00000000000000000042.checkpoint.parquet`, that contains the complete, reconciled state of the table up to version 42. Reconciliation means all the adds and removes have been resolved. If version 10 added a file and version 15 removed it, the checkpoint at version 42 does not mention that file at all. It only shows the final answer.

Checkpoints let readers skip the early log entirely. A reader finds the latest checkpoint, loads it (a single `.parquet` read), then replays only the `.json` commits after that version. The `_last_checkpoint` file in `_delta_log/` is a shortcut. It points to the most recent checkpoint version so readers don't have to list the entire directory.

This is **MVCC** taken to its logical conclusion. Every version is a point-in-time snapshot of the table. A reader that starts at version 50 sees version 50, even if version 51 commits while the reader is still running. The reader does not lock anything. It does not block writers. It just replays the log up to the version it started with and ignores everything after. That is snapshot isolation.

> [!info] Why readers don't block
> Snapshot isolation is what makes reads cheap. You never wait for a write to finish. You never hold a lock. You just pick a version number, replay the log to that point, and read. Writes happening in parallel are invisible to you until the next query starts fresh.

### The Catalog Layer

So far we have assumed you already know where your table lives. But how does `spark.read.table("lake.orders")` turn into `s3://my-bucket/orders/`? That's the catalog. In most setups, it's the **Hive** metastore, a small database that maps table names to paths and stores a cached copy of the schema for quick lookup. Spark's default catalog is the **Hive** metastore. **Databricks** uses **Unity Catalog**. **AWS Glue**, **Polaris**, and others do the same job.

The catalog is not the source of truth for your table's state. It stores the table location. Everything else, the actual schema, the list of partitions, the table properties, lives in the transaction log at that location. If someone runs `ALTER TABLE ADD COLUMN`, the change goes into the next commit in `_delta_log/`, and the catalog may or may not get updated. The next reader looks at the log, sees the new schema, and adapts.

> [!info] The catalog evolves
> Catalog-managed tables, [introduced in **Delta 4.0**](https://docs.delta.io/latest/delta-catalog-managed-tables.html), flip part of this dynamic.[^6] Instead of the file system being the authority on which commits exist, the catalog itself coordinates and ratifies commits. This lets the catalog enforce policies (who can write, which branches are valid) and enables cross-engine consistency where multiple compute engines share the same authoritative source of commit truth. For most tables today, the simpler model still applies: the log is self-contained, and the catalog just points.

---

## The Read Path

Let's trace a read from the query down to the bytes. You run:

```sql
SELECT * FROM lake.orders WHERE order_date = '2024-06-15' AND amount > 100
```

![[assets/delta-lake/read-path.excalidraw]]

First, the engine asks the catalog: "where does `lake.orders` live?" The catalog returns `s3://my-bucket/orders/`. The engine now knows which directory to inspect. It reads `s3://my-bucket/orders/_delta_log/_last_checkpoint`. The file says the latest checkpoint is at version 142. It opens `00000000000000000142.checkpoint.parquet`, a `.parquet` file containing the reconciled table state. This gives it the complete set of files (adds and removes resolved), the table schema, the partition columns, and the configuration, all the way up to version 142.

Then it lists the `_delta_log/` directory for commit files numbered 143 and above. It finds `00000000000000000143.json` and `00000000000000000144.json`. It reads them, line by line, applying adds and removes to the checkpoint's state. After processing those two commits, it has the current snapshot: version 144. The snapshot is a list of data file paths, each with partition values and column statistics attached.

Next, the engine prunes. The query filters on `order_date = '2024-06-15'`, and the partition column is `order_date`. The engine looks at the partition values recorded for each file in the snapshot. Files in `order_date=2024-06-15/` are relevant. Files in `order_date=2024-06-14/` are skipped. Their paths aren't even opened. Even within the relevant partition, the per-file statistics help. If the query also had a filter like `AND amount > 100`, and a file's `amount` column stats say `min: 5, max: 50`, that file gets skipped. No row in it can satisfy the predicate. This is file-level pruning, and it costs nothing beyond reading a few JSON fields from the log.

Finally, the engine reads the remaining `.parquet` files, applies any additional row-level filters, and returns the result. The reader never locks anything. A writer could be committing version 145 at the same moment, and the reader would not see it. Snapshot isolation means the reader's world is frozen at version 144.

> [!note] Soft deletes
> If the table uses deletion vectors, the reader also loads the relevant deletion vector files and applies them during the scan, skipping the soft-deleted rows without anyone having rewritten the data files.

---

## The Write Path

Writes follow the same pattern with one critical addition: the commit itself is a race. Let's trace an `INSERT`. You run:

```sql
INSERT INTO lake.orders VALUES (...)
```

![[assets/delta-lake/write-path.excalidraw]]

The engine follows the same read path to build the current snapshot (let's say version 144). But this time, it's not done. It now writes new `.parquet` files to the table directory, `part-00000-xyz.snappy.parquet`, inside the appropriate partition subdirectory. These files are optimistically written. No lock is held. No other writer knows they exist yet.

Now comes the commit. The engine constructs a new `.json` commit file containing an `add` action for each new file. It writes this file to `_delta_log/_staged_commits/00000000000000000145.<uuid>.json` and then attempts to make it visible by placing it at `_delta_log/00000000000000000145.json`. This is where the storage system earns its keep. The commit must be atomic. The file either appears in its entirety or does not appear at all.[^3]

> [!example] Atomic commits by storage
> How different storage systems provide atomic commits: **HDFS** and **ADLS Gen2** have native atomic renames, so the commit just renames a temp file into place. **S3** single-cluster relies on the fact that writing the same key from the same **Spark** driver is safe (no true mutual exclusion, but no competing writers). **S3** multi-cluster uses a **DynamoDB** table to lock the version number before the file lands. Each backend plugs in through **Delta**'s [LogStore API](https://github.com/delta-io/delta/blob/master/storage/src/main/java/io/delta/storage/LogStore.java).[^4]

If version 145 is still unclaimed when the engine attempts the commit, the file lands and the write succeeds. The engine just created a new atomic version of the table. Every future reader will see this data. If another writer claimed version 145 first, the engine's commit attempt fails. It detects the conflict (the version number is already taken) and raises a `ConcurrentAppendException`. The operation fails rather than silently corrupting the table. The engine can retry: read the new snapshot (which now includes the other writer's changes), re-write its files if needed, and try committing at version 146.

`UPDATE` and `DELETE` follow the same path but with more file rewriting. An `UPDATE` reads the current snapshot, identifies which data files contain rows that match the predicate, reads those files, writes new versions with the modified rows, and commits remove actions for the old files and add actions for the new ones. If those files changed between the read and the commit, another writer modified the same ones, a conflict is detected and the operation fails.

> [!warning] File-level conflicts
> Conflict detection works at the file level. Two operations that touch different files don't conflict, even if they modify the same logical partition. This is why partitioning by the columns you filter and update on reduces conflicts significantly. Two concurrent `MERGEs` filtering on different dates that live in different partition directories likely won't touch the same files.

The entire write path is optimistic. Writers assume they're the only ones changing things until proven otherwise. When proven otherwise, they step back rather than push through. It's not the only way to do concurrency, but it works without requiring a lock service for every table, and it's why **Delta Lake** can run on object stores that offer little more than "put this file here" and "list this directory."[^5]

---

The transaction log is a remarkably simple idea. A directory of `.json` files, one per operation, written atomically by whoever gets there first. Everything else, time travel, schema enforcement, snapshot isolation, the ability to list a table's entire history with a single directory listing, falls out of that. You could build it yourself with a bash script and an **S3** bucket, and a team at Databricks did, more or less, before they productized it, open-sourced it, and handed it to a foundation.

---

[^1]: Michael Armbrust et al., [_Delta Lake: High-Performance ACID Table Storage over Cloud Object Stores_](https://www.vldb.org/pvldb/vol13/p3411-armbrust.pdf), PVLDB Vol. 13, 2020.
[^2]: [_Delta Transaction Log Protocol_](https://github.com/delta-io/delta/blob/master/PROTOCOL.md), delta-io/delta, GitHub.
[^3]: [_Storage configuration_](https://docs.delta.io/latest/delta-storage.html), Delta Lake documentation. Covers the atomic visibility, mutual exclusion, and consistent listing guarantees required from storage systems.
[^4]: [_LogStore.java_](https://github.com/delta-io/delta/blob/master/storage/src/main/java/io/delta/storage/LogStore.java), delta-io/delta, GitHub.
[^5]: [_Concurrency control_](https://docs.delta.io/latest/concurrency-control.html), Delta Lake documentation. Describes the optimistic concurrency model and conflict exception types.
[^6]: [_Catalog-managed tables_](https://docs.delta.io/latest/delta-catalog-managed-tables.html), Delta Lake documentation.
