---
title: Hands-On Analytics with DuckDB and MovieLens
date: 2025-03-01
draft: false
tags:
  - projects
  - standalone
  - data-engineering
  - databases
  - duckdb
---
---

[[notes/tools/duckdb|DuckDB]] is a no-fuss, high-performance database you run on a laptop. No clusters, no setup. To push it a little, this note works through **MovieLens**: 32 million ratings across nearly 90,000 movies. Messy, real, and big enough to be worth the trip.

---

Getting started with [[notes/tools/duckdb|DuckDB]] takes no servers. It runs from the command line, embeds inside applications, or works as a database library in C++, Python, Rust. I use it from Python.

Integration with **Pandas**, **Polars**, and **Apache Arrow** is tight enough that [[notes/tools/duckdb|DuckDB]] reads as a tool for analysis rather than for running a database. Load data, run SQL against DataFrames, get results, all inside a Python environment.

For exploring data like this, **Jupyter Notebooks** are my go-to: a [pure Jupyter setup](https://jupyter.org/install), the [native VS Code support](https://code.visualstudio.com/docs/datascience/jupyter-notebooks), or [Google Colab](https://colab.google/). Each step runs on its own, results appear immediately, and I can tweak things without rerunning the whole script or setting breakpoints. That matches how [[notes/tools/duckdb|DuckDB]] wants to be used.

[[notes/tools/duckdb|DuckDB]] installs from [PyPI](https://pypi.org/project/duckdb/). It ships as a pre-compiled binary with no external dependencies.

```sh
pip install duckdb
```

A few extras come along. My stack, for reference:

```toml
dependencies = [
    "duckdb>=1.2.0",
    "ipykernel>=6.29.5",
    "pandas>=2.2.3",
    "polars>=1.24.0",
    "pyarrow>=19.0.1",
    "requests>=2.32.3",
]
```

Real data rather than toys. [MovieLens 32M](https://grouplens.org/datasets/movielens/32m/) holds 32 million ratings and 2 million tag applications across 87,585 movies from 200,948 users. It arrives as a compressed `.zip`, which this downloads and extracts:

```python
import zipfile
from pathlib import Path
import requests

FILE = "ml-32m.zip"
URL = f"https://files.grouplens.org/datasets/movielens/{FILE}"

response = requests.get(URL, stream=True)
response.raise_for_status()

with Path(FILE).open("wb") as file:
    for chunk in response.iter_content(chunk_size=8192):
        file.write(chunk)

with zipfile.ZipFile(Path(FILE), "r") as file:
    file.extractall()
```

Extracted, the tree looks like this:

```
ml-32m
├── README.txt
├── checksums.txt
├── links.csv
├── movies.csv
├── ratings.csv
└── tags.csv
```

[[notes/tools/duckdb|DuckDB]] runs **in-memory** like this:

```python
import duckdb
```

```python
connection = duckdb.connect(database=":memory:")
```

Load and inspect `movies.csv`:

```python
movies = connection.read_csv("ml-32m/movies.csv")
connection.query("SELECT * FROM movies LIMIT 10")
```

```
┌─────────┬────────────────────────────────────┬─────────────────────────────────────────────┐
│ movieId │               title                │                   genres                    │
│  int64  │              varchar               │                   varchar                   │
├─────────┼────────────────────────────────────┼─────────────────────────────────────────────┤
│       1 │ Toy Story (1995)                   │ Adventure|Animation|Children|Comedy|Fantasy │
│       2 │ Jumanji (1995)                     │ Adventure|Children|Fantasy                  │
│       3 │ Grumpier Old Men (1995)            │ Comedy|Romance                              │
│       4 │ Waiting to Exhale (1995)           │ Comedy|Drama|Romance                        │
│       5 │ Father of the Bride Part II (1995) │ Comedy                                      │
│       6 │ Heat (1995)                        │ Action|Crime|Thriller                       │
│       7 │ Sabrina (1995)                     │ Comedy|Romance                              │
│       8 │ Tom and Huck (1995)                │ Adventure|Children                          │
│       9 │ Sudden Death (1995)                │ Action                                      │
│      10 │ GoldenEye (1995)                   │ Action|Adventure|Thriller                   │
├─────────┴────────────────────────────────────┴─────────────────────────────────────────────┤
│ 10 rows                                                                          3 columns │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

The query referenced a Python variable directly. Because [[notes/tools/duckdb|DuckDB]] runs inside Python it can reach local variables, so a Python dataset can be queried with SQL.

A **Pandas** dataset queried through [[notes/tools/duckdb|DuckDB]]:

```python
import pandas as pd

fast_and_furious = pd.DataFrame(
    [
        ["Dom", "Mazda RX-7", 1993],
        ["Brian", "Mitsubishi Eclipse", 1995],
        ["Letty", "Nissan 240SX", 1997],
        ["Jesse", "Volkswagen Jetta", 1995],
        ["Leon", "Nissan Skyline GT-R R33", 1995],
    ],
    columns=["character", "car", "year"],
)

connection.query("SELECT * FROM fast_and_furious")
```

```
┌───────────┬─────────────────────────┬───────┐
│ character │           car           │ year  │
│  varchar  │         varchar         │ int64 │
├───────────┼─────────────────────────┼───────┤
│ Dom       │ Mazda RX-7              │  1993 │
│ Brian     │ Mitsubishi Eclipse      │  1995 │
│ Letty     │ Nissan 240SX            │  1997 │
│ Jesse     │ Volkswagen Jetta        │  1995 │
│ Leon      │ Nissan Skyline GT-R R33 │  1995 │
└───────────┴─────────────────────────┴───────┘
```

A nice trick. Still too much magic for my taste.

I would rather register Python variables as tables than let [[notes/tools/duckdb|DuckDB]] recognize the names on its own. The code stays readable, and larger scripts behave the way you expect.

```python
connection.register("movies", movies)
```

Any query result becomes a [**Pandas** DataFrame](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.html) in one step:

```python
pandas_df = connection.query("SELECT * FROM movies").df()
```

... or a [**Polars** DataFrame](https://docs.pola.rs/py-polars/html/reference/dataframe/index.html):

```python
polars_df = connection.query("SELECT * FROM movies").pl()
```

... or a [**PyArrow** Table](https://arrow.apache.org/docs/python/generated/pyarrow.Table.html):

```python
arrow_df = connection.query("SELECT * FROM movies").arrow()
```

If you write SQL, [[notes/tools/duckdb|DuckDB]] has a dialect worth knowing. What they call "[friendly SQL](https://duckdb.org/docs/stable/sql/dialect/friendly_sql.html)" is a set of enhancements that make queries shorter and clearer.

Extract the year from the movie `title` with regex:

```python
connection.query("""
    SELECT movieId, title, REGEXP_EXTRACT(title, '\\((\\d{4})\\)', 1) AS year
    FROM movies
    LIMIT 10
""")
```

```
┌─────────┬────────────────────────────────────┬─────────┐
│ movieId │               title                │  year   │
│  int64  │              varchar               │ varchar │
├─────────┼────────────────────────────────────┼─────────┤
│       1 │ Toy Story (1995)                   │ 1995    │
│       2 │ Jumanji (1995)                     │ 1995    │
│       3 │ Grumpier Old Men (1995)            │ 1995    │
│       4 │ Waiting to Exhale (1995)           │ 1995    │
│       5 │ Father of the Bride Part II (1995) │ 1995    │
│       6 │ Heat (1995)                        │ 1995    │
│       7 │ Sabrina (1995)                     │ 1995    │
│       8 │ Tom and Huck (1995)                │ 1995    │
│       9 │ Sudden Death (1995)                │ 1995    │
│      10 │ GoldenEye (1995)                   │ 1995    │
├─────────┴────────────────────────────────────┴─────────┤
│ 10 rows                                      3 columns │
└────────────────────────────────────────────────────────┘
```

The `genres` column works the same way. Each movie carries several genres in a pipe-separated string, and [[notes/tools/duckdb|DuckDB]] splits them:

```python
connection.query("""
    SELECT movieId, title, UNNEST(STRING_SPLIT(genres, '|')) AS genre
    FROM movies
    ORDER BY movieId
    LIMIT 10
""")
```

```
┌─────────┬─────────────────────────┬───────────┐
│ movieId │          title          │   genre   │
│  int64  │         varchar         │  varchar  │
├─────────┼─────────────────────────┼───────────┤
│       1 │ Toy Story (1995)        │ Children  │
│       1 │ Toy Story (1995)        │ Animation │
│       1 │ Toy Story (1995)        │ Adventure │
│       1 │ Toy Story (1995)        │ Fantasy   │
│       1 │ Toy Story (1995)        │ Comedy    │
│       2 │ Jumanji (1995)          │ Children  │
│       2 │ Jumanji (1995)          │ Adventure │
│       2 │ Jumanji (1995)          │ Fantasy   │
│       3 │ Grumpier Old Men (1995) │ Romance   │
│       3 │ Grumpier Old Men (1995) │ Comedy    │
├─────────┴─────────────────────────┴───────────┤
│ 10 rows                             3 columns │
└───────────────────────────────────────────────┘
```

So far everything has run in-memory, which is right for quick analysis. Sometimes the work needs to outlive the session: several tables, joins, data that stays available. [[notes/tools/duckdb|DuckDB]] has **persistent** storage for that. Load once into a `.duckdb` file instead of parsing `.csv` files every run, and the file can live in the cloud.

```python
connection = duckdb.connect(database="database.duckdb", read_only=False)
```

A loop loads every `.csv` file into [[notes/tools/duckdb|DuckDB]]:

```python
for file in Path("ml-32m").glob("*.csv"):
    table = file.stem 
    connection.execute(f"""
        CREATE OR REPLACE TABLE {table} AS 
        SELECT * FROM read_csv_auto('{file}')
    """)
```

```python
connection.sql("SHOW TABLES")
```

```
┌─────────┐
│  name   │
│ varchar │
├─────────┤
│ links   │
│ movies  │
│ ratings │
│ tags    │
└─────────┘
```

Every dataset is now a table. The ratings table confirms the load:

```python
connection.sql("SELECT * FROM ratings LIMIT 20")
```

```
┌────────┬─────────┬────────┬───────────┐
│ userId │ movieId │ rating │ timestamp │
│ int64  │  int64  │ double │   int64   │
├────────┼─────────┼────────┼───────────┤
│      1 │      17 │    4.0 │ 944249077 │
│      1 │      25 │    1.0 │ 944250228 │
│      1 │      29 │    2.0 │ 943230976 │
│      1 │      30 │    5.0 │ 944249077 │
│      1 │      32 │    5.0 │ 943228858 │
│      1 │      34 │    2.0 │ 943228491 │
│      1 │      36 │    1.0 │ 944249008 │
│      1 │      80 │    5.0 │ 944248943 │
│      1 │     110 │    3.0 │ 943231119 │
│      1 │     111 │    5.0 │ 944249008 │
│      1 │     161 │    1.0 │ 943231162 │
│      1 │     166 │    5.0 │ 943228442 │
│      1 │     176 │    4.0 │ 944079496 │
│      1 │     223 │    3.0 │ 944082810 │
│      1 │     232 │    5.0 │ 943228442 │
│      1 │     260 │    5.0 │ 943228696 │
│      1 │     302 │    4.0 │ 944253272 │
│      1 │     306 │    5.0 │ 944248888 │
│      1 │     307 │    5.0 │ 944253207 │
│      1 │     322 │    4.0 │ 944053801 │
├────────┴─────────┴────────┴───────────┤
│ 20 rows                     4 columns │
└───────────────────────────────────────┘
```

Each row is one user's rating for one movie, and `COUNT(*)` on the ratings table returns over 32 million of them. The dataset lives up to its name. Compute the average rating per movie and save it as a new table:

```python
connection.sql("""
    CREATE OR REPLACE TABLE average_ratings AS 
    SELECT movieId, ROUND(AVG(rating), 2) AS rating, COUNT(userId) AS users
    FROM ratings
    GROUP BY movieId
""")
```

```python
connection.sql("SELECT * FROM average_ratings LIMIT 10")
```

```
┌─────────┬────────┬───────┐
│ movieId │ rating │ users │
│  int64  │ double │ int64 │
├─────────┼────────┼───────┤
│     410 │   3.03 │ 20166 │
│     445 │   2.88 │  1928 │
│     588 │   3.71 │ 50442 │
│     866 │   3.72 │  6640 │
│     881 │   2.82 │  1183 │
│    1653 │   3.82 │ 26958 │
│    2353 │   3.57 │ 18246 │
│    4344 │   3.08 │  8656 │
│   74458 │   3.99 │ 29096 │
│  176371 │   3.96 │ 11094 │
├─────────┴────────┴───────┤
│ 10 rows        3 columns │
└──────────────────────────┘
```

From this cleaner view, the highest-rated movies. Only those with at least 10,000 ratings, so the ranking stays honest:

```python
connection.sql("""
    SELECT movies.title, average_ratings.rating, average_ratings.users
    FROM average_ratings
    JOIN movies ON average_ratings.movieId = movies.movieId
    WHERE average_ratings.users >= 10000
    ORDER BY average_ratings.rating DESC, average_ratings.users DESC
    LIMIT 10
""")
```

```
┌─────────────────────────────────────────────┬────────┬────────┐
│                    title                    │ rating │ users  │
│                   varchar                   │ double │ int64  │
├─────────────────────────────────────────────┼────────┼────────┤
│ Shawshank Redemption, The (1994)            │    4.4 │ 102929 │
│ Godfather, The (1972)                       │   4.32 │  66440 │
│ Parasite (2019)                             │   4.31 │  11670 │
│ Usual Suspects, The (1995)                  │   4.27 │  67750 │
│ 12 Angry Men (1957)                         │   4.27 │  21863 │
│ Godfather: Part II, The (1974)              │   4.26 │  43111 │
│ Seven Samurai (Shichinin no samurai) (1954) │   4.25 │  16531 │
│ Schindler's List (1993)                     │   4.24 │  73849 │
│ Fight Club (1999)                           │   4.23 │  77332 │
│ Rear Window (1954)                          │   4.23 │  24883 │
├─────────────────────────────────────────────┴────────┴────────┤
│ 10 rows                                             3 columns │
└───────────────────────────────────────────────────────────────┘
```

The list that comes out is worth reading twice.

---

We only scratched the surface here. Enough to see why teams reach for it. It already runs in production at companies whose names you would recognize.

For personal projects it is my default. Production will come.
