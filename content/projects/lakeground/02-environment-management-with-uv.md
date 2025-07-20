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

Building a modular data engineering stack requires more than just choosing the right tools - it also means keeping everything organized, reproducible, and easy to manage. Since [[00-concept-and-motivation|Lakeground]] will be made up of multiple independent components, I need a way to handle Python environments in a way that’s both flexible and efficient. That’s where [`uv`](https://github.com/astral-sh/uv) comes in.

---
## Why `uv`?  

Python has no shortage of package and environment managers, but `uv` brings something fresh to the table. Built with Rust by the creators of [Ruff](https://docs.astral.sh/ruff/), `uv` is a modern, high-performance tool designed to be _fast_, _lightweight_, and _developer-friendly_. It tackles many of the pain points found in traditional tools like `pip`, `venv`, and `virtualenv`, offering a unified approach to package and environment management. True to its name - _Unified Vision_ - `uv` consolidates the best features of these tools into a single, streamlined utility.  

But what really makes `uv` a perfect fit for [[00-concept-and-motivation|Lakeground]] is its [workspaces](https://docs.astral.sh/uv/concepts/projects/workspaces/#using-workspaces) feature.

> [!tip] What about Rust?
> There are plenty of modern tools built with Rust that are so good they've become staples in my development setup - like [Polars](https://pola.rs/) and [Starship](https://starship.rs/). A few months ago, I decided to explore Rust while taking a Software Architecture course, and I have to say, the language feels amazing. But for those of us who treat Python as almost a native language, the transition isn’t exactly smooth. Rust forces you to dive deeper into Computer Engineering concepts that Python abstracts away entirely. 
> 
> That said, its package manager, `cargo`, is a joy to work with, and the logs and stack traces are some of the most detailed and intuitive I’ve seen. I ~~suffered~~ coded with Rust for just a short time, so I barely scratched the surface - but it’s definitely worth the investment. I’ll probably come back to it at some point.
>  
> If you work with data like I do, [Data With Rust](https://datawithrust.com/) by Karim Jedda is a great reference to keep an eye on.  

---
### `uv` workspaces

Since [[00-concept-and-motivation|Lakeground]] is structured as each component functioning as an [[01-repository-scaffold|independent module]], I need an environment management solution that respects that modularity. `uv`’s workspaces allow multiple projects to coexist under a single umbrella while maintaining their own dependencies and configurations.

> [!quote] `uv` [docs](https://docs.astral.sh/uv/concepts/projects/workspaces/#using-workspaces):
> Inspired by the [Cargo](https://doc.rust-lang.org/cargo/reference/workspaces.html) concept of the same name, a workspace is "a collection of one or more packages, called _workspace members_, that are managed together."

Cargo's workspace feature allows developers to manage multiple interdependent packages in a single repository while maintaining _separate_, but _compatible_, dependency trees for each package. This modular approach promotes efficient development and clear dependency management.

Similarly, `uv` workspaces take the same principles and apply them to Python environments. By mimicking this well-established pattern from Rust, `uv` provides a powerful solution to the challenges of managing dependencies across multiple Python projects. Just like Cargo ensures that each [crate](https://doc.rust-lang.org/book/ch07-01-packages-and-crates.html) within a workspace is isolated but can still share dependencies, `uv` allows me to manage each component of [[00-concept-and-motivation|Lakeground]] independently while ensuring that shared libraries are consistently maintained.

---

## Getting started with `uv`

Getting `uv` up and running is surprisingly straightforward. The easiest way to install it is with:

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Now, here’s where the magic happens - you don’t even need Python installed on your machine to start a Python project. `uv` takes care of that for you. Let’s install Python 3.13:

```sh
uv python install 3.13
```

You can also check which Python versions are installed:

```sh
uv python list --only-installed
```

This is a super handy command. It’s common to have multiple Python versions floating around - some globally installed, others tied to specific projects. Keeping track of them can quickly turn into a mess, but `uv` helps keep things organized.

Now, let’s initialize our Python project. Just run:

```sh
uv init lakeground
```

`uv` will scaffold everything you need to get started:

```
.
└── lakeground
    ├── .python-version
    ├── README.md
    ├── hello.py
    └── pyproject.toml
```

Here’s a quick breakdown of what these files do:

- `.python-version`: Defines the Python version for this project, ensuring consistency across environments.
- `README.md`: A basic README file to document the project.
- `hello.py`: A simple starter script (a basic print statement) to test the setup.
- `pyproject.toml` – The heart of the project’s configuration, managing dependencies, build tools, and metadata.

And just like that, you’ve got a fully structured Python project, ready to roll.

We can also create a virtual environment using `uv`:

```sh
uv venv --python 3.13
```

This will generate a `.venv` folder, which contains everything needed for the virtual environment to work. To activate it, use the usual command:

```sh
source .venv/bin/activate
```

Now, let’s take a look at the `pyproject.toml` file - this is the heart of our package management. Right now, the `dependencies` section is empty. This is where all external dependencies will be listed, along with any internal components we might add later:

```toml
[project]
name = "lakeground"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.13"
dependencies = []
```

Let’s install a few dependencies to see how `uv` handles them:

```sh
uv add typer duckdb pydantic
```

Since we haven’t specified any version constraints, `uv` automatically resolves and installs the latest compatible versions. If you check `pyproject.toml` again, you’ll see something like this:

```toml
dependencies = [
    "duckdb>=1.2.0",
    "pydantic>=2.10.6",
    "typer>=0.15.1",
]
```

Need to remove a package? No problem:

```sh
uv remove pydantic
```

If you make any changes to the `pyproject.toml` file - whether adding, updating, or removing dependencies - you can synchronize the project with:

```sh
uv sync
```

You might have also noticed a `uv.lock` file in your project. This file keeps track of all package references and metadata, ensuring reproducibility. You **should not** edit it manually - `uv` manages it for you.

Speaking of dependencies, `uv` provides a really handy command to visualize them:

```sh
uv tree
```

This command displays a complete dependency tree, including all nested dependencies:

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


You can also add [extra dependencies](https://packaging.python.org/en/latest/tutorials/installing-packages/#installing-extras) that won't be installed by default. This is useful when a package is only needed for specific functionality, keeping the environment lean.

For example, to add `dlt` as an optional dependency under the `ingestion` group:

```sh
uv add dlt --optional ingestion
```

This will create the following section in `pyproject.toml`:

```toml
[project.optional-dependencies]
ingestion = [
    "dlt>=1.6.1",
]
```

Following the same logic, we can also include _development dependencies_, such as linters or formatters, that don’t need to be installed in production:

```sh
uv add ruff --dev
```

`uv` organizes these dependencies under the `[tool.uv]` section:

```toml
[tool.uv]
dev-dependencies = [
    "ruff>=0.9.6",
]
```

Finally, we can run the _Hello World_ script that comes with `uv init`:

```sh
uv run hello.py
```

This executes the script within the managed environment - no need to manually activate the virtual environment.

## Working with `uv` workspaces

First, navigate to the root project folder and initialize a new `uv` project inside it:

```sh
cd lakeground
uv init component
```

You’ll see an output similar to:

```log
Adding `component` as member of workspace `../lakeground`
Initialized project `component` at `../lakeground/component`
```

Inside the `component` directory, `uv` has scaffolded a new project with its own `pyproject.toml` file:

```toml
[project]
name = "component"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.13"
dependencies = []
```

Meanwhile, in the root `pyproject.toml`, `uv` has automatically registered this new package as a _workspace member_:

```toml
[tool.uv.workspace]
members = ["component"]
```

Now, let’s add a dependency inside the `component` project:

```sh
cd component
uv add polars
```

This adds `polars` to the `dependencies` section of the component `pyproject.toml` file:

```toml
dependencies = [
    "polars>=1.22.0",
]
```

However, nothing changes in the root `pyproject.toml`. If we check the workspace dependency tree:

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

But wait - there’s no `uv.lock` file inside the component directory, so where does `uv` store its dependencies?

If you check the root `uv.lock` file, you’ll see that `polars` has been added there, as part of the parent project. The component project also _shares the same virtual environment_ as the root project, meaning all dependencies are managed in a single place.

This setup is incredibly efficient. Each subproject can define its own dependencies without running into version conflicts, since `uv` ensures compatibility across the workspace. Instead of juggling multiple lockfiles, everything stays in sync under one, making dependency resolution seamless. And because the virtual environment is shared, switching between components feels effortless - no need to constantly reactivate environments or worry about mismatched package versions.

---
## What’s Next?  

The foundation is set, and now it’s time to start _filling the Lake_ - not with water, but with data. That’s where [dlt](https://dlthub.com/) comes in. This lightweight ingestion library will help us pull data from APIs and other sources straight into our [[00-concept-and-motivation|Lakeground]], setting the stage for everything that comes next.

In the next article, I’ll walk through setting up an ingestion pipeline, loading the first datasets, and making sure our [[00-concept-and-motivation|Lakeground]] is ready to handle real-world data.

---  

`uv` feels great, right? To be honest, I don’t have much experience with it in production yet, but I’m already loving how simple (and _violently fast_) it is to set up a project. It’s one of those tools that just *clicks*, and I can see why it’s starting to gain traction in the Python community.  You’ll probably be hearing a lot more about `uv` in the near future. Have you worked with it before? I’d love to hear about your experience!