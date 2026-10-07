---
title: Python Magic Methods & Objects' Secret Language
date: 2025-06-25
draft: false
tags:
  - projects
  - standalone
  - software-engineering
  - python
---
---

Python objects can learn the same manners as the built-ins. A class of your own can answer `+`, `len()`, and `in` without a single helper function hanging off the side. The hooks that make this work are **magic methods**, also called **dunder methods**, for the double underscores that bracket their names. Once a class speaks that language, it stops feeling like an outsider and starts feeling like a first-class citizen.

---

Every time you write `len(my_list)` or `my_dict["key"]`, you are not calling a built-in function. Python is calling a method on that object. The name oversells it. Magic methods are just the systematic surface where the language and your objects agree on how things behave.

And **everything is an object**. That integer `42` carries methods like `__add__` and `__str__`. A function carries `__name__` and `__doc__`. Classes themselves are objects too, instances of the `type` metaclass, which is a rabbit hole for another day. This is practical, not philosophical. Once every piece of data is an object with behavior, magic methods stop feeling mysterious and start feeling inevitable.

When you create a class, you are building a new citizen for Python's ecosystem. Magic methods are the etiquette lessons. They teach the object how to introduce itself, how to play with operators, and how to clean up after itself.

The examples below build a small game character system and use it to show each method at work. Nothing clever hiding in them, just patterns you can lift.

---

## Python's Social Contract

Python's data model is a contract between your objects and the language. Implement `__len__` and you are promising that `len(your_object)` works. Define `__add__` and you have told Python what `object1 + object2` means.

The point is consistency more than convenience. Nobody should have to remember whether your class spells it `inventory.get_size()`, `inventory.size()`, or `len(inventory)`. If an object conceptually has a length, `len()` should work on it.

---

## Object Creation and Representation

#### `__init__`

You know this one already, so the interesting part is the validation. Python calls `__init__` after it creates your object. This is where the initial state gets set and constructor arguments get checked:

```python
class Character:
    def __init__(self, name: str, hp: int = 100, level: int = 1):
        """Create a character with a name, hit points (hp), and level."""
        if hp <= 0:
            raise ValueError("HP must be positive!")
        if level < 1:
            raise ValueError("Level must be at least 1!")

        self.name: str = name
        self.hp: int = hp
        self.level: int = level
        self.inventory: list = []

    @property
    def is_alive(self) -> bool:
        """Check if the character is alive."""
        return self.hp > 0
```

Doing the input validation inside `__init__` means every `Character` object starts in a valid state. No zombie characters with zero HP or negative levels sneak into the game.

#### `__repr__` and `__str__`

These two methods control how your object appears as text, but they serve different audiences. `__repr__` is the business card you hand to developers: precise, unambiguous. `__str__` is the casual introduction for everyone else: friendly, informative.

```python
class Character:
    # ...existing code...
    
    def __repr__(self) -> str:
        """For developers: unambiguous and ideally eval()-able"""
        return f"Character(name={self.name!r}, hp={self.hp}, level={self.level})"
    
    def __str__(self) -> str:
        """For users: readable and informative"""
        status = "💀" if not self.is_alive else "💚" if self.hp > 80 else "❤️"
        return f"{status} {self.name} (Lv.{self.level}) - {self.hp}/100 HP"

# e.g.,
hero = Character("Joel", hp=75, level=5)
print(repr(hero))       # Character(name='Joel', hp=75, level=5)
print(str(hero))        # ❤️ Joel (Lv.5) - 75/100 HP
```

`print()` calls `__str__`. The interactive console and the debugger call `__repr__`, which is why `__repr__` should carry enough information to recreate the object. The example above includes the exact constructor parameters for that reason.

---

## Object Arithmetic Operations

#### `__add__` and `__mul__`

When you write `a + b`, Python does not guess. It calls `a.__add__(b)`. Implement `__add__` and you have taught your objects what the plus operator means.

```python
from __future__ import annotations
# ↑ allows using class names before they're fully defined

class Damage:
    def __init__(self, amount: int | float):
        """Initialize the Damage object with an amount."""
        self.amount: int | float = amount

    def __add__(self, other: int | float | Damage) -> Damage:
        """Add another Damage object or a number."""
        if isinstance(other, Damage):
            return Damage(self.amount + other.amount)
        elif isinstance(other, (int, float)):
            return Damage(self.amount + other)
        return NotImplemented

    def __mul__(self, factor: int | float) -> Damage:
        """Scale damage by a factor."""
        if isinstance(factor, (int, float)):
            return Damage(self.amount * factor)
        return NotImplemented

    def __str__(self) -> str:
        """String representation of the damage."""
        return f"{self.amount} damage!"


# e.g.,
sword_damage = Damage(amount=50)
spell_damage = Damage(amount=30)

total = sword_damage * 2 + spell_damage + 10
print(total)  # 140 damage!
```

The flexibility is the point. `__add__` handles both `Damage + Damage` (two damage sources combining) and `Damage + number` (raw damage added on). `__mul__` scales damage by a multiplier, which is what you want for critical hits and buffs. Unsupported operands return `NotImplemented`.

#### `__eq__` and `__lt__`

Comparison methods like `__eq__` and `__lt__` put your objects into sorting algorithms and equality checks. Define them and every operation that leans on comparison starts working.

```python
class Character:
    # ...existing code...
    
    def __eq__(self, other) -> bool:
        """Characters are equal if they have the same name and level."""
        if not isinstance(other, Character):
            return NotImplemented
        return self.name == other.name and self.level == other.level
    
    def __lt__(self, other) -> bool:
        """Compare characters by level for sorting."""
        if not isinstance(other, Character):
            return NotImplemented
        return self.level < other.level
    
    def __hash__(self) -> int:
        """Make characters hashable for use in sets/dicts."""
        return hash((self.name, self.level))


# e.g.,
party = [
    Character("Tank", level=3),
    Character("Sniper", level=8),
    Character("Healer", level=5)
]
party.sort()  # Sorts by level
print([char.name for char in party])  # ['Tank', 'Healer', 'Sniper']
```

`__eq__` defines what makes two characters "equal": here, same name and level. `__lt__` defines the order they sort in. `__hash__` is what lets objects live in a set or work as dictionary keys, and it has to return the same value for any two objects that compare equal.

---

## Object Container Behavior

#### `__getitem__`, `__setitem__`, and `__contains__`

Implement the container protocol (`__getitem__`, `__setitem__`, and friends) and the `Inventory` class behaves like the built-in containers. Nobody has to learn a new API. They already know `inventory["weapon"]` and `len(inventory)`.

```python
class Inventory:
    def __init__(self):
        """Initialize an empty inventory."""
        self._items = {}

    def __setitem__(self, slot, item):
        """Set an item in a specific slot."""
        self._items[slot] = item

    def __getitem__(self, slot):
        """Get an item from a specific slot."""
        return self._items[slot]

    def __delitem__(self, slot):
        """Delete an item from a specific slot."""
        del self._items[slot]

    def __contains__(self, item) -> bool:
        """Check if an item is in the inventory."""
        return item in self._items.values()

    def __len__(self) -> int:
        """Return the number of items in the inventory."""
        return len(self._items)

    def __iter__(self):
        """Return an iterator over the items in the inventory."""
        return iter(self._items.values())

    def __bool__(self) -> bool:
        """Return True if the inventory has items, False otherwise."""
        return len(self._items) > 0


# e.g.,
inventory = Inventory()
inventory["weapon"] = "Flame Sword"
inventory["armor"] = "Steel Plate"

print(len(inventory))  # 2
print("Flame Sword" in inventory)  # True

for item in inventory:
    print(f"- {item}")
    # - Flame Sword
    # - Steel Plate
```

Each method maps to one operation. `inventory["weapon"]` calls `__getitem__("weapon")`. The `in` operator triggers `__contains__`, `len()` calls `__len__`, `__iter__` is what makes the `for` loop work, and `__bool__` decides the object's truthiness in a conditional.

---

## Object Callable Behavior

#### `__call__`

Sometimes an object should be callable like a function. `__call__` makes that work. It fits anything with a primary action: the object becomes a function that remembers its own state.

```python
class Skill:
    def __init__(self, name: str, damage: int):
        """Create a skill with a name and damage value"""
        self.name: str = name
        self.damage: int = damage
        self.usage: int = 0

    def __call__(self, caster: Character, target: Character) -> str:
        """Use the skill on a target, modifying the target's HP"""
        self.usage += 1
        target.hp -= self.damage
        return f"{caster.name} hits {target.name} with {self.name} for {self.damage} damage!"

class Mage(Character):
    def __init__(self, name: str, **kwargs):
        """Create a Mage character with a fireball skill"""
        super().__init__(name, **kwargs)
        self.fireball = Skill(name="Fireball", damage=50)


# e.g.,
mage = Mage("Gandalf", level=10)
enemy = Character("Orc", hp=80)

result = mage.fireball(mage, enemy) # Skills are called like functions
print(result)  # Gandalf hits Orc with Fireball for 50 damage!
print(f"Fireball used {mage.fireball.usage} times")
```

`mage.fireball` is not data sitting in an attribute. It is a callable that tracks its own usage. Writing `mage.fireball(mage, enemy)` sends those arguments to the skill's `__call__`. Strategy objects, commands, and anything else that needs a function with persistent state all fit this pattern.

---

## Object Context Management

#### `__enter__` and `__exit__`

> [!faq] Context Manager
> Context managers are one of Python's nicer features and they go underused. They solve a plain problem: resources have to get cleaned up even when things go wrong. Files, database connections, locks, temporary state changes. Whatever the resource, a context manager runs setup and teardown as a pair.

`__enter__` sets up resources when the context is entered. `__exit__` guarantees the cleanup, and it runs however you leave the `with` block: normal completion, early return, or exception.

```python
class Player:
    def __init__(self, name: str):
        """Represents a player in the game."""
        self.name: str = name
        self.character: Character | None = None

class Session:
    def __init__(self, player: Player, character: Character):
        """Initialize a game session with a player and their character."""
        self.player: Player = player
        self.character: Character = character

    def __enter__(self):
        """Start the session, assigning the character to the player."""
        print(f"Starting session for '{self.player.name}'")
        self.player.character = self.character
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """End the session, cleaning up resources."""
        print(f"Ending session for '{self.player.name}'")
        if exc_type:
            print(f"Session ended due to error: {exc_val}")
        return False  # do NOT suppress exceptions


# e.g.,
player = Player(name="Alan")
character = Character(name="Joel")

with Session(player=player, character=character) as session:                    # Starting session for 'Alan'
    print(f"'{session.player.name}' is playing as '{session.character.name}'")  # 'Alan' is playing as 'Joel'
                                                                                # Ending session for 'Alan'
```

Python runs `__enter__` on the way into the `with` block, and whatever it returns is assigned to the variable after `as`. `__exit__` always runs on the way out. Its parameters say what happened: `exc_type` is `None` when nothing went wrong. Otherwise you get the exception details and get to decide whether to suppress it by returning `True`.

---

## Object Attribute Control

#### `__getattr__` and `__setattr__`

Sometimes attributes need more control. Python calls `__getattr__` when the normal lookup fails, which is your chance to supply a value dynamically. `__setattr__` intercepts every assignment, so validation and side effects can ride along.

```python
class Boss(Character):
    def __init__(self, name, **kwargs):
        super().__init__(name, **kwargs)
        """Initialize a boss character with default stats"""
        super().__setattr__("_stats", {"strength": 10, "agility": 10, "intelligence": 10})
        # ↑ "stats" is a common term in game development
        # and refers to a character's attributes or status values.

    def __getattr__(self, name: str) -> int:
        """Called when attribute isn't found normally"""
        stats = self.__dict__.get("_stats", {})  # Avoid triggering recursion
        if name in stats:
            return stats[name]
        raise AttributeError(f"'{self.__class__.__name__}' has no attribute '{name}'")

    def __setattr__(self, name: str, value: int):
        """Intercept stat assignments with validation."""
        stats = self.__dict__.get("_stats")
        if stats is not None and name in stats:
            if value < 0:
                raise ValueError(f"{name} cannot be negative")
            stats[name] = value
        else:
            super().__setattr__(name, value)


# e.g.,
boss = Boss(name="Bowser")
print(boss.strength)  # 10
boss.strength = 15
print(boss.strength)  # 15

try:
    boss.agility = -5
except ValueError as error:
    print(f"Validation: {error}") # Validation: agility cannot be negative
```

This creates a character where `boss.strength` looks like a normal attribute but actually lives in the `_stats` dictionary, with validation attached. `__getattr__` only runs when the normal lookup fails, so regular attributes like `name` still behave. `__setattr__` sees every assignment and can route stat updates to the dictionary while everything else works as usual.

This class also leans on a few built-in attributes Python gives every object. `__dict__` is where Python stores an object's real attributes. It is a regular dictionary. Reading it directly instead of going through `getattr` is what keeps the custom attribute behavior from recursing. `__class__` is the object's class, and `__name__`, used as `self.__class__.__name__`, is the class name as a string, which is how the error messages stay readable.

---

## Performance and Unsupported Operations

### Keep Magic Methods Simple

Magic methods get called constantly, often in tight loops, so speed matters. Keep them fast. Leave I/O and heavy calculation somewhere else.

```python
# DON'T: Expensive operations in magic methods
class SlowContainer:
    def __len__(self) -> int:
        # Recalculating every time is slow
        return sum(1 for item in self.items if item is not None)

# DO: Cache expensive calculations
class FastContainer:
    def __init__(self):
        self.items = []
        self._count = 0
    
    def __len__(self) -> int:
        return self._count
    
    def append(self, item):
        self.items.append(item)
        self._count += 1
```

The slow version recounts on every `len()`. The fast version keeps a cached count and updates it when items are added.

### Use `NotImplemented` for Unsupported Operations

When a magic method meets a type it cannot handle, return `NotImplemented` rather than raising. You are telling Python _I don't know how to handle this. Maybe the other object does._ Python then tries the reverse operation, calling `other.__radd__(self)`. Only when both sides return `NotImplemented` does it raise a `TypeError`.

```python
class Point:
    def __init__(self, x: int, y: int):
        """Initialize a Point with x and y coordinates."""
        self.x, self.y = x, y

    def __add__(self, other) -> Point:
        """Add another Point to this Point."""
        if isinstance(other, Point):
            return Point(self.x + other.x, self.y + other.y)
        return NotImplemented

    def __radd__(self, other) -> Point:
        """Handle addition when this Point is on the right side."""
        if isinstance(other, tuple) and len(other) == 2:
            return Point(self.x + other[0], self.y + other[1])
        return NotImplemented

# e.g.,
point = Point(1, 2)
result = (3, 4) + point  # __add__ fails, __radd__ succeeds
print(f"({result.x}, {result.y})")  # (4, 6)
```

Here `tuple.__add__` does not know what to do with a `Point`, so Python tries `Point.__radd__`, which does. That handoff only happens because `__add__` returned `NotImplemented` instead of blowing up. Classes written this way stay open to types their author never anticipated.

---

## Putting It All Together

Here is the full character system, with the pieces doing their work together:

```python
class Character:
    def __init__(self, name: str, hp: int = 100, level: int = 1):
        # ...existing code...

        self.inventory: Inventory = Inventory()
        self.skills: dict = {}

        # ...existing code...

    def __bool__(self) -> bool:
        """Check if character is alive"""
        return self.is_alive

    def __contains__(self, item: str) -> bool:
        """Check if character has item"""
        return item in self.inventory

    def __call__(self, skill: str, target: Character | None = None):
        """Use a skill"""
        if skill in self.skills:
            return self.skills[skill](self, target)
        return f"'{self.name}' doesn't know '{skill}'"


# e.g.,
aloy = Character("Aloy")
aloy.inventory["bow"] = "Hunter Bow"
aloy.skills["heal"] = Skill(name="Berries", damage=-10)  # negative damage = healing

print(aloy)  # 💚 Aloy (Lv.1) - 100/100 HP
print(bool(aloy))  # True
print("Hunter Bow" in aloy)  # True

result = aloy(skill="heal", target=aloy) # Use character as a function
print(result)  # Aloy hits Aloy with Berries for -10 damage!
```

Four methods carry this class. `__str__` for display, `__bool__` for aliveness, `__contains__` for inventory searches, `__call__` for skill usage. Each one has a single job and together they make the object feel natural to use.

---

## Speaking Python's Language

What separates workable Python code from good Python code is consistency with the language. When objects answer to `len()`, `str()`, `==`, and `in`, nobody has to learn your API because they already know it. It is the difference between a neighborhood with shared customs and one where every house invents its own rules for how to knock on the door. Follow Python's protocols and developers meet your objects with mental models they already carry.

Think about the last time you looked up how to get the length of a list, check membership in a set, or turn an object into a string. You did not, because those operations are the same everywhere in Python. Magic methods give your own classes that same reach.

The **everything is an object** idea from the start is what makes this practical. Built-in types are not privileged by being written in C. They are privileged by implementing the same protocols you can implement. A `Character` class can be every bit as well behaved as `list` or `dict`. You are the one who decides what _length_ and _equality_ mean in your domain. The character system above answers `bool()` for aliveness, `==` for comparison, and `in` for inventory. Those choices are not arbitrary API design. They are the object describing itself in the language Python already speaks. 

The last habit worth keeping is this: when a class feels awkward to use, it is usually missing a magic method. `if hero` beats `if hero.is_alive()`. `len(inventory)` beats `inventory.count()`. Asking what a user would naturally expect to do with the object usually names the method for you. Want length? `__len__`. Iteration? `__iter__`. Addition? `__add__`. Every one of those is you teaching Python your problem domain.

A well-mannered object never has to explain its rules, because it answers whenever the language speaks to it.
