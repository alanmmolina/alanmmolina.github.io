---
title: Pydantic
date: 2026-02-21
draft: false
tags:
  - articles
  - tools
  - software-engineering
  - python
  - pydantic
---
---

Python's type hints were designed for static analysis, marking up code for IDEs without touching what actually runs. [Samuel Colvin](https://github.com/samuelcolvin) looked at that annotation syntax and asked a different question: why not use it at runtime too? The answer became [Pydantic](https://pydantic.dev/), and what started as a weekend experiment has since become one of the most downloaded Python packages in existence, sitting at the foundation of a significant portion of the ecosystem. These are my notes from tracing that path.

---

Python's philosophy of trusting developers has always been a bit of a double-edged sword. The language assumes you know what you're doing, stepping aside rather than forcing types or blocking execution when you pass an integer where a string was expected. This flexibility made Python approachable and powerful, letting developers move fast without fighting a compiler. But somewhere along the way, Python programs started needing to trust more than just the person writing them. They trust network APIs to return well-formed JSON, configuration files to contain valid syntax, Machine Learning models to receive properly structured training data, and even Large Language Models to generate structured responses.

The freedom to move quickly turned into an obligation to write defensive validation code everywhere. Codebases filled with `isinstance` checks and `try-except` blocks, business logic wrapped in layers of type verification. API endpoints needed manual type checking, configuration loaders required validation logic, data pipelines demanded schema enforcement. The same pattern, repeated everywhere. It's not that Python's design was flawed, this was just where the philosophy naturally led.

When Python 3.5 introduced type hints in 2015, it gave the language a formal way to express expected types. IDEs became smarter with autocomplete, static type checkers like [mypy](https://mypy.readthedocs.io/en/stable/index.html#) could catch bugs before runtime, and codebases gained self-documenting function signatures. The Python interpreter itself treated these annotations as optional metadata, deliberately ignoring them during execution. What's interesting is that pieces started moving into place for something more.

---

## A Type Safety Missing Piece

<p align="center" style="margin-bottom: 0;">
  <img src="pydantic-chess-board.png" alt="A chess board" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray; margin-top: 0;">A chess board. Every piece has a defined role and a fixed set of rules for how it can move.
</p>

Python 3.7 added another piece in 2018 with `dataclasses`, addressing a different pain point. The `@dataclass` decorator eliminated boilerplate by automatically generating `__init__`, `__repr__`, and comparison methods from type-annotated fields. Instead of writing 20 lines of initialization code, developers could declare a class structure and let Python handle the mechanics.

The same release cycle brought Python 3.8 with `TypedDict`, adding structure to dictionary-based data by letting you specify fixed keys and their types. Alongside it came `Protocols`, enabling a kind of structural typing where objects were checked based on what methods they had rather than what classes they inherited from. These features each tackled the problem from different angles: `dataclasses` for structured objects, `TypedDict` for dictionary schemas, and `Protocols` for behavior contracts. All built on the type hints foundation, giving static analyzers increasingly sophisticated ways to understand code structure.

But all of these solutions stopped at the same boundary: static analysis. When a JSON API returned an unexpected null, when a configuration file contained a typo, when user input arrived malformed, Python still accepted it all. The type annotations documented what should happen, but validating what actually happened remained manual work. Developers were still writing `isinstance` checks, still wrapping code in `try-except` blocks, still building custom validation logic for every API endpoint and configuration loader.

Someone just needed to look at these type annotations and ask: what if we actually used this information at runtime? What if we could transform those tedious `isinstance` chains into something more declarative, more resilient, something that felt natural to write and maintain? The community had built a vocabulary for describing data structure, but someone needed to figure out how to enforce it. It took someone with a very specific problem and a somewhat controversial idea to bridge that gap.

---

## The Minds Behind It

That someone was [Samuel Colvin](https://github.com/samuelcolvin), a mechanical engineer from Cambridge who'd taught himself programming while working on oil rigs for **Schlumberger**. By 2017, he was CTO of **TutorCruncher**, an EdTech platform in London, spending his days building APIs and validating user input. The validation code was everywhere. Every API endpoint needed type checks, every configuration loader required custom validation logic, every webhook handler wrapped business logic in layers of defensive programming. He'd write the types in one place as hints for `mypy` and his IDE, then write them again as validation code. It felt redundant.

The controversial part was deciding to use type hints for runtime validation. Type hints had been designed explicitly for static analysis, documentation for humans and tools like `mypy`. Using them to actually validate data at runtime was seen by some as overloading their purpose, potentially confusing. But Colvin had a simple counterargument: the information was already there, and if it improved developer experience, it was worth trying. He called himself a "professional pedant" and built a library that matched. [Pydantic](https://pydantic.dev/) shipped in May 2017 as a weekend experiment that combined type hints with runtime validation, automatic type coercion, and helpful error messages. The Python community would decide if it was useful.

Turns out, it was. But the explosive growth came from an unexpected place. In 2018, Colombian developer [Sebastián Ramírez](https://tiangolo.com/) was building [FastAPI](https://fastapi.tiangolo.com/), a modern web framework that needed robust data validation. He chose Pydantic as its validation layer, and when **FastAPI** took off, it brought Pydantic with it. Downloads went from thousands to millions per month. The combination of **FastAPI**'s speed and ergonomics with Pydantic's validation became a standard pattern across the Python ecosystem. Meanwhile, Colvin was still coordinating Pydantic's development largely solo while running **TutorCruncher**.

<p align="center" style="margin-bottom: 0;">
  <img src="pydantic-samuel-and-sebastian.svg" alt="Samuel Colvin and Sebastián Ramírez" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray; margin-top: 0;"> Samuel Colvin and Sebastián Ramírez. Photo via <strong style="color: gray;">@samuelcolvin</strong> on
  <a href="https://x.com/samuelcolvin/status/1593713112510873600" target="_blank" style="color: gray;">X</a>.
</p>

A turning point came in 2022. Pydantic was processing trillions of validations monthly across big companies, but it was still a solo project with zero revenue. Colvin faced a choice: let someone else take over, keep burning out, or build something sustainable. He chose the third path, forming **Pydantic Services Inc.** and raising venture capital to fund a Rust rewrite and hire a small team. Contributors like [David Hewitt](https://github.com/davidhewitt) (the lead maintainer of [PyO3](https://pyo3.rs/v0.28.2/)) and [Sydney Runkle](https://github.com/sydney-runkle) joined to rebuild the core and stabilize the community. The library stayed free, but now it had the resources to evolve into something bigger.

---

## Beyond the Library

That "something bigger" turned out to be a bet on an unconventional strategy. Most open source companies that raise venture capital follow a predictable path: build a popular library, then monetize it with enterprise features or a hosted version. Colvin went a different direction. He decided not to monetize Pydantic at all. Instead, as he put it directly, the company would "cash in on credibility," using Pydantic's brand as a gateway to solve adjacent problems that developers actually needed. The library became, essentially, a massive trust-building exercise and marketing funnel for products that did charge money.

<p align="center" style="margin-bottom: 0;">
  <img src="pydantic-star-history.svg" alt="Star History Chart" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray; margin-top: 0;">
  Pydantic GitHub repository star history via <a href="https://app.repohistory.com/star-history" target="_blank" style="color: gray;">repohistory.com</a>.
</p>

The first product was [Logfire](https://pydantic.dev/logfire), an observability platform launched in 2024. Traditional observability tools like [Datadog](https://www.datadoghq.com/) and [New Relic](https://newrelic.com) were powerful but notoriously complex to configure and expensive to run. **Logfire** aimed to be what [Vercel](https://vercel.com/) did for deployment, simple and opinionated with sensible defaults. The differentiator was letting developers write SQL directly against their telemetry data instead of learning proprietary query languages, and building native support for AI observability from day one. Tracing LLM calls, tracking token costs, debugging agent workflows, these became first-class features rather than afterthoughts. The timing was deliberate. By late 2024, every Python shop was integrating LLMs somewhere, and they all needed to understand what those models were actually doing.

Then came [Pydantic AI](https://pydantic.dev/pydantic-ai) and the AI [Gateway](https://pydantic.dev/ai-gateway), both arriving as the LLM wave was cresting. **Pydantic AI** positioned itself as an agent framework with the kind of developer experience Pydantic was known for, strict type safety, automatic validation of LLM outputs, and native **Logfire** instrumentation. The AI **Gateway** tackled infrastructure, offering unified API access across every major LLM provider with built-in cost controls and observability. Neither product tried to hide vendor differences or force everything into a generic schema. They embraced the diversity of the ecosystem while making it manageable. Both launched open source, continuing the pattern of building trust first and monetization second.

<p align="center" style="margin-bottom: 0;">
  <img src="pydantic-ecosystem.svg" alt="Pydantic ecosystem diagram" width="80%">
</p>

---

## The V2 Rewrite

The rewrite everyone kept mentioning actually started in 2022, before the company even had venture funding. Pydantic V1 was pure Python with some [Cython](https://github.com/cython/cython) optimizations, which worked well enough for years. But at the scale it had reached, performance mattered in ways that went beyond just user experience. Hewitt pointed out that making Pydantic faster would save a meaningful amount of energy. At that volume, a 10x speedup meant measurably less carbon emissions. The environmental argument alone was compelling, but there were other reasons too. The team had already tried optimizing V1 with `Cython`, and that path had run its course. Going faster meant a more fundamental change. The choice was Rust.

The technical case came down to architectural possibilities. Python's dynamic nature means every function call carries overhead, which adds up when you're building complex validation logic from smaller pieces. Rust flips this entirely, its compiler can inline and optimize away those boundaries, letting you compose validators freely without paying a performance penalty. They built `pydantic-core` as a separate Rust package, using `PyO3` to handle the Python integration. The new architecture, structured as a tree of specialized validators calling each other, managed to be both faster and cleaner than what came before. Benchmarks showed improvements between 5x and 50x depending on what you were validating, with most real-world cases landing somewhere around 17x.

The 16-month effort delivered more than just raw speed. Features that had been technically difficult in V1 became straightforward with the Rust foundation. Developers who wanted strict type checking without any coercion finally got it as a first-class option. Error messages started including URLs pointing to documentation for each error type. The team built [jiter](https://github.com/pydantic/jiter), their own JSON parser optimized for validation workflows and capable of handling incomplete JSON streams, which turned out to be surprisingly useful for LLM applications. Serialization became more explicit too, with clear modes that made the distinction between Python objects and JSON-compatible output obvious. Having that solid base meant building features rather than working around limitations.

---

## How It Works

Understanding Pydantic means understanding how its pieces fit together. The architecture organizes validation logic in ways that feel natural once you see the pattern.

### `BaseModel`

At the center sits `BaseModel`, the class everything inherits from. When you define a model with type-annotated fields, Pydantic analyzes that structure during class creation and builds an internal schema. Instantiation triggers validation automatically.

```python
from enum import Enum
from pydantic import BaseModel

class Color(str, Enum):
    WHITE = "white"
    BLACK = "black"

class Piece(BaseModel):
    name: str
    color: Color
    position: tuple[str, int]
    captured: bool = False

# Validation happens on instantiation
piece = Piece(name="Knight", color=Color.WHITE, position=("b", 1))
print(piece.position)  # ('b', 1)

# String coercion works
piece = Piece(name="Queen", color="white", position=("d", 1))
print(piece.color)  # Color.WHITE

# Type coercion works
piece = Piece(name="Pawn", color="black", position=("e", 7), captured=0)
print(piece.captured, type(piece.captured))  # False <class 'bool'>
```

### `Field`

The `Field` function adds constraints beyond type annotations. Fields can specify validation rules, defaults, aliases, and documentation.

```python
from pydantic import BaseModel, Field, computed_field

class Position(BaseModel):
    file: str = Field(pattern=r"^[a-h]$", description="Column (a-h)")
    rank: int = Field(ge=1, le=8, description="Row (1-8)")
    
    @computed_field
    @property
    def notation(self) -> str:
        """Algebraic notation derived from file and rank."""
        return f"{self.file}{self.rank}"

position = Position(file="e", rank=4)
print(position.notation)  # "e4" - automatically computed!

# Computed fields serialize like regular fields
print(position.model_dump())  # {'file': 'e', 'rank': 4, 'notation': 'e4'}
```

### `ValidationError`

When validation fails, `ValidationError` packages up what went wrong in a structured format. Each error includes the field path, the problematic value, and a URL to documentation.

```python
from pydantic import BaseModel, Field, ValidationError

class Position(BaseModel):
    file: str = Field(pattern=r"^[a-h]$")
    rank: int = Field(ge=1, le=8)

try:
    Position(file="z", rank=9)  # Invalid: off the board!
except ValidationError as error:
    print(error)
    # Shows validation errors: invalid file and rank
    for item in error.errors():
        print(f"{item['loc']}: {item['msg']}")
```

### `model_validator`

Validators let you add business rules that go beyond type checking. They run at specific points in the validation process.

```python
from pydantic import BaseModel, Field, model_validator

HOME_SQUARES = {
    "Rook": ({"a", "h"}, {1, 8}),
    "Knight": ({"b", "g"}, {1, 8}),
    # ... other pieces and their valid starting files/ranks
}

class Piece(BaseModel):
    name: str
    color: Color
    position: Position  # Nested model composition
    moves: int = 0      # Track number of moves

    @model_validator(mode="after")
    def check_initial_position(self):
        """Validate home squares only for pieces that haven't moved."""
        if self.moves == 0:  # Only validate starting position
            # White pieces start on ranks 1-2, black on ranks 7-8
            if self.color == Color.WHITE and self.position.rank not in [1, 2]:
                raise ValueError("White pieces must start on ranks 1-2")
            if self.color == Color.BLACK and self.position.rank not in [7, 8]:
                raise ValueError("Black pieces must start on ranks 7-8")
            
            # Validate specific piece starting positions
            if self.name in HOME_SQUARES:
                files, ranks = HOME_SQUARES[self.name]
                if self.position.file not in files or self.position.rank not in ranks:
                    valid = [f"{file}{rank}" for file in sorted(files) for rank in sorted(ranks)]
                    raise ValueError(f"{self.name}s start at: {', '.join(valid)}")
        
        return self

# Nested models validate automatically
piece = Piece(name="Rook", color="white", position={"file": "a", "rank": 1})
print(piece.position.notation)  # "a1"

knight = Piece(name="Knight", color="black", position={"file": "g", "rank": 8})
print(f"{knight.color.value} {knight.name} at {knight.position.notation}")  
# "black Knight at g8"

# Validation failure: wrong starting position
try:
    Piece(name="Rook", color="white", position={"file": "c", "rank": 1})
except ValueError as error:
    print(error)  # "Rooks start at: a1, a8, h1, h8"

# Validation failure: wrong rank for color
try:
    Piece(name="Knight", color="black", position={"file": "b", "rank": 3})
except ValueError as error:
    print(error)  # "Black pieces must start on ranks 7-8"
```

### `model_dump`

Models convert back to dictionaries or JSON with control over what gets included. Serialization handles nested models, lists, and type conversions automatically.

```python
from datetime import datetime
from pydantic import BaseModel

class Board(BaseModel):
    pieces: list[Piece]
    timestamp: datetime

# Final position of Game 6, Kasparov vs Deep Blue (1997)
# Kasparov resigned here. It was the first time a world champion lost to a computer!
board = Board(
    timestamp=datetime(1997, 5, 11, 15, 45, 0),
    pieces=[
        Piece(name="King",  color="white", position={"file": "g", "rank": 1}, moves=15),
        Piece(name="Queen", color="white", position={"file": "e", "rank": 2}, moves=8),
        Piece(name="King",  color="black", position={"file": "g", "rank": 8}, moves=12),
        Piece(name="Rook",  color="black", position={"file": "d", "rank": 1}, moves=20),
    ],
)

# list[Piece] serializes recursively
print(board.model_dump()["pieces"][0])
# {'name': 'King', 'color': 'white', 'position': {'file': 'g', 'rank': 1, 'notation': 'g1'}, 'captured': False, 'moves': 15}

# Python mode keeps native datetime objects
python_dict = board.model_dump(mode="python")
print(python_dict["timestamp"])         # datetime(1997, 5, 11, 15, 45)
print(type(python_dict["timestamp"]))   # <class 'datetime.datetime'>

# JSON mode serializes everything to primitives
json_dict = board.model_dump(mode="json")
print(json_dict["timestamp"])           # '1997-05-11T15:45:00'
print(type(json_dict["timestamp"]))     # <class 'str'>

```

### `model_config`

The `model_config` dictionary controls validation strictness, alias behavior, and serialization defaults.

```python
from pydantic import BaseModel, ConfigDict, ValidationError

class Tournament(BaseModel):
    model_config = ConfigDict(
        strict=True,   # No type coercion
        frozen=True,   # Immutable after creation
        extra="forbid" # Reject unknown fields
    )

    name: str
    year: int
    location: str
    rounds: int
    champion: str

# strict=True: no coercion, types must match exactly
try:
    Tournament(
        name="Kasparov vs Deep Blue",
        year="1997", 
        location="New York",
        rounds=6,
        champion="Deep Blue"
    )
except ValidationError as error:
    print(error)  # year: Input should be a valid integer

tournament = Tournament(
    name="Kasparov vs Deep Blue",
    year=1997,
    location="New York City",
    rounds=6,
    champion="Deep Blue"
)

# frozen=True: official results are final, no modifications allowed
try:
    tournament.champion = "Kasparov"
except ValidationError as error:
    print(error)  # Instance is frozen

# extra="forbid": unexpected fields are rejected outright
try:
    Tournament(
        name="Kasparov vs Deep Blue",
        year=1997,
        location="New York City",
        rounds=6,
        champion="Deep Blue",
        arbiter="John Smith"
    )
except ValidationError as error:
    print(error)  # arbiter: Extra inputs are not permitted
```

---

What started as a weekend experiment to stop writing the same validation code twice turned into something that now sits at the foundation of a significant portion of the Python ecosystem. That trajectory makes more sense when you remember the original problem: Python trusted developers, but developers needed their programs to trust the outside world too. Pydantic answered that gap in a way the language itself wasn't designed to.

Going through all of this left me with a genuine appreciation for how cohesive the design is. The components build on each other in a way that feels deliberate, where learning one piece makes the next one easier to understand. That's not a given in API design, and it's probably a big reason why the library spread as quickly as it did and what's made Pydantic the professional pedant Python needed.