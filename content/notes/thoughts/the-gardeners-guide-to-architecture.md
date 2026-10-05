---
title: The Gardener's Guide to Architecture
date: 2025-07-20
draft: false
tags:
  - notes
  - thoughts
  - engineering
---
---

Engineers love blueprints. We love diagrams, design docs, epics broken down into tickets, and plans for how every component will interact before the first line of code is written. Planning gives us the illusion of certainty, and sometimes actual certainty. We've been trained to architect solutions like we're building suspension bridges: carefully, deliberately, with no room for surprises. But here's the quiet truth: not every problem deserves that level of foresight. Sometimes the best solution starts with a seed instead of a blueprint.

---

<p align="center">
  <img src="tree.png" alt="A technical drawing for an unplannable process." width="85%">
</p><p align="center" style="font-size: 0.9em; color: gray;">A technical drawing for an unplannable process.</p>

---

Author [George R.R. Martin](https://georgerrmartin.com/), of *Game of Thrones* fame, [once described two types of writers](https://youtu.be/EBOafgYJABA?t=160): architects and gardeners. Architects plan everything ahead of time. They know the shape of the final product before they begin. Gardeners plant a seed and see what grows. They don't always know what the final structure will look like until they've lived with it for a while.

Lately, I've been thinking about how often this same split applies to engineering. There are times when it makes sense to fully design the system up front: the constraints are clear, the interfaces well understood, and the cost of a mistake is high. In those moments, channeling your inner architect is critical.

But there's a whole category of engineering work where that breaks down. Sometimes you don't yet understand the problem space. Sometimes you don't have enough user input, or the requirements are more suggestion than specification. Or maybe the system you're working on is so old, and so held together with duct tape, that planning it out in advance feels like drawing blueprints for a haunted house. In those cases, gardening might be the only strategy that works.

When you garden a solution, you start small and build just enough to learn something. Early insights shape the next step. The building is part of the planning. You uncover constraints that no one thought to mention. You trip over edge cases in practice instead of theorizing them. You grow something useful through iteration, not prescription.

Gardening often feels uncomfortable in engineering cultures that worship at the altar of the *proper plan.* But too much planning can backfire. We've all seen projects that died under the weight of their own architecture: beautiful diagrams that never shipped, or platforms so generic and extensible that nobody actually wanted to use them. That's the risk of forcing an architect's approach where a gardener's mindset would've done better. You end up building a temple for a religion no one follows.

Gardening still takes discipline, the kind that fits ambiguous or fast-changing work. Prototyping is gardening. Spiking to explore an idea is gardening. Starting with the simplest thing that could possibly work and seeing how far it can take you? Definitely gardening.

For data engineers, this often shows up as small, fast iterations. Prototyping a new streaming use case with limited access to real-time data? That's a gardener move. Trying to wrangle a third-party data source with undocumented edge cases and missing fields? You'll probably discover more by digging in than by diagramming your way around it.

Some work demands an architect's mindset. Designing a data pipeline that feeds financial reports? That's an architect job. Rolling out schema changes across multiple ingestion sources? Please, for everyone's sanity, plan it.

Knowing which mode fits is the whole skill. Some projects need careful integration and predictable structure from day one. Just as many benefit from starting rough, learning fast, and refactoring your way to clarity. The best solutions I've seen didn't arrive fully formed. They evolved through exploration. They weren't planned into existence; they were grown.

---

Most meaningful engineering work falls between the two extremes. We plan enough to avoid chaos and leave space for discovery. Maybe you sketch a loose outline of where you think the system should go, but stay ready to redraw it. Maybe you design the scaffolding, but don't fill in all the rooms until you've walked through them. The trick is knowing what the problem in front of you is asking for, not picking a side forever.

So next time you're staring at a vague ticket, or someone asks you to "just figure out" how to connect some ancient pipeline to a bleeding-edge solution, ask yourself: is this something I can plan end to end, or should I plant something small, water it, and see where it grows?

Sometimes the best architecture starts with a bit of gardening.
