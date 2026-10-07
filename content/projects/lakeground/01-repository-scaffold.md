---
title: Repository Scaffold
date: 2025-02-08
draft: false
tags:
  - projects
  - lakeground
  - data-engineering
  - git
---
---

[[projects/lakeground/index|Lakeground]] needs modularity without losing cohesion. Every component lives under a single repository, and each major part stays self-contained. `git` **submodules** make that possible: each component functions as an independent repository while still belonging to the larger whole. Unconventional, and honestly a bit confusing at first.

---

## A Monorepo-ish Design?

A **monorepo** is a single repository holding several related projects. Sharing code gets easier and dependencies between parts of the stack stay visible. So does coupling. Boundaries blur, and repository size becomes its own problem over time.

A **multi-repo** approach splits projects into separate repositories. Each module or service is developed, versioned, and deployed on its own, which keeps ownership clean and accidental dependencies rare. Coordinating a change that spans repositories is the painful part, and the overall project state is harder to see.

Technically, what I'm building isn't a **monorepo**. Everything links into a central repository, but each module is its own repository with its own versioning and lifecycle, which makes this a **multi-repo** design at its core. The aim is the visibility and cohesion of a **monorepo** with the flexibility of a **multi-repo**.

That's why the project is built around a **core-repo**, a _single entry point_ that tracks all modules without centralizing development. Each module lives in its own repository and works as an independent **component**, and the core structure still ties them together. Modularity on one side, a high-level view of the whole system on the other. Unconventional, which is part of the point.

> [!note] monorepos vs. multi-repos
> I don't believe in silver bullets, only in the right tool for the job. The debate about **monorepos** vs. **multi-repos** is loud, and my take is simple: _it depends_. The best approach varies with the solution being built, the company structure, and the team's maturity level.
>
> In my case, everything is experimental. I want to see how this setup influences the coupling between different parts of the data stack. Maybe it works perfectly, maybe I'll regret it in a few weeks. Either way I'll learn something.
>
> [monorepo.tools](https://monorepo.tools/) maps the territory well, and [this article](https://www.thoughtworks.com/insights/blog/agile-engineering-practices/monorepo-vs-multirepo) breaks down the differences, pros and cons between **monorepo** and **multi-repo** approaches.

---

## Why Submodules?

The first time I saw a **GitHub** repo where a folder was actually a link to another repository, I was fascinated. One central repository, several projects independent but connected. With `git` **submodules**, each component of [[projects/lakeground/index|Lakeground]] stays its own repository, so I can version and manage it separately while still linking it back to the main structure.

**Submodules** let me develop a component in isolation and then integrate it into the broader project. Things stay clean instead of collapsing into a monolithic repository where everything is tangled together.

### Working with Submodules

To add a **submodule**:

```sh
git submodule add REPO_URL PATH
```

For example, to add a repository for the ingestion module under `component`:

```sh
git submodule add https://github.com/alanmmolina/lakeground-component.git component
```

Cloning a repository with **submodules** takes an extra step. Instead of a plain `git clone`, initialize and update them as part of the clone:

```sh
git clone --recurse-submodules REPO_URL
```

Or, if we forgot to do that when cloning, we can initialize them later:

```sh
git submodule update --init --recursive
```

Each **submodule** is its own repository, so changes inside it do not show up in the main repository automatically. To update a **submodule** to its latest version, we navigate inside it and pull the latest changes:

```sh
cd component
git pull origin main
cd -
```

Then, back in the main repo, we commit the updated reference:

```sh
git add component
git commit -m "update component"
```

When working with **submodules**, `git` needs to track their locations and source repositories. The `.gitmodules` file does that. It lives at the root of the main repository and keeps a record of every **submodule** we've added.

A typical `.gitmodules` file:  

```ini
[submodule "component"]
    path = component
    url = https://github.com/alanmmolina/lakeground-component.git
``` 

Each section names a **submodule** and records the path where it lives inside the main repository plus the external repository URL it is fetched from. Anyone who clones the repository can see where each **submodule** came from.

> [!tip] Managing `git` the easy way
> As much as I appreciate the command line, I have to admit I'm a bit lazy. I prefer working with `git` through **VS Code**, where I can visualize changes, manage branches, and switch between **submodules** without thinking about it. The `git` panel shows which files changed, stages updates, and resolves conflicts in a way raw commands never do for me. 
> 
> For **submodules**, **VS Code** opens each one as its own repository, so committing to a specific module does not touch the main repo. Everything stays neat and I keep my attention on the code rather than on `git` mechanics.
> 
> More on that in the [source control docs](https://code.visualstudio.com/docs/sourcecontrol/overview).

---
## What's Next?

With the **core-repo** and **components** design in place, the next challenge is managing Python environments across all these components. [uv](https://docs.astral.sh/uv/) has a _workspace_ feature that fits this modular structure: separate dependencies for each submodule, everything in one place.

The next post covers **uv** and how it fits into [[projects/lakeground/index|Lakeground]].

---

The point of this setup is isolation. Whether I'm tweaking an ingestion pipeline or refining data storage, I can do it without disrupting the rest of the system. It's early, and the lessons will come.

Each component moves on its own, and the core just remembers where they live.