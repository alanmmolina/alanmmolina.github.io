---
title: Building on SOLID Ground
date: 2026-01-22
draft: false
tags:
  - projects
  - standalone
  - software-engineering
  - python
---
---
A few weeks ago I came across [this](https://www.youtube.com/watch?v=uxwjXLjJOoM) great [Arjan Egges](https://www.arjancodes.com/) video about `SOLID` principles in Python, and it inspired me to build a small project around them. Some of these principles weren't totally clear to me before, and working through them hands-on turned out to be the best way to make them stick. There's a tendency to dismiss `SOLID` as a relic from an older era, but the underlying ideas are as relevant as ever. In this project I'm exploring each principle through practical examples and real world analogies.

---

First things first: I'm not the clean code purist who blocks a PR because a function has more than five lines. Please, don't think the idea of this project is to enforce universal (and rigid) rules around software design and architecture. I actually think every company has its own ecosystem, culture, and constraints, and blindly applying any set of rules tends to create more problems than it solves. Part of the engineering work is reading the environment and deciding what actually makes sense.

That said, let's talk about the core wisdom behind the `SOLID` principles. They were introduced in the context of object-oriented programming, but the underlying ideas apply much more broadly. In Data Engineering, when we're not running transformations in something like `dbt`, we're often building pipelines by hand. The same goes for Data Platforms, where systems need to evolve with changing requirements without collapsing. Having `SOLID` as a compass, not a rulebook, can help us design things that stay maintainable as they grow.

> [!abstract] SOLID
> The acronym `SOLID` was coined by **Michael Feathers** around 2004, but the principles themselves came from **Robert C. Martin**'s work a few years earlier. Martin didn't invent all of them from scratch. He collected and refined ideas that had been floating around the object-oriented community for decades, drawing on contributions from **Barbara Liskov**, **Bertrand Meyer**, and others. What he did was package them into a coherent set of guidelines that could be taught and applied together. The result is a framework that's been battle-tested across countless codebases and remains surprisingly relevant even outside traditional object-oriented contexts.

I might not be perfectly accurate in every definition, but I'm prioritizing practical understanding over textbook correctness. To make the ideas concrete, I'll use a toy car factory as a running analogy. If you've built data pipelines before, the mental model should feel familiar: products move through stations, each station does one thing and passes the result forward, and the whole line produces something useful at the end.

Before diving into each principle, let's set up the domain. Each car toy has a SKU and a color, and tracks its assembly state along with any defects discovered during production. Once it passes inspection, it goes into a box with documentation and a shipping label. We'll use Pydantic to model these entities since schemas and validation are already second nature to Data Engineers.

```python
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Carrier = Literal["FASTSHIP", "REGULARSHIP", "SLOWSHIP"]


class Car(BaseModel):
    """A toy car moving through the assembly line."""
    model_config = ConfigDict(extra="forbid")

    sku: str = Field(min_length=1)
    color: str = Field(min_length=1)
    chassis_built: bool = False
    painted: bool = False
    wheels_attached: bool = False
    defects: list[str] = Field(default_factory=list)


class Box(BaseModel):
    """A box containing a finished car ready for shipping."""
    model_config = ConfigDict(extra="forbid")

    car: Car
    insert: str = "Safety + warranty info"
    label: str | None = None
```

---

## Single Responsibility Principle

**Robert C. Martin** introduced the **Single Responsibility Principle** in his 2000 paper, he framed it around a simple question: *how many reasons does this code have to change?* I think the common interpretation of "a class (or component) should do only one thing" misses the point. The real insight is about change pressure. When multiple unrelated concerns live in the same place, a change to one of them risks breaking the others.

> [!info] Robert C. Martin aka "Uncle Bob"
> **Robert C. Martin** is a software engineer and author who has shaped how we think about code quality and design. He began programming in the 1970s and went on to co-author the *Agile Manifesto* in 2001. His books, including *Clean Code* and *Clean Architecture*, have become standard reading for developers.

Think about it in terms of our toy factory. The chassis station builds the frame. The paint booth applies color. The wheel station attaches the wheels. The inspector checks for defects. The packaging crew boxes everything up, and the labeling station slaps on a shipping label. Each station owns one concern, and that separation is what makes the whole line manageable.

Now imagine cramming all of that into a single mega-station. The person running it needs to understand wheel torque, paint chemistry, defect criteria, and box dimensions. When the paint formula changes, they risk breaking the chassis logic. When the labeling printer jams (like printers always do), fixing it might fry a motor. This is exactly what happens in software when unrelated concerns are bundled into the same component: every change becomes a high-risk deployment.

<p align="center">
  <img src="single-responsibility-principle.svg" alt="Single Responsibility Principle" width="100%">
</p><p align="center" style="font-size: 0.9em; color: gray;">A single station doing all operations vs multiple stations, each handling a specific part of the pipeline.</p>

> [!failure] The mega-station
> ```python
> class MegaLine:
>     def run(self, sku: str, color: str) -> Box:
>         car = Car(sku=sku, color=color)
>
>         # chassis
>         car.chassis_built = True
>
>         # paint
>         if car.color not in {"red", "green", "blue"}:
>             car.defects.append("unsupported_color")
>         car.painted = True
>
>         # wheels
>         car.wheels_attached = True
>
>         # inspection
>         if not car.chassis_built or not car.painted or not car.wheels_attached:
>             car.defects.append("incomplete_assembly")
>         if car.defects:
>             raise ValueError(f"Rejected: {car.defects}")
>
>         # packaging + labeling
>         box = Box(car=car)
>         carrier = "FASTSHIP" if sku.startswith("PRO") else "REGULARSHIP"
>         box.label = f"{carrier}:{sku}:{color}"
>         return box
> ```

> [!success] Separated stations
> ```python
> from abc import ABC, abstractmethod
>
>
> class CarStation(ABC):
>     """Base class for stations that process cars."""
>     @abstractmethod
>     def process(self, car: Car) -> Car: ...
>
>
> class BoxStation(ABC):
>     """Base class for stations that process boxes."""
>     @abstractmethod
>     def process(self, box: Box) -> Box: ...
>
>
> class ChassisStation(CarStation):
>     """Builds the car frame."""
>     def process(self, car: Car) -> Car:
>         car.chassis_built = True
>         return car
>
>
> class PaintStation(CarStation):
>     """Paints the chassis using one of the supported colors."""
>     ALLOWED_COLORS = {"red", "green", "blue"}
>     def process(self, car: Car) -> Car:
>         if car.color not in self.ALLOWED_COLORS:
>             car.defects.append("unsupported_color")
>         car.painted = True
>         return car
>
>
> class WheelStation(CarStation):
>     """Attaches wheels to the chassis."""
>     def process(self, car: Car) -> Car:
>         car.wheels_attached = True
>         return car
>
>
> class InspectionStation(CarStation):
>     """Inspects cars and rejects those with defects."""
>     def process(self, car: Car) -> Car:
>         if not car.chassis_built or not car.painted or not car.wheels_attached:
>             car.defects.append("incomplete_assembly")
>         if car.defects:
>             raise ValueError(f"Rejected: {car.defects}")
>         return car
>
>
> class PackagingStation:
>     """Transition station that places a finished car into a box."""
>     def process(self, car: Car) -> Box:
>         return Box(car=car)
>
>
> class LabelStation(BoxStation):
>     """Applies a shipping label to the box."""
>     def process(self, box: Box) -> Box:
>         carrier = "FASTSHIP" if box.car.sku.startswith("PRO") else "REGULARSHIP"
>         box.label = f"{carrier}:{box.car.sku}:{box.car.color}"
>         return box
> ```

Now each station can evolve independently. A new paint color only touches `PaintStation`, a chassis redesign stays in `ChassisStation`, and complex shipping logic gets absorbed by `LabelStation` without rippling through the rest of the pipeline. Each component has exactly one reason to change. Forget the dogma about tiny classes or five-line functions. The real goal is organizing code so that unrelated changes don't step on each other.

---

## Open/Closed Principle

**Bertrand Meyer** articulated this idea back in the 1980s, and it became a cornerstone of how we think about extensible systems. The intuition is straightforward: once code is working and tested, you shouldn't need to crack it open every time requirements evolve. Instead, you design the system so new capabilities can be plugged in without surgery on existing components.

> [!info] Bertrand Meyer
> **Bertrand Meyer** is a French computer scientist who created the Eiffel programming language and pioneered *Design by Contract*. His 1988 book *Object-Oriented Software Construction* introduced the Open/Closed Principle and influenced a generation of software engineers thinking about reliability and correctness.

Back to our factory floor. Suppose the business wants to offer expedited shipping for premium SKUs. Then they add an economy tier. Then a holiday special. If your shipping logic lives in a single function full of conditionals, each new tier means editing that function, retesting everything, and praying nothing broke. But if the system is designed around pluggable rules, adding a new tier is just dropping in a new rule object. The core routing logic never changes.

<p align="center">
  <img src="open-closed-principle.svg" alt="Open/Closed Principle" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray;">A bolted panel with fixed buttons vs a modular cabinet with swappable cartridges.</p>

> [!failure] Conditional branching
> ```python
> def choose_carrier(sku: str) -> Carrier:
>   if sku.startswith("PRO"):
>       return "FASTSHIP"
>   if sku.startswith("ECO"):
>       return "SLOWSHIP"
>   return "REGULARSHIP"
> ```

> [!success] Pluggable rules
> ```python
> from abc import ABC, abstractmethod
>
>
> class CarrierRule(ABC):
>     """Base class for carrier selection rules."""
>     @abstractmethod
>     def matches(self, sku: str) -> bool: ...
>
>     @abstractmethod
>     def carrier(self) -> Carrier: ...
>
>
> class ProCarrierRule(CarrierRule):
>     """Selects fast shipping for premium SKUs."""
>     def matches(self, sku: str) -> bool:
>         return sku.startswith("PRO")
>
>     def carrier(self) -> Carrier:
>         return "FASTSHIP"
>
>
> class EcoCarrierRule(CarrierRule):
>     """Selects slow shipping for economy SKUs."""
>     def matches(self, sku: str) -> bool:
>         return sku.startswith("ECO")
>
>     def carrier(self) -> Carrier:
>         return "SLOWSHIP"
>
>
> class DefaultCarrierRule(CarrierRule):
>     """Fallback rule that matches any SKU."""
>     def matches(self, sku: str) -> bool:
>         return True
>
>     def carrier(self) -> Carrier:
>         return "REGULARSHIP"
>
>
> def choose_carrier(sku: str, rules: list[CarrierRule]) -> Carrier:
>     """Iterates through rules and returns the first matching carrier."""
>     for rule in rules:
>         if rule.matches(sku):
>             return rule.carrier()
>     raise RuntimeError("No carrier rule matched")
> ```

The conditional version grows with every new carrier tier: more branches, more test cases, more risk of regression. The refactored version treats carrier selection as a chain of rule objects. Adding a holiday express tier is now just a matter of writing a `HolidayCarrierRule` class and dropping it into the list. The `choose_carrier` function stays untouched while the system gains new capabilities. No need to dig through conditionals and no risk of breaking existing logic. The code is open for extension but closed for modification.

---

## Liskov Substitution Principle

**Barbara Liskov** gave us this principle in 1987, and while the formal definition involves substitutability of types, the practical takeaway is about honoring promises. When a component advertises a certain behavior through its interface, every implementation of that interface must deliver on that promise. If callers need to check which specific subtype they're dealing with before calling a method, the abstraction has failed.

> [!info] Barbara Liskov
> **Barbara Liskov** is an American computer scientist who won the Turing Award in 2008 for her contributions to programming language design and software engineering. She developed the notion of data abstraction and co-created the CLU programming language in the 1970s. The substitution principle that carries her name emerged from her work on behavioral subtyping.

In our factory, every station along the line makes implicit promises to the next station. The assembly station promises to hand off a car. The paint station promises to return a car (possibly with defects noted). If any station along the way suddenly returns nothing, or returns something unexpected, the downstream stations break in confusing ways.

<p align="center">
  <img src="liskov-substitution-principle.svg" alt="Liskov Substitution Principle" width="100%">
</p><p align="center" style="font-size: 0.9em; color: gray;">A station with no guardrails on inputs or outputs vs one with modules ensuring well-defined contracts.</p>

> [!failure] Broken contract
> ```python
> class ScrapIfDefective:
>     def process(self, car: Car) -> Car:
>         if car.defects:
>             return None  # the promise was to return a Car
>         return car
> ```

> [!success] Explicit result type
> ```python
> class CarResult(BaseModel):
>     """Wraps a car with success/failure status."""
>     model_config = ConfigDict(extra="forbid")
>
>     ok: bool
>     car: Car | None = None
>     reason: str | None = None
>
>
> class CarStationV2(ABC):
>     """Base class for stations that may reject cars."""
>     @abstractmethod
>     def process(self, car: Car) -> CarResult: ...
>
>
> class ScrapIfDefectiveV2(CarStationV2):
>     """Scraps cars with defects instead of passing them through."""
>     def process(self, car: Car) -> CarResult:
>         if car.defects:
>             return CarResult(ok=False, reason="scrapped_due_to_defects")
>         return CarResult(ok=True, car=car)
> ```

The first version breaks its promise: the type signature says `Car`, but sometimes it returns `None`. Downstream code that trusts the signature will crash. The fix makes the contract explicit about the possibility of rejection. Every implementation now returns a `CarResult`, and callers know to check the `ok` field before proceeding. We didn't remove the possibility of rejection, we made it part of the type system. When the next station receives a `CarResult`, it can branch on the outcome deliberately rather than discovering a `None` where it expected a car.

---

## Interface Segregation Principle

**Uncle Bob** included this one in `SOLID` to address a common problem: interfaces that try to be everything to everyone end up being convenient for no one. When a class must implement methods it doesn't need, you get placeholder implementations, ignored parameters, and code that's harder to reason about. The principle pushes back on the temptation to create one big interface that covers all possible behaviors.

Picture the factory control panel again. If every station had to implement controls for chassis building, wheel attachment, paint mixing, defect logging, box folding, and label printing, you'd have a mess. The paint booth operator stares at a wheel torque dial that does nothing, the labeling station has a paint viscosity gauge nobody touches, and sooner or later someone tweaks the wrong knob. The fix is obvious: each station gets only the controls it needs.

<p align="center">
  <img src="interface-segregation-principle.svg" alt="Interface Segregation Principle" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray;">A bloated panel with unnecessary buttons and indicators vs a focused interface tailored to the station's needs.</p>

> [!failure] Bloated interface
> ```python
> from abc import ABC, abstractmethod
>
>
> class FactoryStation(ABC):
>     @abstractmethod
>     def process_car(self, car: Car) -> Car: ...
>
>     @abstractmethod
>     def process_box(self, box: Box) -> Box: ...
>
>     @abstractmethod
>     def calibrate(self) -> None: ...
>
>     @abstractmethod
>     def emit_metrics(self) -> dict[str, float]: ...
> ```

> [!success] Focused interfaces
> ```python
> from abc import ABC, abstractmethod
>
>
> class CarStation(ABC):
>     """Base class for stations that process cars."""
>     @abstractmethod
>     def process(self, car: Car) -> Car: ...
>
>
> class BoxStation(ABC):
>     """Base class for stations that process boxes."""
>     @abstractmethod
>     def process(self, box: Box) -> Box: ...
> ```

With the bloated interface, a station that only handles cars still needs to implement `process_box`, `calibrate`, and `emit_metrics` even if those methods do nothing meaningful. The focused version splits responsibilities: a car-processing station implements `CarStation`, a box-processing station implements `BoxStation`, and if something needs to emit metrics, that's a separate interface entirely. No dead methods or placeholder implementations. Components depend only on what they use.

---

## Dependency Inversion Principle

This is by far my favorite principle in `SOLID`. The core insight is that high-level business logic shouldn't be tightly coupled to low-level implementation details. Both should depend on abstractions that live between them, so swapping infrastructure is just a matter of plugging in a different implementation.

When your code directly instantiates a database client, an HTTP client, or a file writer, the business logic ends up knowing about connection strings, retry policies, and serialization formats. Testing requires spinning up real infrastructure or mocking internals you shouldn't care about. Migrating to a different vendor means hunting through the codebase for every place that touches the old one.

Our factory doesn't hardwire itself to a specific brand of defect-logging database. It defines what defect storage looks like as an interface, and the actual storage mechanism, whether that's `SQLite` today or a cloud service tomorrow, plugs into that interface.

<p align="center">
  <img src="dependency-inversion-principle.svg" alt="Dependency Inversion Principle" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray;">A station with an internally welded database module vs one with a pluggable interface for external modules.</p>

> [!failure] Hardcoded dependency
> ```python
> class SqliteDefectStore:
>     def save(self, sku: str, defects: list[str]) -> None:
>         ...
>
>
> class InspectionStationHardcoded:
>     def __init__(self) -> None:
>         self.store = SqliteDefectStore()
>
>     def process(self, car: Car) -> Car:
>         if car.defects:
>             self.store.save(car.sku, car.defects)
>             raise ValueError(f"Rejected: {car.defects}")
>         return car
> ```

> [!success] Injected abstraction
> ```python
> from abc import ABC, abstractmethod
>
>
> class DefectStore(ABC):
>     """Interface for persisting defect records."""
>     @abstractmethod
>     def save(self, sku: str, defects: list[str]) -> None: ...
>
>
> class InspectionStation:
>     """Inspects cars and logs defects to an injected store."""
>     def __init__(self, store: DefectStore) -> None:
>         self.store = store
>
>     def process(self, car: Car) -> Car:
>         if car.defects:
>             self.store.save(car.sku, car.defects)
>             raise ValueError(f"Rejected: {car.defects}")
>         return car
> ```

The hardcoded version creates its own `SqliteDefectStore` internally, so testing requires a real `SQLite` database or monkey-patching, and switching to PostgreSQL means cracking open the class. The inverted version receives its storage dependency from outside: a fake store for tests, the real database client in production. The station doesn't know (or care) which one it's using, only that it conforms to the `DefectStore` interface. That's the inversion. High-level logic depends on an abstraction it defines, and low-level infrastructure adapts to fit.

> [!question] Dependency Inversion vs Dependency Injection
> These terms get conflated all the time, but they're different things. **Dependency Inversion** is a design principle: depend on abstractions, not concrete implementations. **Dependency Injection** is a technique for achieving that: pass dependencies in from outside rather than creating them internally. **Injection** is one way to implement **Inversion**, but the principle stands on its own regardless of how you wire things up.

---

Here's a small runner that connects all the stations into a working pipeline.

```python
def run_line(sku: str, color: str, defect_store: DefectStore) -> Box:
    car = Car(sku=sku, color=color)

    car = ChassisStation().process(car)
    car = PaintStation().process(car)
    car = WheelStation().process(car)
    car = InspectionStation(defect_store).process(car)

    box = PackagingStation().process(car)
    box = LabelStation().process(box)
    return box
```

Each station focuses on one concern, new behaviors arrive as new components rather than edits to existing ones, every station delivers what its interface promises, interfaces stay small and purposeful, and dependencies flow through abstractions. The five principles reinforce each other in ways that only become obvious once you start applying them together.

---

## ... My Final Thoughts

This tiny project was exactly what I needed to make these principles stick. Reading about `SOLID` is one thing, but actually writing the code, drawing the station diagrams, and stretching the factory analogy until it broke helped me understand the ideas in a way that articles and videos never could. I tried to focus on the core wisdom behind each principle rather than just the patterns.

My final takeaway about applying `SOLID` in real projects is simply "it depends." I would never use these principles as a checklist to enforce across a codebase. Whether the abstractions and indirection make sense depends on the project, the company culture, the team's experience, and the constraints you're operating under.

To be honest, I think:

> [!failure] this is not a wrong way to do it

> [!success] this is not the right way to do it

These are different approaches to the same problems, each with its own trade-offs. The context determines which one fits better. The code examples throughout this article show clearly that applying these principles adds indirection and abstraction, and that complexity only pays off when the system actually needs the flexibility. The goal is maintainability and adaptability, not architectural elegance for its own sake.

This is engineering, not a religion.
