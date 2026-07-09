---
title: Open Table Formats
date: 2026-07-09
draft: false
tags:
  - notes
  - tools
  - data-engineering
  - open-table-formats
---

A directory of `.parquet` files is not a table. It's just files. Files don't know about each other. They don't know what changed, who changed it, or whether two writes stepped on each other's toes. They sit there, quiet, waiting for someone to sort out the mess.

It is the default experience of using files as tables. A pipeline writes bad data and there is no rollback, only "find the bad file and hope you can rebuild the state without it." An upstream system adds a column and downstream readers crash because no one checked whether the files agree on a schema. Two jobs write to the same partition at the same time and one silently overwrites the other. Careful scheduling and manual cleanup paper over these gaps, but careful is not a protocol.

What files alone cannot give you boils down to three things:

- **Memory:** no snapshots, no history, no way to ask "what did this table look like last Tuesday?"
- **Rules:** no schema enforcement across files, no guarantee that column `amount` is an integer in every file
- **Coordination:** no protection against concurrent writes corrupting each other

A table needs all three. A directory of files provides none.

Open table formats add a metadata layer on top of plain `.parquet` files that tracks what happened and when. The data stays portable, readable by any tool that understands `.parquet`. The metadata is what turns a pile of files into something you can reason about.

Every open table format follows the same blueprint, three layers stacked together. The data layer is plain `.parquet` files, portable by design. The metadata layer tracks what happened and when: snapshots, schemas, which files belong to the table. The catalog layer answers "where is the table?" and coordinates who can write to it.

![[assets/architecture.excalidraw]]
