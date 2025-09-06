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

[[articles/tools/duckdb|DuckDB]] has been making waves as a no-fuss, high-performance database you can run right from your laptop. Forget clusters, forget setup headaches - this thing just works. To see what it can really do, let's play with the MovieLens dataset: 32 million ratings across nearly 90,000 movies. Instead of toy data, we’ll dive into something messy, real, and big enough to push [[articles/tools/duckdb|DuckDB]] a little harder.

---

[[articles/tools/duckdb|DuckDB]] is ridiculously easy to get started with - no servers, no setup headaches. You can run it directly from the command line, embed it inside applications, or use it as a database library in languages like C++, Python, Rust, and so on. But for me, the real magic happens in Python.

With its seamless integration into Pandas, Polars, and Apache Arrow, [[articles/tools/duckdb|DuckDB]] feels like it was made for data analysis. Instead of dealing with a heavyweight database setup, you can just load your data, run SQL queries on DataFrames, and get results instantly - all within a Python environment.

When it comes to exploring data like this, **Jupyter Notebooks** are my go-to - whether it’s a [pure Jupyter setup](https://jupyter.org/install), the [native VS Code support](https://code.visualstudio.com/docs/datascience/jupyter-notebooks), or even [Google Colab](https://colab.google/). They’re great for prototyping because you can run each step independently, check the results instantly, and tweak things without rerunning the entire script or setting up breakpoints. It’s a fast, flexible way to iterate, making it a perfect match for [[articles/tools/duckdb|DuckDB]]. So let’s skip the fluff and get it running.

[[articles/tools/duckdb|DuckDB]] can be installed directly from [PyPI](https://pypi.org/project/duckdb/). Since it's a pre-compiled binary, there are no external dependencies - just install and go. Pretty slick.

```sh
pip install duckdb
```

I’ll also be using a few extra dependencies. If you want to set up your environment beforehand, here’s my stack:

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

We’re not here to play with toy datasets - let’s work with real-world data. I found [MovieLens 32M](https://grouplens.org/datasets/movielens/32m/), a dataset containing 32 million ratings and 2 million tag applications across 87,585 movies from 200,948 users. It comes as a compressed `.zip` file, so the following snippet will download and extract everything for us.

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

Once extracted, here’s what we get:

```
ml-32m
├── README.txt
├── checksums.txt
├── links.csv
├── movies.csv
├── ratings.csv
└── tags.csv
```

Let’s fire up [[articles/tools/duckdb|DuckDB]] as an **in-memory** database:

```python
import duckdb
```

```python
connection = duckdb.connect(database=":memory:")
```

Now, we can load and inspect the `movies.csv` file:

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

Did you notice something interesting? We referenced a Python variable inside an SQL query. Since [[articles/tools/duckdb|DuckDB]] runs inside Python, it can access local variables - meaning you can directly query Python datasets using SQL.

For example, let’s create a dataset in Pandas and query it using [[articles/tools/duckdb|DuckDB]]:

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

It’s a nice trick, but honestly, it feels like too much magic for me.

Instead of relying on [[articles/tools/duckdb|DuckDB]] automatically recognizing variable names, I prefer to explicitly register Python variables as tables. This keeps the code a bit more readable, preventing unexpected behavior in larger scripts.

```python
connection.register("movies", movies)
```

Switching between [[articles/tools/duckdb|DuckDB]] and Pandas is effortless. We can take any query result and turn it into a [Pandas DataFrame](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.html) in a single step:

```python
pandas_df = connection.query("SELECT * FROM movies").df()
```

... or into a [Polars DataFrame](https://docs.pola.rs/py-polars/html/reference/dataframe/index.html):

```python
polars_df = connection.query("SELECT * FROM movies").pl()
```

... or into a [PyArrow Table](https://arrow.apache.org/docs/python/generated/pyarrow.Table.html):

```python
arrow_df = connection.query("SELECT * FROM movies").arrow()
```

If you're used to SQL, [[articles/tools/duckdb|DuckDB]] has some neat tricks up its sleeve. It offers what they call "[friendly SQL](https://duckdb.org/docs/stable/sql/dialect/friendly_sql.html)" - a set of enhancements that make queries more concise and powerful.

Let’s extract the year from the movie `title` using regex:

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

The `genres` column is another great example. Each movie can have multiple genres stored as a pipe-separated string. [[articles/tools/duckdb|DuckDB]] lets us split these:

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

So far, we've been running everything in-memory, which is great for quick analysis. But sometimes, we need something more permanent - maybe you want to store multiple tables, perform joins, or keep your data available across sessions. That’s where [[articles/tools/duckdb|DuckDB]]’s **persistent** storage comes in. Instead of parsing `.csv` files every time, we can load everything into a `.duckdb` file and even store it in the cloud.

```python
connection = duckdb.connect(database="database.duckdb", read_only=False)
```

To automate the process, let’s load all the CSV files into [[articles/tools/duckdb|DuckDB]] with a quick loop:

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

Now, we have all our datasets stored as tables inside our database. Checking the contents of the ratings table confirms we’ve successfully loaded everything:

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

As expected, each row represents a user’s rating for a specific movie. And yes, the dataset lives up to its name - running `COUNT(*)` on the ratings table gives us over 32 million rows. To make things easier, let’s compute the average rating for each movie and save it as a new table.

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

Now that we have a cleaner view of the data, let’s find the highest-rated movies. To keep things fair, we’ll only consider movies that have received at least 10,000 ratings:

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

The final result? A solid must-watch list.

---

We scratched the surface of [[articles/tools/duckdb|DuckDB]]’s capabilities, but it’s already clear that this tool has serious potential. It’s being used in production by some of the biggest names in data, and I wouldn’t be surprised if it keeps growing its adoption. For now, it’s my go-to for personal projects. Haven’t had a chance to use it in production yet, but I’m pretty sure that opportunity will come soon.
