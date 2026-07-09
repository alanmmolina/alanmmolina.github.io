---
title: DuckLake
date: 2026-07-03
draft: false
tags:
  - notes
  - tools
  - open-table-formats
  - data-engineering
  - duckdb
  - ducklake
---

---

There is something quietly obvious about **DuckLake**, and it takes about thirty seconds to explain. Open table formats all add metadata on top of `.parquet` files, but every one of them eventually needs a database. [[iceberg|Iceberg]] needs one for its catalog to atomically swap the metadata pointer. [[delta-lake|Delta Lake]] leans on **Unity Catalog** or the **Hive** metastore for table discovery and governance. **Hudi** lives near one for the same reasons. Somewhere in every stack, a database sneaks back in to keep the books straight. **DuckLake** looks at that pattern and asks a very simple question: "if the database is already here, why is the metadata still living in files?"

---

## The Minds Behind It

**DuckLake** comes from the people behind [[duckdb|DuckDB]], specifically **[Hannes Mühleisen](https://hannes.muehleisen.org/)** and **[Mark Raasveldt](https://www.linkedin.com/in/mark-raasveldt-256b9a70/)** at **[DuckDB Labs](https://duckdblabs.com/)**. If you have followed [[duckdb|DuckDB]] at all, the move feels familiar. [[duckdb|DuckDB]] looked at the analytics landscape and asked why you needed a cluster to query a few gigabytes of data. **DuckLake** looks at lakehouse formats and asks why you need a maze of metadata files when a database does the same job with less ceremony.

**[Jordan Tigani](https://motherduck.com/)**, co-founder of **[MotherDuck](https://motherduck.com/)** and former engineering lead for **BigQuery** at **Google**, helped shape the philosophy and was among the first to deploy it in production. The **MotherDuck** connection matters. **DuckLake** needed more than a neat spec. It needed a path into real workloads, and **MotherDuck** provided one, giving the format its first production scars before v1.0 ever shipped.

The project began as an experiment in 2025. Version 0.1 shipped with a minimal set of catalog tables and the `ducklake` [[duckdb|DuckDB]] extension as its first implementation. Version 1.0 landed in April 2026 alongside [[duckdb|DuckDB]] v1.5.2, with a backward-compatibility promise: data written by a v1.x implementation stays readable by future v1.x implementations.[^1] The [specification](https://ducklake.select/docs/stable/specification/introduction) and the reference implementation are both released under the MIT license, governed by the [DuckDB Foundation](https://duckdb.org/foundation/).

The governance structure is worth noting. The foundation holds the intellectual property, with statutes designed to guarantee **DuckLake** remains open-source under MIT in perpetuity, even if **DuckDB Labs** is acquired. **DuckDB Labs**, a spin-off from **[CWI Amsterdam](https://www.cwi.nl/en/)**, does the engineering. [MotherDuck](https://motherduck.com/) provides the hosted cloud service. Research, engineering, IP stewardship, and commercial hosting are legally separated under different organizations. It is a deliberate choice, and it means no single company can close the format.

Current engine support is still growing. The [[duckdb|DuckDB]] extension is the reference implementation and the most complete one. **Apache DataFusion**, **Apache Spark**, **Trino**, and **Pandas** connectors exist, but the ecosystem is younger than what [[iceberg|Iceberg]] or [[delta-lake|Delta]] have built over years. If your lake already depends on **Spark**, **Trino**, and **Flink** all hitting the same tables, [[iceberg|Iceberg]] with a REST catalog is the more proven choice today. For new stacks and teams already building around [[duckdb|DuckDB]], **DuckLake** fits naturally.

---

## The Three Layers

Every **DuckLake** setup has three pieces:

- **Data:** `.parquet` files sitting on object storage. Same as every other format. Plain, portable, nothing proprietary.
- **Metadata:** SQL tables inside a database. Schemas, snapshots, file registrations, column statistics. All of it lives in rows, not files.
- **Catalog:** The database itself. There is no separate catalog service, no REST API, no additional process to run. The database that stores the metadata *is* the catalog.

When you strip everything else away, **DuckLake** is a database that knows which `.parquet` files belong to your table. The data stays open. The metadata lives where metadata belongs. This also means **DuckLake** replaces the entire lakehouse stack. It is both a table format and a catalog. Where other setups need [[iceberg|Iceberg]] plus a REST catalog like **Polaris**, or [[delta-lake|Delta]] plus **Unity Catalog**, **DuckLake** is both halves in one piece.

![[assets/ducklake/architecture.excalidraw]]

### The Data Layer: `.parquet`, same as always

The files **DuckLake** writes to storage are plain `.parquet`. There is no wrapper format, no custom encoding. If **DuckLake** disappeared tomorrow, every data file would still be readable by **Pandas**, [[duckdb|DuckDB]], or any `.parquet`-compatible tool. The files carry [[iceberg|Iceberg]]-compatible field identifiers in the `.parquet` `field_id` metadata, which means you can migrate from **DuckLake** to [[iceberg|Iceberg]] without rewriting a single data file.[^2]

Because only `.parquet` files ever touch the object store, **DuckLake** can encrypt every data file at rest. The encryption keys are managed by the catalog database. If your **S3** bucket is public, the files are still unreadable without catalog access. [[iceberg|Iceberg]] cannot make the same guarantee. Its metadata files, `.avro` and `.json` sitting next to the data, have no built-in encryption support. **DuckLake** gets zero-trust storage almost for free, because there is nothing on the object store except encrypted `.parquet`.

What **DuckLake** adds is structure around the files. The data path is configurable: local disk for development, **S3** for production, **R2**, **GCS**, **Azure Blob**, or a network filesystem. If [[duckdb|DuckDB]] can read the storage backend, **DuckLake** can write to it. When you create a table, you tell **DuckLake** where the `.parquet` files go:

```sql
ATTACH 'ducklake:postgres:dbname=my_catalog host=localhost' AS lake
    (DATA_PATH 's3://my-bucket/my-data/');
```

The `DATA_PATH` parameter points to the directory where `.parquet` files land. Every `INSERT`, every `UPDATE`, every `DELETE` writes new `.parquet` files to that location. Old files are never modified in place. They sit there until maintenance cleans them up. The catalog database tracks which files are current and which are obsolete.

Partition values are stored in the catalog, not in directory names. A file's partition membership is a set of rows in `ducklake_file_partition_value`, not a path convention like `date=2024-01-01/`. This means partition evolution works the same way it does in [[iceberg|Iceberg]]: change the partition scheme, and new files adopt it. Old files keep their old partition values. No data gets rewritten.

Per-file column statistics live in `ducklake_file_column_stats`: min, max, null count, and record count for every column in every file. When the engine plans a query, it reads these stats from the catalog database, not from `.parquet` footers and not from a manifest tree. One SQL query against indexed database tables replaces all the metadata IO that other formats do through file listings and `.avro` reads. More on that when we trace a read.

### The Metadata Layer: "the database"

This is where **DuckLake** departs from every other format. [[delta-lake|Delta]]'s metadata is a flat sequence of `.json` files in `_delta_log/`. [[iceberg|Iceberg]]'s metadata is a tree of `.avro` and `.json` files in `metadata/`. **DuckLake**'s metadata is a set of SQL tables inside a database. No `.json` files. No `.avro` manifests. No checkpoint `.parquet` files. Just rows.

The core tables are straightforward and few. `ducklake_data_file` stores one row per `.parquet` file: its path, record count, size, format, and the snapshot range during which it is active. `ducklake_snapshot` stores one row per commit: snapshot ID, timestamp, schema version, and a summary of what changed. `ducklake_file_column_stats` stores per-column min, max, null count, and record count for every file. `ducklake_column` stores the table schema with field identifiers that survive renames and type changes. `ducklake_table` stores the table name, schema reference, and configuration. Around twenty tables total cover the full catalog. A handful of fundamental tables hold snapshots, schemas, and data file mappings. Another set tracks table and column statistics for query planning. Tables for partitioning, sorting, macros, views, and tags round out the rest. The full specification is available on the **DuckLake** site, but the important thing is not the count. It is that every one of them is a plain SQL table you can query directly.

Here is what a commit looks like under the hood. Someone creates a table and inserts a couple of rows:

```sql
BEGIN TRANSACTION;
    INSERT INTO ducklake_data_file
    VALUES (0, 1, 2, NULL, NULL, 'data_files/ducklake-a1b2.parquet', 'parquet', 2, 279, 164, 0, NULL, NULL);

    INSERT INTO ducklake_file_column_stats
    VALUES (0, 1, 1, NULL, 2, 0, 56, '42', '43', NULL);

    INSERT INTO ducklake_snapshot
    VALUES (2, now(), 1, 1, 2, 1);

    INSERT INTO ducklake_snapshot_changes
    VALUES (2, 'inserted_into_table:1');
COMMIT;
```

That is the whole thing. Four `INSERT`s inside a transaction. The `.parquet` file was written to storage before this transaction started. The transaction records what happened and where the file lives. No matter how many rows were inserted, two or two million, the catalog transaction has the same low cost. The heavy part is writing the `.parquet` file. The metadata part is a handful of database rows.

A snapshot is a row in a table with a primary key. There is no file to write, no directory to scan. **DuckLake** can support millions of snapshots without the overhead that other formats hit when their log directories grow large. No pressure to aggressively expire old snapshots. The database handles the scale.

Partial files make this possible. In other formats, every snapshot needs at least one new data file. With streaming workloads producing thousands of snapshots, that means thousands of tiny files. **DuckLake** lets a single `.parquet` file serve multiple snapshots by tracking which row ranges belong to which snapshot in the catalog. One file can carry rows from ten thousand different commits. The catalog records the offsets, and queries filter by snapshot range. It is the difference between "every snapshot costs a file" and "every snapshot costs a row."

> [!info] Field identifiers
> Like [[iceberg|Iceberg]], **DuckLake** assigns a unique integer ID to every column. The ID is stored in `ducklake_column.column_id` and written into the `.parquet` file's `field_id` metadata. When you rename a column, the name changes in the catalog but the ID stays the same. When you add a column, old files return NULL for the new column because their `.parquet` files lack the field ID. When a reader opens files written under different schema versions, it maps field IDs to the current schema's column names and casts types where needed. The data stays put. The schema adjusts around it.

Schema evolution follows naturally from this design. Adding a column inserts a row into `ducklake_column` with a new field ID. Dropping a column marks it inactive. Renaming updates the name field. Type promotion, like widening an `INTEGER` to a `BIGINT`, updates the type and the engine casts values on read. None of this touches a single `.parquet` file. The catalog absorbs the change, and the next reader sees the new schema.

### The Catalog Layer: "the database, as well"

The catalog is the database. There is no separate catalog service to install, no REST API to configure, no additional process to monitor. The database that stores the metadata tables *is* the catalog, and its transaction system *is* the coordination layer. Any SQL database that supports ACID transactions and primary keys can do the job.

**DuckLake** supports three catalog backends, each tuned for a different scale of operation.[^3]

**DuckDB** for local, single-client work. Install the `ducklake` extension and attach to a `.ducklake` file. The catalog lives in a local database file next to your `.parquet` data. One person, one machine, zero infrastructure. This is the development and prototyping setup.

**SQLite** for local multi-process work. The catalog runs in a **SQLite** file, and the **DuckLake** extension attaches and detaches for every query, retrying around write locks. It is enough for a few processes on the same machine sharing a lake, without the overhead of running a database server.

**PostgreSQL** for multi-user production. Install the `postgres` extension alongside `ducklake`, point the connection string at a **PostgreSQL** instance, and every client that attaches to the same database shares the same lake with full ACID guarantees. **PostgreSQL** handles the concurrent transactions, the locking, the isolation. **DuckLake** gets multi-writer coordination for free because PostgreSQL already solved it.

```sql
INSTALL ducklake;
INSTALL postgres;

ATTACH 'ducklake:postgres:dbname=ducklake_catalog host=localhost' AS lake
    (DATA_PATH 's3://my-bucket/my-data/');
```

The catalog backend is just a connection string. Switch from [[duckdb|DuckDB]] to **PostgreSQL** by changing the `ATTACH` statement. The data files stay where they are. The metadata tables get created in the new database. There is no lock-in to a particular catalog backend because the schema is simple, standardized SQL that any ACID-compliant database can host.

> [!info] The catalog is inspectable
> Because the metadata lives in plain SQL tables, you can audit your lake with a `SELECT` statement. Want to know which `.parquet` files belong to a table? Query `ducklake_data_file`. Want the snapshot history? Query `ducklake_snapshot`. Want to see column statistics across all files? Query `ducklake_file_column_stats`. The lake is a database you can query directly.

---

## The Read Path

Let us trace a read from the query down to the bytes. You run:

```sql
SELECT * FROM lake.orders WHERE order_date = '2024-06-15' AND amount > 100;
```

![[assets/ducklake/read-path.excalidraw]]

The engine sends a single query to the catalog database. That query joins `ducklake_table` to `ducklake_data_file` to `ducklake_file_column_stats` to `ducklake_file_partition_value`, filters on the partition column and the column statistics, and returns a list of file paths. The catalog database uses its own query planner, its own indexes, and its own statistics to answer this efficiently. One SQL query replaces every round trip to storage, every directory listing, every checkpoint replay, and every manifest traversal.

The partition filter on `order_date = '2024-06-15'` prunes files whose partition values do not match. The column statistics filter on `amount > 100` prunes files whose `amount` max is below 100. A file with `amount` stats showing `min: 5, max: 50` gets skipped without its path ever being opened. A file whose partition value is `2024-06-14` gets skipped the same way. The pruning happens inside the database, where the cost of filtering indexed rows is negligible.

The engine receives a list of file paths. It reads only those `.parquet` files from object storage. The catalog did the planning, the storage provided the bytes. The reader sees a snapshot-isolated view of the table because the catalog query was pinned to a specific snapshot ID at the start.

> [!info] Snapshot isolation
> When a reader begins a query, the engine captures the current snapshot ID from the catalog. Every subsequent read against the catalog uses that snapshot ID. If a writer commits a new snapshot while the reader is mid-query, the reader does not see it. The next query starts fresh and picks up the new snapshot. This is the same snapshot isolation guarantee that [[delta-lake|Delta Lake]] and [[iceberg|Iceberg]] provide, implemented through the catalog database's own transaction consistency rather than through file versioning.

---

## The Write Path

Writes follow a pattern you will recognize from other lakehouse formats. The data goes to storage first. The metadata commit happens second. The difference is where the commit lives. Let us trace an `INSERT`. You run:

```sql
INSERT INTO lake.orders VALUES (...)
```

![[assets/ducklake/write-path.excalidraw]]

The engine writes new `.parquet` files to the data path. These files go to storage with no coordination. No lock is held. No other writer knows they exist yet. This is the optimistic phase, the same pattern [[delta-lake|Delta Lake]] and [[iceberg|Iceberg]] use: write first, claim later.

Now comes the commit. The engine opens a SQL transaction on the catalog database. It inserts a row into `ducklake_data_file` for the new `.parquet` file, recording its path, record count, and size. It inserts rows into `ducklake_file_column_stats` for every column in the file, recording min, max, and null counts. It inserts a row into `ducklake_snapshot` with a new snapshot ID, one higher than the current latest. It inserts a row into `ducklake_snapshot_changes` describing what happened. Then it commits the transaction.

The database handles the rest. If no other writer claimed that snapshot ID, the transaction commits and the new snapshot becomes visible to every future reader. If another writer got there first, the INSERT into `ducklake_snapshot` hits a primary key conflict. The transaction rolls back. The engine catches the conflict, reads the new current snapshot (which now includes the other writer's changes), rewrites its files if needed, and tries again at the next snapshot ID.

This is optimistic concurrency control running on the catalog database's own transaction system.[^4] **DuckLake** does not implement its own conflict detection. It does not need a LogStore API to handle atomic commits differently for **S3**, **HDFS**, and **ADLS**. It does not need a **DynamoDB** lock table. **PostgreSQL**, **SQLite**, and [[duckdb|DuckDB]] have already solved atomic commits, primary key enforcement, and transaction isolation. **DuckLake** leans on that work entirely.

> [!warning] Snapshot-level conflicts
> **DuckLake**'s conflict detection operates at the snapshot level. Two concurrent operations that both try to create the same next snapshot ID will conflict, and one will retry. This is simpler than [[delta-lake|Delta]]'s file-level conflict detection but can be more conservative with retries when writers touch different parts of the same table. In practice, the catalog database commits transactions in microseconds, not the milliseconds or seconds that object storage renames can take, so the conflict window is much smaller than it is for file-based formats. **DuckLake** metadata transactions complete in roughly 30 milliseconds. An [[iceberg|Iceberg]] commit, which must write new metadata files and update the catalog pointer, takes a minimum of about 300 milliseconds. That order-of-magnitude difference means **DuckLake** can sustain far more concurrent writers before conflicts become a problem.[^5]

`UPDATE` and `DELETE` follow the same pattern but with file rewriting. An `UPDATE` reads the current snapshot, identifies which data files contain rows that match the predicate, reads those files from storage, writes new `.parquet` files with the modified rows, and commits a transaction that records the new files and marks the old files as removed (by setting their `removed_snapshot_id`). Files are never modified in place. The old snapshot stays intact while the new one takes over as current.

After the `INSERT` above, the table has a new snapshot. You can see it:

```sql
FROM lake.snapshots();
```

The result shows snapshot 3 with its timestamp and a changeset summary. The history is a `SELECT` away. The files are a `SELECT` away. The column statistics are a `SELECT` away. Everything that happened to this table is stored in rows you can query directly.

---

## What It Unlocks

Two patterns fall out of the catalog design that no other format can match. Both start from the same observation: when metadata lives in a database, you can do things with it that file-based formats cannot.

### Data Inlining

Streaming pipelines are where file-based lake formats start to hurt. Every small insert creates a new `.parquet` file plus metadata files, and those pile up fast. Compaction helps later, but it does not remove the write-time cost.

When a write falls below a configurable row threshold, **DuckLake** skips the `.parquet` file entirely and stores the rows in catalog tables:

```sql
ATTACH 'ducklake:sensors.ducklake' AS lake (DATA_PATH 's3://my-bucket/sensors/');

CREATE TABLE lake.readings (sensor_id INTEGER, temperature DOUBLE, ts TIMESTAMP);

-- None of these inserts create any files on object storage
INSERT INTO lake.readings VALUES (1, 21.5, now());
INSERT INTO lake.readings VALUES (2, 22.1, now());
INSERT INTO lake.readings VALUES (1, 21.8, now());

FROM ducklake_list_files('lake', 'readings'); -- returns empty

-- Flush everything to a single `.parquet` file when ready
CHECKPOINT;
```

In **Pedro Holanda**'s data inlining benchmark, a sensor workload writing 100 rows per second in small batches ran aggregations roughly 926 times faster with inlining enabled. The query hit **PostgreSQL** instead of opening 30,000 tiny **S3** files. The gap is large, but the reason is straightforward: databases handle small reads and writes efficiently. Object stores are built for larger, sequential access.[^6]

`CHECKPOINT` flushes the inlined rows into `.parquet` when the batch is worth writing. Time travel still works because inlined rows carry snapshot columns just like `.parquet`-backed rows do. The data is first-class. It just happens to live in a database until you decide otherwise.

### Frozen **DuckLake**s

Frozen **DuckLake**s take the local [[duckdb|DuckDB]] catalog and turn it inside out. You build the catalog with `ducklake_add_data_files()`, which reads only `.parquet` footers, not the row data. Then you publish the `.ducklake` file next to the `.parquet` files on object storage. Readers open it by URL. No catalog server runs anywhere.

```sql
ATTACH 'ducklake:https://my-bucket.s3.amazonaws.com/archive.ducklake' AS archive;
USE archive;
SELECT * FROM events WHERE ts > '2025-01-01';
```

In **Mark Harrison**'s Frozen **DuckLake**s post, a team at **[Madhive](https://www.madhive.com/)** used this pattern for a production archive.[^7] After publishing to **S3**, any [[duckdb|DuckDB]] client could query the dataset without a running catalog service.

For read-only datasets, the publishing story is simple: publish the `.parquet` files and the catalog file together. The catalog is tiny relative to the data because it stores only file paths and statistics, not the rows themselves.

---

**DuckLake** looks at the lakehouse stack and removes a layer everyone had learned to live with. If metadata coordination keeps acting like a database problem, putting it in a database starts to look like the obvious choice.

---

[^1]: [_**DuckLake** v1.0_](https://ducklake.select/2026/04/13/ducklake-10/), **DuckLake** Blog, April 2026. The v1.0 release announcement with backward-compatibility guarantees.
[^2]: [_**DuckLake** Manifesto_](https://ducklake.select/manifesto/), Mark Raasveldt and Hannes Mühleisen. The foundational design argument explaining why metadata belongs in a SQL database, with the core INSERT transaction example.
[^3]: [_Choosing a Catalog Database_](https://ducklake.select/docs/stable/duckdb/usage/choosing_a_catalog_database), **DuckLake** Documentation. Covers DuckDB, SQLite, and PostgreSQL catalog backends with setup examples.
[^4]: [_**DuckLake** FAQ_](https://ducklake.select/faq), **DuckLake** Documentation. Covers architecture, production readiness, licensing, and the small files problem.
[^5]: Martin, Matt and Monahan, Alex. [_**DuckLake**: The Definitive Guide_](https://www.oreilly.com/), O'Reilly Media, Early Release 2026. Covers **DuckLake**'s architecture, deployment patterns, and query processing pipeline in depth. The 30ms vs 300ms commit comparison comes from this book.
[^6]: Holanda, Pedro. [_Data Inlining in **DuckLake**_](https://ducklake.select/2026/04/02/data-inlining-in-ducklake/), **DuckLake** Blog, April 2026. The authoritative deep-dive on data inlining with benchmark methodology and results (926x aggregation speedup vs Iceberg).
[^7]: Harrison, Mark. [_Frozen **DuckLake**s for Multi-User, Serverless Data Access_](https://ducklake.select/2025/10/24/frozen-ducklake/), **DuckLake** Blog, October 2025. Describes the Frozen **DuckLake** pattern with a production case study from Madhive.
