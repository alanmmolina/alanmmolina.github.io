---
title: DuckDB
date: 2025-03-01
draft: false
tags:
  - articles
  - tools
  - data-engineering
  - databases
  - duckdb
---
---

There’s something great about a tool that just works - no setup drama, no unnecessary complexity. That’s exactly what DuckDB brings to the table. It’s a zero-fuss analytical database that runs directly in your application, effortlessly handling .csv or .parquet files, and even Pandas or Polars DataFrames. While the data world keeps chasing bigger, more distributed architectures, DuckDB flips the script - fast, local, and refreshingly simple.  

---
## The Minds Behind it

[DuckDB](https://duckdb.org/) wasn’t born in a Silicon Valley startup - it came out of [CWI - Centrum Wiskunde & Informatica](https://www.cwi.nl/en/), a research institute in the Netherlands, the same place where [Guido van Rossum](https://www.linkedin.com/in/guido-van-rossum-4a0756/) first created Python. Its creators, [Hannes Mühleisen](https://www.linkedin.com/in/hfmuehleisen/) and [Mark Raasveldt](https://www.linkedin.com/in/mark-raasveldt-256b9a70/), weren’t chasing the next cloud-based behemoth. Instead, they wanted something simple, local, and ridiculously fast - a database that works _inside the application_, not outside of it.  

The name? That’s where it gets fun. When Hannes was living on a boat, he wanted a pet that wouldn’t panic if it ended up in the water. A duck seemed like the obvious choice. That’s how he ended up with **Wilbur**, a feathered companion perfectly suited for the floating lifestyle. So when it came time to name their database, DuckDB just made sense.

<p align="center">
  <img src="hannes-and-wilbur.png" alt="Hannes Mühleisen and Wilbur" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray;">
  Hannes Mühleisen and his pet duck, Wilbur. Photo by 
  <a href="http://isabellarozendaal.com/" target="_blank" style="color: gray;">Isabella Rozendaal</a>.
</p>

Alongside them, [Pedro Holanda](https://www.linkedin.com/in/pdet/), a fellow Brazilian, has been a major force in DuckDB’s development, diving deep into its performance optimizations and query engine internals. His work helps ensure DuckDB keeps running fast, efficient, and memory-friendly, even when crunching large datasets.  

---
## Built to Stay Open

Today, DuckDB is _open-source_ and _MIT-licensed_ **forever**, thanks to the [DuckDB Foundation](https://duckdb.org/foundation/), a non-profit that owns its intellectual property - no risk of a corporate rug-pull. Unlike projects controlled by a single company, DuckDB’s intellectual property isn’t tied to a business that could change direction, seek profit, or get acquired. The foundation exists solely to protect DuckDB’s _open-source_ status, and because it's a legal entity with a defined mission, it can’t just decide to revoke or relicense the code for financial gain. This structure makes a rug pull not just unlikely, but practically impossible.

> [!question] Corporate rug-pull?  
> A **rug-pull** happens when the creators of a project - usually in open-source, crypto, or tech startups - suddenly change the rules in a way that harms users, often for their own financial gain. This can mean closing off access, changing the licensing model, or abandoning the project after securing funding.  
>
> In _open-source_ software, this usually starts with a company launching a project under a permissive license, like MIT or Apache, to attract users and contributors. As adoption grows and businesses start relying on it, the company suddenly switches to a more restrictive license, such as SSPL or BSL. This change limits how others can use or monetize the project, effectively forcing companies to either start paying for commercial licenses or scramble to find an alternative. It’s a move that has happened before.

 But that doesn’t mean there’s no business behind it. The ecosystem around DuckDB today is built on three key players. First, there’s the **DuckDB Foundation**, which ensures the project stays fully open and independent. Then, there’s **[DuckDB Labs](https://duckdblabs.com/)**, a company founded by the database’s creators to provide enterprise support, consultancy, and further development. And finally, there’s **[MotherDuck](https://motherduck.com/)**, a cloud-backed version of DuckDB designed for those who want flexibility beyond their local machines. While the DuckDB founders don’t own MotherDuck outright, they do hold a stake in the company, keeping them closely tied to its future.  

<p align="center">
  <img src="companies-structure.svg" alt="Companies Structure" width="80%">
</p>

This setup keeps DuckDB free, open, and community-driven while still offering commercial options for those who need extra support or cloud capabilities. No corporate lock-in, no bait-and-switch.

---
## Transactions and Analytics

If you’ve worked with [SQLite](https://www.sqlite.org/), you already know the appeal: a lightweight, zero-setup database. DuckDB takes that same philosophy (and has the same vibe) but applies it to analytical workloads instead of transactions.  

Databases generally fall into two camps:  
- **OLTP (Online Transaction Processing)** – Think PostgreSQL, MySQL, SQLite. These databases handle _frequent, small transactions_, like updating a user profile or processing an online order.  
- **OLAP (Online Analytical Processing)** – Think Snowflake, BigQuery, DuckDB. These databases are designed for _complex queries on large datasets_, like computing monthly revenue across millions of transactions.  

While most OLAP databases live in the cloud with a client-server architecture, DuckDB flips the script by keeping everything **local**. No clusters, no network latency - just raw analytical power on your machine.  

---
## The Big Data Myth

<p align="center">
  <img src="big-data.png" alt="Big Data" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray;"> Photo by 
  <a href="https://unsplash.com/pt-br/@sortino" target="_blank" style="color: gray;">Joshua Sortino</a>.
</p>

Somewhere along the way, _Big Data_ became the default mindset. If you’re working with data, the assumption is that you need a distributed system, a cloud cluster, and an army of node just to run a few queries. But let’s be real - **most workloads aren’t that big**. What we actually need is fast, efficient processing on modern hardware - and that’s exactly where DuckDB shines.  

Distributed systems are great when you truly need them, but they come with complexity, cost, and operational headaches. Debugging across multiple nodes? Painful. Managing clusters? Expensive. The truth is, modern local machines are ridiculously powerful - multi-core CPUs, plenty of RAM, fast SSDs. You can process millions of rows locally without breaking a sweat.  

That’s why DuckDB goes against the grain. Instead of scaling out, it **scales down**, running entirely in-process. No clusters, no network overhead - just raw speed. It’s designed to handle analytical workloads efficiently on a single machine, avoiding the unnecessary baggage of distributed architectures.  

So before spinning up a fleet of servers, ask yourself: do you really need it? If your dataset fits in memory, if you’re doing ad-hoc analysis, or if you just want a simple, no-fuss analytics engine, DuckDB might be all you need. In a world obsessed with scaling out, sometimes the best move is to keep it local.

---

At the end of the day, DuckDB isn’t trying to replace your data warehouse or outscale the cloud giants - it’s reminding us that not every problem needs that kind of firepower. Sometimes the best engineering choice is the simplest one: a tool that runs locally, gets out of your way, and delivers results without the overhead. That’s what makes DuckDB so compelling. It doesn’t chase the hype; it solves the problem right in front of you, and it does it beautifully.

Want to learn more? I highly recommend following [Mehdio](https://www.mehdio.com/) from MotherDuck and checking out the [Talk Python to Me](https://talkpython.fm/) episode [#491](https://talkpython.fm/episodes/show/491/duckdb-and-python-ducks-and-snakes-living-together) with [Alex Monahan](https://www.linkedin.com/in/alex-monahan-64814292/) from DuckDB Labs.

Have you worked with DuckDB? How does it fit into your workflow? Reach out - I'd love to hear your thoughts and experiences!
