---
title: Pydantic
date: 2026-02-21
draft: false
tags:
  - notes
  - tools
  - software-engineering
  - python
  - pydantic
---
---

Python's type hints were designed for static analysis: annotations for IDEs and type checkers, ignored when the code actually runs. [Samuel Colvin](https://github.com/samuelcolvin) looked at that syntax and asked a different question. Why not use it at runtime too? The answer became [Pydantic](https://pydantic.dev/). What started as a weekend experiment now underpins a large slice of the Python ecosystem. These are my notes from tracing that path.

---

Python's philosophy is to trust you. The language assumes you know what you're doing. Pass an integer where a string was expected and it steps aside instead of stopping you. That flexibility is why Python is approachable, and why you can move fast without fighting a compiler. But the programs we write no longer trust only the person writing them. They trust network APIs to return well-formed JSON, configuration files to hold valid syntax, machine learning models to receive properly structured training data, and large language models to return structured responses.

The freedom to move fast turned into an obligation to write defensive validation everywhere. Codebases filled with `isinstance` checks and `try-except` blocks. Business logic wrapped in layers of type verification. API endpoints, configuration loaders, data pipelines, each one needed the same checks written by hand. That is not a flaw in Python so much as where trusting the developer leads once the program has to trust the outside world.

Python 3.5 introduced type hints in 2015, a formal way to express expected types. IDEs got better autocomplete, static type checkers like [mypy](https://mypy.readthedocs.io/en/stable/index.html#) caught bugs before runtime, and function signatures started documenting themselves. The interpreter still treated annotations as optional metadata and ignored them at runtime. The board was set, and someone still had to make a move.

---

## A Missing Piece in Type Safety

<p align="center" style="margin-bottom: 0;">
  <img src="pydantic-chess-board.png" alt="A chess board" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray; margin-top: 0;">A chess board. Every piece has a defined role and a fixed set of rules for how it can move.
</p>

Python 3.7 added another piece in 2018 with `dataclasses`. The `@dataclass` decorator generated `__init__`, `__repr__`, and the comparison methods from type-annotated fields, so you could declare a structure instead of writing 20 lines of initialization code.

Python 3.8 followed with `TypedDict`, which gave dictionaries fixed keys and types. `Protocols` came with it, checking objects by the methods they expose rather than the classes they inherit. Together they covered the angles type hints left open: `dataclasses` for structured objects, `TypedDict` for dictionary schemas, `Protocols` for behavior contracts. All of them sat on the type hints foundation, which gave static analyzers more of the structure to work with.

Every one of them stopped at the same boundary: static analysis. A JSON API returning an unexpected null, a configuration file with a typo, malformed user input, Python accepted all of it. Annotations documented what should happen. Validating what actually happened was still manual: `isinstance` checks, `try-except` blocks, custom validation on every API endpoint and configuration loader.

Someone had to look at those annotations and ask what happens if we actually use them at runtime. What if those tedious `isinstance` chains became something declarative you could read and maintain? The community already had the vocabulary for describing data structure. Enforcing it needed someone with a specific problem and a controversial idea.

---

## The Minds Behind It

That someone was [Samuel Colvin](https://github.com/samuelcolvin), a mechanical engineer from Cambridge who'd taught himself programming while working on oil rigs for **Schlumberger**. By 2017, he was CTO of **TutorCruncher**, an EdTech platform in London, spending his days building APIs and validating user input. The validation code was everywhere. Every API endpoint needed type checks, every configuration loader required custom validation logic, every webhook handler wrapped business logic in layers of defensive programming. He'd write the types in one place as hints for `mypy` and his IDE, then write them again as validation code. It felt redundant.

The controversial part was using type hints for runtime validation at all. They had been designed for static analysis: documentation for humans and tools like `mypy`. Some people thought validating data with them overloaded the purpose and would confuse things. Colvin's counterargument was simple. The information was already there, and if it made developer experience better, it was worth trying. He called himself a "professional pedant" and built a library that matched. [Pydantic](https://pydantic.dev/) shipped in May 2017 as a weekend experiment: type hints doing runtime validation, with automatic type coercion and error messages you could actually read. The community would decide if it was useful.

Turns out it was. The growth came from somewhere unexpected. In 2018, Colombian developer [Sebastián Ramírez](https://tiangolo.com/) was building [FastAPI](https://fastapi.tiangolo.com/), a web framework that needed solid data validation. He picked **Pydantic** as the validation layer, and when **FastAPI** took off it dragged **Pydantic** along with it. Downloads went from thousands to millions a month. Teams kept pairing the two and it stuck. Colvin was still running **Pydantic** largely solo, on top of his day job at **TutorCruncher**.

<p align="center" style="margin-bottom: 0;">
  <img src="pydantic-samuel-and-sebastian.svg" alt="Samuel Colvin and Sebastián Ramírez" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray; margin-top: 0;"> Samuel Colvin and Sebastián Ramírez. Photo via <strong style="color: gray;">@samuelcolvin</strong> on
  <a href="https://x.com/samuelcolvin/status/1593713112510873600" target="_blank" style="color: gray;">X</a>.
</p>

In 2022 the math changed. **Pydantic** was processing trillions of validations a month at large companies and still had no revenue, with one person holding it together. Colvin had three options: hand it over, keep burning out, or build something sustainable. He took the third, forming **Pydantic Services Inc.** and raising venture capital for a Rust rewrite and a small team. [David Hewitt](https://github.com/davidhewitt), who leads [PyO3](https://pyo3.rs/v0.28.2/), and [Sydney Runkle](https://github.com/sydney-runkle) came on to rebuild the core and look after the community. The library stayed free; it just finally had room to grow.

---

## Beyond the Library

That "something bigger" was a bet almost nobody makes. Most open source companies that raise venture capital do the obvious thing: build a popular library, then sell enterprise features or a hosted version. Colvin decided not to monetize **Pydantic** at all. The company would "cash in on credibility," in his words, using the brand as a way into adjacent problems developers would pay to solve. The library earned the trust. What people paid for sat next door.

<p align="center" style="margin-bottom: 0;">
  <img src="pydantic-star-history.svg" alt="Star History Chart" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray; margin-top: 0;">
  Pydantic GitHub repository star history via <a href="https://app.repohistory.com/star-history" target="_blank" style="color: gray;">repohistory.com</a>.
</p>

The first product was [Logfire](https://pydantic.dev/logfire), an observability platform launched in 2024. Tools like [Datadog](https://www.datadoghq.com/) and [New Relic](https://newrelic.com) were powerful and a pain to configure, and the bills hurt. **Logfire** wanted to be what [Vercel](https://vercel.com/) is for deployment: simple, opinionated, sensible defaults. You write SQL straight against your telemetry instead of learning a proprietary query language. And because it shipped in 2024, LLM observability was in the design from the start: tracing calls, tracking token costs, debugging agent workflows. Every Python shop was wiring up models somewhere and nobody could see what those models were doing.

[Pydantic AI](https://pydantic.dev/pydantic-ai) and the AI [Gateway](https://pydantic.dev/ai-gateway) arrived while the LLM wave was cresting. **Pydantic AI** is an agent framework with the developer experience **Pydantic** is known for: strict type safety, validation of LLM outputs, native **Logfire** instrumentation. The AI **Gateway** sits underneath, one API across every major provider with cost controls and observability built in. Neither hides vendor differences behind a generic schema, and both went open source.

<p align="center" style="margin-bottom: 0;">
  <img src="pydantic-ecosystem.svg" alt="Pydantic ecosystem diagram" width="80%">
</p>

---

## The V2 Rewrite

The rewrite started in 2022, before the company had venture funding. **Pydantic** V1 was pure Python with some [Cython](https://github.com/cython/cython) optimizations, which held up for years. At the scale it had reached, speed was about more than user experience. Hewitt pointed out that a faster **Pydantic** would save a meaningful amount of energy. At that volume a 10x speedup meant measurably less carbon. That was one reason. The `Cython` path had also run its course. Going faster meant a deeper change. The choice was Rust.

The case for Rust was architectural. In Python, every function call carries overhead, and validation logic built from small pieces pays it constantly. Rust lets the compiler inline those boundaries away, so you can compose validators without a performance penalty. The team built `pydantic-core` as a separate Rust package and used `PyO3` to talk to Python. Validators became a tree of specialized pieces calling each other, which turned out faster and cleaner at once. Benchmarks landed between 5x and 50x depending on what you were validating, most real-world cases around 17x.

The 16-month effort brought more than speed. Features that were hard in V1 became straightforward on the Rust foundation. Strict type checking with no coercion became a real option. Error messages now link to documentation for each error type. The team also built [jiter](https://github.com/pydantic/jiter), their own JSON parser tuned for validation, which handles incomplete JSON streams and turned out to matter a lot for LLM applications. Serialization got explicit too: clear modes that separate Python objects from JSON-compatible output. With the foundation solid, the team spent the next stretch shipping instead of working around limitations.

---

## How It Works

The pieces fit together in a way that feels natural once you see the pattern. Start at the center and work outward.

### `BaseModel`

At the center sits `BaseModel`, the class everything inherits from. When you define a model with type-annotated fields, **Pydantic** analyzes that structure during class creation and builds an internal schema. Instantiation triggers validation automatically.

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

What started as a weekend experiment to stop writing the same validation code twice now sits under a large share of the Python ecosystem. The original problem explains the shape of it: Python trusted developers, and developers needed their programs to trust the outside world too.

Going through all of this left me with a real appreciation for how cohesive the design is. Each component builds on the one before, so learning one piece makes the next easier. That is not a given in API design, and it is a big part of why the library spread as fast as it did.

**Pydantic** is the professional pedant Python needed.