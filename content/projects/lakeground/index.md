---
title: Lakeground
date: 2025-02-01
draft: false
tags:
  - projects
  - lakeground
  - data-engineering
  - python
---

**Lakeground** is a Data Lake and a _playground_ fused into one name, because building a fully open-source, end-to-end Data Engineering stack should leave room to experiment. Free tools, modular pieces, all of it built to come apart and go back together.

Think of it as a sandbox. You piece components together, break them apart, and see what happens, with something functional still standing at the end. Each part of the stack is its own standalone tool. It works alone, and it joins the others into a complete pipeline when you want the whole line running.  

The hard part is the balance. Components that stand alone tend to resist fitting together, and components built to fit together tend to lean on each other. That tension is the puzzle, and it will produce surprises.

What draws me to this is the open-source tooling itself. **Lakeground** is Python, and the stack covers the full data lifecycle: ingestion, schema management, metadata tracking, transformation, data delivery, and visualization.  

---

## Why Lakeground?  

Because Data Engineering is a craft, and crafts are learned by playing as well as by shipping. The job asks for scalability, robustness, and business answers. Experimenting for its own sake is where a lot of the real learning lands.  

**Lakeground** is where I do that. Ideas get tested, things break, and what works (and what does not) shows up in a low-pressure environment. Sharing it in the open means anyone can borrow the ideas, argue with them, or send a better tool my way.

---

## What's Next?  

Updates land as the work does, over the coming weeks and maybe months: design decisions, hands-on notes on the tools, and the missteps when they happen.  

A central repository on **GitHub** will hold a _monorepo_-inspired structure, but each component of **Lakeground** lives as its own directory and its own repository (a _submodule_). The pieces run independently and still add up to one stack. You can experiment with a single tool or workflow without standing up the whole pipeline first.

> [!faq] monorepo
> A monorepo (short for _monolithic repository_) is a single Git repository that houses the code for multiple projects or components.  Instead of separating each part of a system into its own repo, everything lives together, making it easier to share code, manage dependencies, and ensure consistency.  ^monorepo

> [!faq] submodule
> A Git submodule is a repository embedded within another repository. It allows you to manage multiple, independent projects while keeping them connected.

---

Everything lands in the open as it gets built, including the parts that do not work.

A lake you can play in.

---
