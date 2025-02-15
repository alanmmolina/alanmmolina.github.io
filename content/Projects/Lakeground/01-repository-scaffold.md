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

The foundation of [[00-concept-and-motivation|Lakeground]] is all about modularity without sacrificing cohesion. To achieve this, I’m structuring the project around a **monorepo-ish** design, where all components live under a single repository. At the same time, I want each major part to stay self-contained. That’s where `git` **submodules** come in—they let each component function as an independent repository while still being part of the larger whole. It might sound a bit unconventional (or just plain confusing) at first, but by the end of this article, I promise it’ll make a lot more sense.

---

## A Monorepo-ish Design?

A **monorepo** is a single repository that houses multiple related projects. This setup makes it easier to share code, ensure consistency, and manage dependencies between different parts of the stack. However, it also comes with challenges—keeping clear module boundaries, avoiding unnecessary coupling, and handling repository size over time.

On the other hand, a **multi-repo** approach splits projects into separate repositories, where each module or service is developed, versioned, and deployed independently. This structure offers flexibility, cleaner ownership, and a reduced risk of unintended dependencies. The downside? Coordinating changes across multiple repositories can be a pain, and maintaining visibility into the overall project state isn’t always straightforward.

So, technically, my approach isn’t a **monorepo**. While everything is linked within a central repository, each module exists as its own independent repository with its own versioning and lifecycle—making this a **multi-repo** design at its core. My goal is to get the best of both worlds: the visibility and cohesion of a **monorepo** while keeping the flexibility of a **multi-repo** approach.

That’s why I’m structuring the project around a **core-repo**—a _single entry point_ that tracks all modules without centralizing development. Each module is housed in its own repository and functions as an independent **component**, but everything is still connected within the core structure. This setup allows me to maintain modularity while keeping a high-level view of the entire system. It’s not exactly conventional, but that’s what makes it interesting.

> [!note] monorepos vs. multi-repos
> To be honest, I don’t believe in silver bullets—just in the right tool for the job. There’s a whole debate about **monorepos** vs. **multi-repos**, and my take is simple: _it depends_. The best approach varies based on the solution being built, the company structure, and even the team’s maturity level.
> 
> In my case, everything is experimental. I want to see how this setup influences the coupling between different parts of the data stack. Maybe it works perfectly, maybe I’ll regret it in a few weeks—but that’s the fun of it.
> 
> If you’re curious about **monorepos** and want to dive deeper, [this site](https://monorepo.tools/) is an amazing resource. For a great breakdown of the differences, pros/cons between **monorepo** and **multi-repo** approaches, I highly recommend [this article](https://www.thoughtworks.com/insights/blog/agile-engineering-practices/monorepo-vs-multirepo).

---

## Why Submodules?

The first time I saw a GitHub repo where a folder was actually a link to another repository, I was fascinated. It felt awesome—having a single central repository while keeping multiple projects independent but connected. With `git` **submodules**, each component of [[00-concept-and-motivation|Lakeground]] remains its own separate repository, meaning I can version and manage them independently while still linking them back to the main structure.

**Submodules** allow me to develop a component in isolation and then seamlessly integrate it into the broader project. This approach keeps things clean and avoids the typical downsides of a massive monolithic repository where everything is tangled together.

### Working with Submodules

To add a **submodule**:

```sh
git submodule add REPO_URL PATH
```

For example, if we want to add a repository for the ingestion module under `component`, the command looks like this:

```sh
git submodule add https://github.com/alanmmolina/lakeground-component.git component
```

Cloning a repository with **submodules** requires an extra step. Instead of a regular `git clone`, we initialize and update **submodules** with:

```sh
git clone --recurse-submodules REPO_URL
```

Or, if we forgot to do that when cloning, we can initialize them later:

```sh
git submodule update --init --recursive
```

Each **submodule** is treated as an independent repository, so changes inside it won’t automatically reflect in the main repository. To update a **submodule** to its latest version, we navigate inside it and pull the latest changes:

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

When working with **submodules**, `git` needs a way to track their locations and source repositories. That’s where the `.gitmodules` file comes in. This file lives at the root of the main repository and keeps a record of every **submodule** we’ve added. 

A typical `.gitmodules` file looks like this:  

```ini
[submodule "component"]
    path = component
    url = https://github.com/alanmmolina/lakeground-component.git
``` 

Each section corresponds to a **submodule** and contains its name, the path where it lives inside the main repository, and the external repository URL from which it is fetched. This file ensures that whenever someone clones the repository, they know where each **submodule** comes from.

> [!tip] Managing `git` the easy way
> As much as I appreciate the power of the command line, I have to admit—I’m a bit lazy. I prefer working with `git` through **VSCode**, where I can visualize changes, manage branches, and switch between **submodules** effortlessly. The `git` panel in VS Code makes it easy to see which files have changed, stage updates, and resolve conflicts in a much more intuitive way than dealing with raw commands. 
> 
> For **submodules**, VSCode’s interface allows me to open them as separate repositories, making it simple to commit changes to a specific module without affecting the main repo. This workflow keeps everything neat and helps me stay focused on the code rather than on `git` mechanics.
> 
> If you want to learn more about it, you can find plenty of information [here](https://code.visualstudio.com/docs/sourcecontrol/overview)

---
## What’s Next?

With the **core-repo** and **components** design in place, the next challenge is managing Python environments efficiently across all these components. That’s where [uv](https://docs.astral.sh/uv/) comes in. It offers a _workspace_ feature that aligns perfectly with this modular structure, allowing me to maintain separate dependencies for each submodule while keeping everything under one roof.

In the next post, I’ll dive into **uv** and how it fits into the [[00-concept-and-motivation|Lakeground]] ecosystem.

---

The goal of this setup is to keep the project structured, flexible, and scalable. Whether I’m tweaking an ingestion pipeline or refining data storage, I can do so in isolation without disrupting the entire system. It’s still early, and I’m sure there will be plenty of lessons along the way—but I’m excited to see how it all unfolds.

If you're working with **monorepos**, **multi-repos**, or **submodules**, or if you have a different approach to structuring multi-component projects, I’d love to hear your thoughts!