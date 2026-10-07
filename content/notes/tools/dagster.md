---
title: Dagster
date: 2025-04-05
draft: false
tags:
  - notes
  - tools
  - data-engineering
  - orchestration
  - dagster
---
---

Most orchestrators ask _what jobs should run?_ and leave you with a pile of scripts only the person who wrote them understands. **Dagster** starts from the other question: _what data should exist?_ It treats pipelines as production-grade software from day one instead of glorified cron.

---

## The Minds Behind It

**Dagster** emerged from **Elementl**, a company founded by [Nick Schrock](https://www.linkedin.com/in/schrockn/), who previously co-created [GraphQL](https://graphql.org/) at Facebook. In August 2023, the company officially [changed its name](https://dagster.io/blog/introducing-dagster-labs) to [Dagster Labs](https://www.linkedin.com/company/dagsterlabs/posts/?feedView=all) to better align with its singular focus on the **Dagster** product.

**Nick** wasn't building just another workflow scheduler. He was chasing the problem every data team knows: pipelines that stay reliable, testable, and understandable as they grow. Alongside **Nick**, engineers like [Sandy Ryza](https://www.linkedin.com/in/sandyryza/), [Daniel Gibson](https://www.linkedin.com/in/daniel-gibson-8b39037/), [Alex Langenfeld](https://www.linkedin.com/in/alex-langenfeld-3a710425/) and many other [contributors](https://github.com/dagster-io/dagster/graphs/contributors) have shaped **Dagster** into a full engineering platform for data rather than a bare scheduler.

The name _Dagster_ comes from DAG (Directed Acyclic Graph), the mathematical structure underlying most data pipelines. The "-ster" suffix is that early 2010s tech naming vibe, I believe.

---
## Open Core

<p align="center">
  <img src="core-and-plus.svg" alt="Dagster and Dagster+" width="85%">
</p>

Unlike [[duckdb|DuckDB]] with its foundation model, **Dagster** follows the open core approach. The core [Dagster project](https://github.com/dagster-io/dagster) is open-source under the Apache 2.0 license, fully free to use, modify, and distribute. **Dagster Labs** offers [Dagster+](https://dagster.io/plus) on top of it, their commercial cloud product: a hosted, enterprise-ready version with additional features.

> [!question] Open core model?
> The open core business model maintains a free, open-source core product while offering paid, proprietary extensions or hosted services. Companies get community contributions on the core and still keep a path to revenue through premium features.
> 
> The hard part is drawing the line. Companies using this model must carefully balance which features belong in the open core versus the commercial offering. The risk of a _rug-pull_, where popular open-source features suddenly move behind a paywall, is always present. So far, **Dagster Labs** has maintained a fair balance, keeping the core project robust while offering genuine additional value in their cloud product.

The model has held up for **Dagster Labs**, which has raised significant venture capital. Open-source success comes first and the commercial offering follows from it, and that ordering has bought trust in both communities.

---
## Beyond Just Orchestration

**Dagster** has ambitions beyond being a data orchestrator. As their CEO [Pete Hunt](https://www.linkedin.com/in/pwhunt/), who was also one of the founding team members of [React](https://react.dev/), explains in their [master plan](https://dagster.io/blog/dagster-master-plan), they aim to _accelerate the adoption of Software Engineering best practices by every data team on the planet_. A lofty goal, but one that drives their product decisions.

This vision matches where Data Engineering itself is heading. As the work matures, the shift is from Data Engineers who build pipelines to Data Platform Engineers who build the frameworks, services, and platforms everyone else builds on. Personally, I strongly agree with this vision.

> [!tip] [The Rise of the Data Platform Engineer](https://dagster.io/blog/rise-of-the-data-platform-engineer), by [Pedram Navid](https://www.linkedin.com/in/pedramnavid/)
>
> As teams mature, the role of Data Engineers is evolving beyond just building ETL pipelines. The Data Platform Engineer focuses on creating self-service frameworks and tools that enable others to build their own data pipelines without needing deep technical expertise. This shift addresses the original challenge posed by Jeff Magnusson back in 2016: [engineers should build platforms, services, and frameworks - not ETL pipelines](https://multithreaded.stitchfix.com/blog/2016/03/16/engineers-shouldnt-write-etl/).
> 
> Instead of scaling the number of Data Engineers to meet growing demands, Data Platform Engineers scale their impact by building systems that empower Analytics Engineers, Data Scientists, and other stakeholders. It's a natural progression that finally gives Data Engineers something to look forward to beyond just handling bigger data and more complex pipelines.

---
## Elegantly Architected Components

The biggest mind-shift with **Dagster** is its asset-centric approach. Traditional orchestrators think in terms of tasks and jobs. **Dagster** focuses on the data assets those jobs create. It understands the data _flowing_ between your tasks and makes that explicit in the design.

In practice, your pipeline is a series of _assets_ with clear dependencies, inputs, and outputs. That shift changes how you build, test, and maintain data workflows.

**Dagster**'s architecture also applies Software Engineering principles to data workflows. Each component embodies patterns that already proved themselves in production software:

<p align="center">
  <img src="components.svg" alt="Dagster Components" width="85%">
</p>

### `assets`

`assets` are objects in persistent storage: tables, files, or models that your data pipelines create and update. They're the data products your business cares about, and the processes that create them exist to serve those products. **Dagster**'s [asset-oriented approach](https://docs.dagster.io/guides/build/assets/) lets you define what data should exist and how to compute it.

When you define an `asset`, you describe what data should exist, how to produce it, and what other data it depends on. The declarative metadata is also queryable information that drives visibility and governance.

### `ops`

`ops` are **Dagster**'s [core units of computation](https://docs.dagster.io/guides/build/ops/), well-defined functions that perform discrete tasks like transforming data, executing a query, or sending a notification. They behave like **LEGO** bricks for data pipelines: composable and side-effect free, each one doing a single job well.

Behind the scenes, every `asset` is powered by an `op`. For complex workflows, ops can be assembled into reusable graphs.

### `jobs`

`jobs` are the [main unit of execution and monitoring](https://docs.dagster.io/guides/build/jobs/) in **Dagster**. They run a selection of `assets` or `ops` on a `schedule` or `sensor`, and when a `job` begins it kicks off a run you can watch in the UI.

`jobs` tie together `assets` or `ops` with execution strategies, which is what makes automation and production workflows possible.

### `resources`

`resources` provide standardized [access to external systems](https://docs.dagster.io/guides/build/external-resources/), databases, or services. It's **Dagster**'s implementation of dependency injection: like telling your code, _Don't hunt for that database connection, I'll hand it to you_. The code becomes testable and the configuration stays where it belongs.

That standardization is what makes `assets` and `ops` portable across environments.

### `schedules` and `sensors`

**Dagster**'s [scheduling system](https://docs.dagster.io/guides/automate/schedules/) executes `jobs` at specified intervals using cron expressions, while [sensors](https://docs.dagster.io/guides/automate/sensors/) react to events in **Dagster** or external systems. Together they cover the automation most data workflows need.

---
## Pythonic Code Throughout

**Dagster** embraces **Python**'s philosophy of _explicit is better than implicit._ Decorators register functions, type hints catch mistakes early, context managers clean up messes, iterators handle data too big for memory.

This approach keeps the code natural to **Python** developers and earns the tooling benefits of standard **Python**, from IDEs to linters. Tools built on domain-specific languages or configuration files can't offer that. In **Dagster** you define and extend workflows with the full power of the language.

Need a custom pattern for handling certain file types? Write a **Python** class. Want to integrate with an obscure API? Import that client library and wrap it in a resource. Want to trigger jobs only when Mercury is in retrograde? That's just a custom sensor away.

This modularity means you're not locked into **Dagster**'s opinions about external systems. Bring your own patterns, or reach for a community solution.

---
## When to Choose Dagster

**Dagster** isn't for everyone. Running a couple of cron jobs to refresh a handful of tables? It might be more than you need. Entire workflow lives in **dbt** with minimal **Python**? You might not need **Dagster**'s full capabilities, though its [dbt integration](https://docs.dagster.io/integrations/dbt) is excellent. **Dagster** starts to pay off when your pipelines have grown from _a couple of SQL queries_ to _a tangled web that makes you question your career choices_.

The biggest consideration is the learning curve. The asset-based model requires a mental shift, and **Dagster**'s flexibility means multiple ways to solve the same problem. The investment pays off though. Thinking in data assets first makes pipelines more intuitive and more maintainable, and closer to what the business actually cares about. If you're tired of data pipelines that are brittle and hard to adapt, that initial curve is worth climbing.

Teams scaling their data platforms without proportionally scaling headcount get the most out of it. Instead of hiring an army of pipeline builders, **Dagster** lets you build platforms and frameworks that enable self-service for analysts, scientists, and other stakeholders. Your Data Engineers become Platform Engineers, focused on infrastructure and architecture instead of one-off pipelines.

---

Data work doesn't have to be a collection of loosely connected scripts with unpredictable behavior. With the right tooling it can be as disciplined and reliable as modern Software Engineering.

In the next few days I'll publish a hands-on tutorial showing how to build an end-to-end data pipeline entirely in **Dagster**. The conceptual overview and the practical build would crowd each other in a single note.

**Dagster** is one of the few tools that makes that discipline feel worth the trouble.
