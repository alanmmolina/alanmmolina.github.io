---
title: DuckDB
date: 2025-03-01
draft: false
tags:
  - notes
  - tools
  - data-engineering
  - databases
  - duckdb
---
---

An analytical database that just works is rarer than it should be. **DuckDB** runs directly in your application and handles `.csv` and `.parquet` files, **Pandas** and **Polars** DataFrames, without setup drama. The data world keeps chasing bigger, more distributed architectures. **DuckDB** goes the other way: fast, local, and simple.

---
## The Minds Behind It

**DuckDB** wasn't born in a Silicon Valley startup. It came out of [CWI - Centrum Wiskunde & Informatica](https://www.cwi.nl/en/), a research institute in the Netherlands, the same place where [Guido van Rossum](https://www.linkedin.com/in/guido-van-rossum-4a0756/) first created **Python**. Its creators, [Hannes Mühleisen](https://www.linkedin.com/in/hfmuehleisen/) and [Mark Raasveldt](https://www.linkedin.com/in/mark-raasveldt-256b9a70/), weren't chasing the next cloud-based behemoth. They wanted something simple, local, and fast: a database that works _inside the application_, not outside of it.

The name? That's where it gets fun. When **Hannes** was living on a boat, he wanted a pet that wouldn't panic if it ended up in the water. A duck seemed like the obvious choice. That's how he ended up with **Wilbur**, a feathered companion perfectly suited for the floating lifestyle. So when it came time to name their database, **DuckDB** just made sense.

<p align="center">
  <img src="hannes-and-wilbur.png" alt="Hannes Mühleisen and Wilbur" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray;">
  Hannes Mühleisen and his pet duck, Wilbur. Photo by 
  <a href="http://isabellarozendaal.com/" target="_blank" style="color: gray;">Isabella Rozendaal</a>.
</p>

Alongside them, [Pedro Holanda](https://www.linkedin.com/in/pdet/), a fellow Brazilian, has been a major force in **DuckDB**'s development. His work on performance optimizations and query engine internals keeps the database fast and memory-friendly even on large datasets.

---
## Built to Stay Open

**DuckDB** is _open-source_ and _MIT-licensed_, and the [DuckDB Foundation](https://duckdb.org/foundation/) is set up to keep it that way. The non-profit owns the intellectual property, which removes the corporate rug-pull risk. Unlike projects controlled by a single company, **DuckDB**'s intellectual property isn't tied to a business that could change direction, seek profit, or get acquired. The foundation exists solely to protect **DuckDB**'s _open-source_ status, and because it's a legal entity with a defined mission, it can't just decide to revoke or relicense the code for financial gain. With that structure a rug pull is practically impossible.

> [!question] Corporate rug-pull?  
> A _rug-pull_ happens when the creators of a project, usually in open-source, crypto, or tech startups, suddenly change the rules in a way that harms users, often for their own financial gain. This can mean closing off access, changing the licensing model, or abandoning the project after securing funding.  
>
> In _open-source_ software, this usually starts with a company launching a project under a permissive license, like MIT or Apache, to attract users and contributors. As adoption grows and businesses start relying on it, the company suddenly switches to a more restrictive license, such as SSPL or BSL. This change limits how others can use or monetize the project, effectively forcing companies to either start paying for commercial licenses or scramble to find an alternative. It's a move that has happened before.

There's still business around **DuckDB**. The ecosystem rests on three players. The **DuckDB Foundation** keeps the project fully open and independent. [DuckDB Labs](https://duckdblabs.com/) is the company the creators founded to provide enterprise support, consultancy, and further development. [MotherDuck](https://motherduck.com/) is a cloud-backed version of **DuckDB** for people who want flexibility beyond their local machines. The **DuckDB** founders don't own MotherDuck outright, though they do hold a stake in it.

<p align="center">
  <img src="companies-structure.svg" alt="Companies Structure" width="80%">
</p>

This setup keeps **DuckDB** free, open, and community-driven while still offering commercial options for teams that want extra support or cloud capabilities.

---
## Transactions and Analytics

If you've worked with [SQLite](https://www.sqlite.org/), you already know the appeal: a lightweight, zero-setup database. **DuckDB** takes that same philosophy, and the same vibe, but points it at analytical workloads instead of transactions.

Databases generally fall into two camps. OLTP (Online Transaction Processing) is the world of **PostgreSQL**, **MySQL**, and **SQLite**: frequent, small transactions like updating a user profile or processing an online order. OLAP (Online Analytical Processing) is **Snowflake**, **BigQuery**, and **DuckDB**: complex queries over large datasets, like computing monthly revenue across millions of transactions.

While most OLAP databases live in the cloud with a client-server architecture, **DuckDB** keeps everything local: analytical power on your machine, without clusters or network latency.

---
## The Big Data Myth

<p align="center">
  <img src="big-data.png" alt="Big Data" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray;"> Photo by 
  <a href="https://unsplash.com/pt-br/@sortino" target="_blank" style="color: gray;">Joshua Sortino</a>.
</p>

Somewhere along the way, _Big Data_ became the default mindset. If you're working with data, the assumption is that you need a distributed system, a cloud cluster, and an army of nodes just to run a few queries. Most workloads aren't that big. What they need is fast, efficient processing on modern hardware, and that's where **DuckDB** shines.

Distributed systems earn their keep when you truly need them, but they bring complexity, cost, and operational overhead. Debugging across nodes is painful. Managing clusters is expensive. Modern local machines are ridiculously powerful: multi-core CPUs, plenty of RAM, fast SSDs. Millions of rows process locally without breaking a sweat.

**DuckDB** goes against the grain on purpose. Instead of scaling out it scales down, running entirely in-process. The design targets analytical workloads on a single machine and skips the baggage of distributed architectures entirely.

So before spinning up a fleet of servers, ask yourself whether you really need one. Dataset fits in memory, or you're doing ad-hoc analysis, or you just want a simple analytics engine? **DuckDB** might be all you need. Sometimes the best move is to keep it local.

---

**DuckDB** has no interest in replacing your data warehouse or outscaling the cloud giants. Not every problem needs that firepower. Choosing a tool that runs on one machine and gets out of your way is a perfectly good engineering decision, and it is the one **DuckDB** makes.

Two good places to go deeper: [Mehdio](https://www.mehdio.com/) from MotherDuck, and the [Talk Python to Me](https://talkpython.fm/) episode [#491](https://talkpython.fm/episodes/show/491/duckdb-and-python-ducks-and-snakes-living-together) with [Alex Monahan](https://www.linkedin.com/in/alex-monahan-64814292/) from DuckDB Labs.

Sometimes the best engineering choice is the one that runs on your laptop and gets out of your way.
