---
title: Environment Management with uv
date: 2025-02-15
draft: false
tags:
  - projects
  - lakeground
  - platform-engineering
  - python
  - rust
---
---

Building a modular data engineering stack means more than picking tools. [[projects/lakeground/index|Lakeground]] is several independent components, and each one needs a Python environment that stays flexible without becoming a mess. [`uv`](https://github.com/astral-sh/uv) is what I reached for.

---
## Why `uv`?  

Python is not short of package and environment managers. `uv` is the one that felt different. Built with Rust by the creators of [Ruff](https://docs.astral.sh/ruff/), it is fast in a way you notice, and it replaces the `pip` plus `venv` plus `virtualenv` shuffle with a single utility. True to its name, _Unified Vision_, it pulls the useful parts of those tools into one place.  

What makes `uv` fit [[projects/lakeground/index|Lakeground]] is its [workspaces](https://docs.astral.sh/uv/concepts/projects/workspaces/#using-workspaces) feature.

> [!tip] What about Rust?
> Plenty of modern tools are built with Rust, and good enough that they never leave my setup: [Polars](https://pola.rs/) and [Starship](https://starship.rs/) for two. A few months ago I picked up Rust while taking a Software Architecture course. The language feels amazing. For those of us who treat Python as almost a native language the transition is rough, though. Rust makes you look at the Computer Engineering concepts Python abstracts away entirely. 
> 
> Its package manager, `cargo`, is a joy to work with, and the logs and stack traces are some of the most detailed and intuitive I've seen. I ~~suffered~~ coded with Rust for a short time and barely scratched the surface. It's worth the investment. I'll come back to it.
>  
> If you work with data like I do, [Data With Rust](https://datawithrust.com/) by Karim Jedda is worth keeping open.  

---
### `uv` Workspaces

[[projects/lakeground/index|Lakeground]] is built so each component works as an [[01-repository-scaffold|independent module]], and the environment manager has to respect that. `uv` workspaces let several projects live under one umbrella while each keeps its own dependencies and configuration.

> [!quote] `uv` [docs](https://docs.astral.sh/uv/concepts/projects/workspaces/#using-workspaces):
> Inspired by the [Cargo](https://doc.rust-lang.org/cargo/reference/workspaces.html) concept of the same name, a workspace is "a collection of one or more packages, called _workspace members_, that are managed together."

**Cargo** workspaces let developers manage several interdependent packages in one repository while keeping each package's dependency tree _separate_ but _compatible_.

`uv` workspaces carry the same principles over to Python environments. Each [crate](https://doc.rust-lang.org/book/ch07-01-packages-and-crates.html) in a **Cargo** workspace is isolated but can still share dependencies, and `uv` treats each component of [[projects/lakeground/index|Lakeground]] the same way: managed on its own, with shared libraries kept consistent.

---

## Getting Started with `uv`

Installing `uv` is one command:

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```

You don't need Python on the machine before starting a Python project. `uv` fetches it. To install Python 3.13:

```sh
uv python install 3.13
```

To check which Python versions are installed:

```sh
uv python list --only-installed
```

Multiple Python versions pile up easily: some global, some tied to specific projects. This keeps the list in one place instead of in your head.

To initialize the project:

```sh
uv init lakeground
```

`uv` scaffolds the project like this:

```
.
└── lakeground
    ├── .python-version
    ├── README.md
    ├── hello.py
    └── pyproject.toml
```

The `.python-version` file pins the Python version so every environment agrees on it. `README.md` documents the project. `hello.py` is a one-line starter script for testing the setup. `pyproject.toml` holds the configuration: dependencies, build tools, metadata. That's a structured Python project.

A virtual environment is one more command:

```sh
uv venv --python 3.13
```

It writes a `.venv` folder with everything the environment needs. To activate it:

```sh
source .venv/bin/activate
```

`pyproject.toml` is where package management lives. The `dependencies` section is empty so far. External dependencies land there, along with any internal components added later:

```toml
[project]
name = "lakeground"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.13"
dependencies = []
```

A few dependencies show how `uv` handles them:

```sh
uv add typer duckdb pydantic
```

No version constraints means `uv` resolves and installs the latest compatible versions. `pyproject.toml` then reads like this:

```toml
dependencies = [
    "duckdb>=1.2.0",
    "pydantic>=2.10.6",
    "typer>=0.15.1",
]
```

To remove a package:

```sh
uv remove pydantic
```

Any change to `pyproject.toml`, adding, updating, or removing a dependency, can be synchronized with:

```sh
uv sync
```

The project also has a `uv.lock` file. It records every package reference and metadata so builds stay reproducible. **Do not** edit it by hand. `uv` manages it.

To visualize those dependencies:

```sh
uv tree
```

The full tree, nested dependencies included:

```
lakeground v0.1.0
├── duckdb v1.2.0
└── typer v0.15.1
    ├── click v8.1.8
    ├── rich v13.9.4
    │   ├── markdown-it-py v3.0.0
    │   │   └── mdurl v0.1.2
    │   └── pygments v2.19.1
    ├── shellingham v1.5.4
    └── typing-extensions v4.12.2
```


[Extra dependencies](https://packaging.python.org/en/latest/tutorials/installing-packages/#installing-extras) can be added without installing them by default. Useful when a package only matters for one feature and the environment should stay lean.

For example, `dlt` as an optional dependency under the `ingestion` group:

```sh
uv add dlt --optional ingestion
```

`pyproject.toml` gains this section:

```toml
[project.optional-dependencies]
ingestion = [
    "dlt>=1.6.1",
]
```

_Development dependencies_, linters and formatters and the like, are the same idea. They stay out of production:

```sh
uv add ruff --dev
```

`uv` keeps them under the `[tool.uv]` section:

```toml
[tool.uv]
dev-dependencies = [
    "ruff>=0.9.6",
]
```

To run the _Hello World_ script that comes with `uv init`:

```sh
uv run hello.py
```

This runs inside the managed environment. The virtual environment does not need to be activated first.

## Working with `uv` Workspaces

From the root project folder, initialize a new `uv` project inside it:

```sh
cd lakeground
uv init component
```

The output looks like:

```log
Adding `component` as member of workspace `../lakeground`
Initialized project `component` at `../lakeground/component`
```

Inside `component`, `uv` scaffolded a project with its own `pyproject.toml`:

```toml
[project]
name = "component"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.13"
dependencies = []
```

The root `pyproject.toml` registers it as a _workspace member_:

```toml
[tool.uv.workspace]
members = ["component"]
```

A dependency inside `component`:

```sh
cd component
uv add polars
```

`polars` lands in the `dependencies` section of the component `pyproject.toml`:

```toml
dependencies = [
    "polars>=1.22.0",
]
```

The root `pyproject.toml` does not change. The workspace dependency tree:

```
component v0.1.0
└── polars v1.22.0
lakeground v0.1.0
├── duckdb v1.2.0
└── typer v0.15.1
    ├── click v8.1.8
    ├── rich v13.9.4
    │   ├── markdown-it-py v3.0.0
    │   │   └── mdurl v0.1.2
    │   └── pygments v2.19.1
    ├── shellingham v1.5.4
    └── typing-extensions v4.12.2
```

Notice there is no `uv.lock` inside the component directory. So where do its dependencies live?

Check the root `uv.lock` and `polars` is there, recorded as part of the parent project. The component _shares the same virtual environment_ as the root, so every dependency is managed in one place.

Each subproject defines its own dependencies and `uv` keeps them compatible across the workspace. One lockfile instead of several, all in sync. The shared virtual environment means switching components does not require reactivation or leave you guessing about mismatched package versions.

---
## What's Next?

The foundation is set. Time to start _filling the Lake_ with data. [dlt](https://dlthub.com/) does the pulling, from APIs and other sources straight into [[projects/lakeground/index|Lakeground]].

The next note sets up the ingestion pipeline and loads the first datasets into [[projects/lakeground/index|Lakeground]].

---  

I don't have much production experience with `uv` yet. Setting up a project is still simple and _violently fast_, and one of those tools that just *clicks*.

It earns the space in my setup.