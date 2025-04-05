---
title: Dagster
date: 2025-04-05
draft: false
tags:
  - articles
  - tools
  - data-engineering
  - orchestration
  - dagster
---
---

In a world drowning in data pipelines that resemble Rube Goldberg machines, Dagster emerges as the architect's choice - a fresh approach to data orchestration that treats pipelines as production-grade software from day one. Unlike traditional tools obsessed with scheduling and triggering tasks, Dagster flips the script with an asset-first approach, asking _what data should exist?_ before _what jobs should run?_

---

## The Minds Behind it

[Dagster](https://dagster.io/) emerged from **Elementl**, a company founded by [Nick Schrock](https://www.linkedin.com/in/schrockn/), who previously co-created [GraphQL](https://graphql.org/) at Facebook. In August 2023, the company officially [changed its name](https://dagster.io/blog/introducing-dagster-labs) to [Dagster Labs](https://www.linkedin.com/company/dagsterlabs/posts/?feedView=all) to better align with its singular focus on the Dagster product.

Nick wasn't building just another workflow scheduler—he was addressing a fundamental problem: data teams struggle to build reliable, testable pipelines that don't collapse under their own weight. Alongside Nick, engineers like [Sandy Ryza](https://www.linkedin.com/in/sandyryza/), [Daniel Gibson](https://www.linkedin.com/in/daniel-gibson-8b39037/), [Alex Langenfeld](https://www.linkedin.com/in/alex-langenfeld-3a710425/) and many other [contributors](https://github.com/dagster-io/dagster/graphs/contributors) have shaped Dagster into what it is today—not just a scheduler, but a true engineering platform for data.

The name _Dagster_ comes from DAG (Directed Acyclic Graph), the mathematical structure underlying most data pipelines (plus "-ster" for that early 2010s tech naming vibe, I believe).

---
## Open Core

<p align="center">
  <img src="core-and-plus.svg" alt="Dagster and Dagster+" width="85%">
</p>

Unlike [[duckdb|DuckDB]] with its foundation model, Dagster follows the open core approach. The core [Dagster project](https://github.com/dagster-io/dagster) is open-source under the Apache 2.0 license—fully free to use, modify, and distribute. But Dagster Labs offers [Dagster+](https://dagster.io/plus) (their commercial cloud product), a hosted, enterprise-ready version with additional features.

> [!question] Open core model?
> The **open core** business model maintains a free, open-source core product while offering paid, proprietary extensions or hosted services. This approach lets companies benefit from community contributions while maintaining a path to revenue through premium features.
> 
> Companies using this model must carefully balance which features belong in the open core versus the commercial offering. The risk of a _rug-pull_—where popular open-source features suddenly move behind a paywall—is always present. So far, Dagster Labs has maintained a fair balance, keeping the core project robust while offering genuine additional value in their cloud product.

This model has proven sustainable for Dagster Labs, which has raised significant venture capital. Their approach prioritizes open-source success as fundamental to their commercial offering, which has helped them build trust in both communities.

---
## Beyond Just Orchestration

Dagster has ambitions far beyond being just another data orchestrator. As their CEO [Pete Hunt](https://www.linkedin.com/in/pwhunt/) (who was also one of the founding team members of [React](https://react.dev/)) explains in their [master plan](https://dagster.io/blog/dagster-master-plan), they aim to _accelerate the adoption of Software Engineering best practices by every data team on the planet_. That's a lofty goal, but one that drives their product decisions.

This vision aligns with the evolution of Data Engineering itself. As the data landscape matures, there's a shift from Data Engineers who simply build pipelines to **Data Platform Engineers** who create frameworks, services, and platforms that empower other team members to build what they need. Personally, I strongly agree with this vision.

> [!tip] [The Rise of the Data Platform Engineer](https://dagster.io/blog/rise-of-the-data-platform-engineer), by [Pedram Navid](https://www.linkedin.com/in/pedramnavid/)
>
> As teams mature, the role of Data Engineers is evolving beyond just building ETL pipelines. The Data Platform Engineer focuses on creating self-service frameworks and tools that enable others to build their own data pipelines without needing deep technical expertise. This shift addresses the original challenge posed by Jeff Magnusson back in 2016: [engineers should build platforms, services, and frameworks—not ETL pipelines](https://multithreaded.stitchfix.com/blog/2016/03/16/engineers-shouldnt-write-etl/).
> 
> Instead of scaling the number of Data Engineers to meet growing demands, Data Platform Engineers scale their impact by building systems that empower Analytics Engineers, Data Scientists, and other stakeholders. It's a natural progression that finally gives Data Engineers something to look forward to beyond just handling bigger data and more complex pipelines.

---
## Elegantly Architected Components

The biggest mind-shift with Dagster is its **asset-centric** approach. While traditional orchestrators think in terms of tasks and jobs, Dagster focuses on the data assets those jobs create. Dagster understands the data _flowing_ between your tasks and makes this explicit in its design.

What does this mean in practice? Your pipeline isn't just a collection of tasks—it's a series of _assets_ with clear dependencies, inputs, and outputs. This shift in perspective transforms how you build, test, and maintain data workflows.

On top of that, Dagster's architecture isn't just another way to schedule jobs—it's a thoughtful application of Software Engineering principles to data workflows. Each component in the system embodies battle-tested patterns from software development:

<p align="center">
  <img src="components.svg" alt="Dagster Components" width="85%">
</p>

### `assets`

`assets` are objects in persistent storage—tables, files, or models—that your data pipelines create and update. They're the actual data products your business cares about, not just the processes that create them. Dagster's [asset-oriented approach](https://docs.dagster.io/guides/build/assets/) lets you define what data should exist and how to compute it.

When you define an `asset`, you're describing what data should exist, how to produce it, and what other data it depends on. The declarative metadata isn't just documentation—it's queryable information that drives visibility and governance.

### `ops`

`ops` are Dagster's [core units of computation](https://docs.dagster.io/guides/build/ops/)—well-defined functions that perform discrete tasks like transforming data, executing a query, or sending a notification. They're like LEGO bricks for data pipelines: composable, side-effect free, and focused on doing one thing well.

Behind the scenes, every `asset` is powered by an `op`. For complex workflows, ops can be assembled into reusable graphs.

### `jobs`

`jobs` are the [main unit of execution and monitoring](https://docs.dagster.io/guides/build/jobs/) in Dagster. They allow you to run a selection of `assets` or `ops` based on a `schedule` or `sensor`. When a `job` begins, it kicks off a run that can be monitored in the UI.

`jobs` tie together `assets` or `ops` with execution strategies, making them crucial for automation and production workflows.

### `resources`

`resources` provide standardized [access to external systems](https://docs.dagster.io/guides/build/external-resources/), databases, or services. It's Dagster's implementation of dependency injection—like telling your code, _Don't hunt for that database connection, I'll hand it to you_. This gives you testability, configuration flexibility and separation of concerns.

`resources` standardize how your `assets` and `ops` connect to external systems, making code more testable and portable across environments.

### `schedules` and `sensors`

Dagster's [scheduling system](https://docs.dagster.io/guides/automate/schedules/) executes `jobs` at specified intervals using cron expressions, while [sensors](https://docs.dagster.io/guides/automate/sensors/) react to events in Dagster or external systems. Together, they provide flexible automation options for your data workflows.

---
## Pythonic Code Throughout

Dagster embraces Python's philosophy of _explicit is better than implicit._ No magic—just good Pythonic code. The framework uses decorators to register functions, type hints to catch mistakes early, context managers to clean up messes, iterators for data too big for memory, etc.

This Pythonic approach makes the code feel natural to Python developers and allows for all the tooling benefits (IDEs, linters, etc) that come with standard Python. Unlike tools using domain-specific languages or configuration files, Dagster lets you use the full power of Python to define and extend your workflows.

Need a custom pattern for handling certain file types? Write a Python class. Want to integrate with an obscure API? Import that client library and wrap it in a resource. Want to trigger jobs only when Mercury is in retrograde? That's just a custom sensor away.

This modularity means you're not locked into Dagster's opinions about external systems—you can bring your own patterns or use community solutions.

---
## When to Choose Dagster

Let's be clear—Dagster isn't for everyone. If you're just running a couple of cron jobs to refresh a handful of tables, it might be more than you need. Similarly, if your entire data workflow is built in dbt with minimal Python, you might not need Dagster's full capabilities (though its [dbt integration](https://docs.dagster.io/integrations/dbt) is excellent). Dagster shines when your data pipelines have grown from _a couple of SQL queries_ to _a tangled web that makes you question your career choices_.

The biggest consideration with Dagster? It has a learning curve. The asset-based model requires a mental shift, and Dagster's flexibility means multiple ways to solve the same problem. But this initial investment pays off. By thinking in terms of data assets first, your pipelines become more intuitive, maintainable, and aligned with what your business actually cares about. If you're tired of data pipelines that are brittle, hard to reason about, and difficult to adapt, Dagster's approach is worth the initial learning curve.

Dagster is particularly valuable for teams looking to scale their data platforms without proportionally scaling headcount. Instead of hiring an army of pipeline builders, Dagster lets you build platforms and frameworks that enable self-service for analysts, scientists, and other stakeholders—turning your Data Engineers into true Platform Engineers who can focus on infrastructure and architecture instead of one-off pipelines.

---

Data work doesn't have to be a collection of loosely connected scripts with unpredictable behavior. With the right tooling and approach, it can be as disciplined and reliable as modern Software Engineering. Dagster isn't just another orchestrator—it's a philosophy about how data work can be thoughtful, maintainable, and even joyful.

In the next few days, I'll be publishing a hands-on tutorial showing how to build an end-to-end data pipeline entirely in Dagster. I decided to split this into a separate article since combining both the conceptual overview and the practical implementation would be a bit overwhelming for one reading session.

Have you tried Dagster yet? I'd love to hear your thoughts and experiences!