---
title: DuckDB
date: 2025-03-01
draft: false
tags:
  - articles
  - tools
  - data-engineering
  - databases
  - duckdb
---
---

There’s something great about a tool that just works - no setup drama, no unnecessary complexity. That’s exactly what DuckDB brings to the table. It’s a zero-fuss analytical database that runs directly in your application, effortlessly handling .csv or .parquet files, and even Pandas or Polars DataFrames. While the data world keeps chasing bigger, more distributed architectures, DuckDB flips the script - fast, local, and refreshingly simple.  

---
## The Minds Behind it

[DuckDB](https://duckdb.org/) wasn’t born in a Silicon Valley startup - it came out of [CWI - Centrum Wiskunde & Informatica](https://www.cwi.nl/en/), a research institute in the Netherlands, the same place where [Guido van Rossum](https://www.linkedin.com/in/guido-van-rossum-4a0756/) first created Python. Its creators, [Hannes Mühleisen](https://www.linkedin.com/in/hfmuehleisen/) and [Mark Raasveldt](https://www.linkedin.com/in/mark-raasveldt-256b9a70/), weren’t chasing the next cloud-based behemoth. Instead, they wanted something simple, local, and ridiculously fast - a database that works _inside the application_, not outside of it.  

The name? That’s where it gets fun. When Hannes was living on a boat, he wanted a pet that wouldn’t panic if it ended up in the water. A duck seemed like the obvious choice. That’s how he ended up with **Wilbur**, a feathered companion perfectly suited for the floating lifestyle. So when it came time to name their database, DuckDB just made sense.

<p align="center">
  <img src="hannes-and-wilbur.png" alt="Hannes Mühleisen and Wilbur" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray;">
  Hannes Mühleisen and his pet duck, Wilbur. Photo by 
  <a href="http://isabellarozendaal.com/" target="_blank" style="color: gray;">Isabella Rozendaal</a>.
</p>

Alongside them, [Pedro Holanda](https://www.linkedin.com/in/pdet/), a fellow Brazilian, has been a major force in DuckDB’s development, diving deep into its performance optimizations and query engine internals. His work helps ensure DuckDB keeps running fast, efficient, and memory-friendly, even when crunching large datasets.  

---
## Built to Stay Open

Today, DuckDB is _open-source_ and _MIT-licensed_ **forever**, thanks to the [DuckDB Foundation](https://duckdb.org/foundation/), a non-profit that owns its intellectual property - no risk of a corporate rug-pull. Unlike projects controlled by a single company, DuckDB’s intellectual property isn’t tied to a business that could change direction, seek profit, or get acquired. The foundation exists solely to protect DuckDB’s _open-source_ status, and because it's a legal entity with a defined mission, it can’t just decide to revoke or relicense the code for financial gain. This structure makes a rug pull not just unlikely, but practically impossible.

> [!question] Corporate rug-pull?  
> A **rug-pull** happens when the creators of a project - usually in open-source, crypto, or tech startups - suddenly change the rules in a way that harms users, often for their own financial gain. This can mean closing off access, changing the licensing model, or abandoning the project after securing funding.  
>
> In _open-source_ software, this usually starts with a company launching a project under a permissive license, like MIT or Apache, to attract users and contributors. As adoption grows and businesses start relying on it, the company suddenly switches to a more restrictive license, such as SSPL or BSL. This change limits how others can use or monetize the project, effectively forcing companies to either start paying for commercial licenses or scramble to find an alternative. It’s a move that has happened before.

 But that doesn’t mean there’s no business behind it. The ecosystem around DuckDB today is built on three key players. First, there’s the **DuckDB Foundation**, which ensures the project stays fully open and independent. Then, there’s **[DuckDB Labs](https://duckdblabs.com/)**, a company founded by the database’s creators to provide enterprise support, consultancy, and further development. And finally, there’s **[MotherDuck](https://motherduck.com/)**, a cloud-backed version of DuckDB designed for those who want flexibility beyond their local machines. While the DuckDB founders don’t own MotherDuck outright, they do hold a stake in the company, keeping them closely tied to its future.  

<p align="center">
  <img src="companies-structure.svg" alt="Companies Structure" width="80%">
</p>

This setup keeps DuckDB free, open, and community-driven while still offering commercial options for those who need extra support or cloud capabilities. No corporate lock-in, no bait-and-switch.

---
## Transactions and Analytics

If you’ve worked with [SQLite](https://www.sqlite.org/), you already know the appeal: a lightweight, zero-setup database. DuckDB takes that same philosophy (and has the same vibe) but applies it to analytical workloads instead of transactions.  

Databases generally fall into two camps:  
- **OLTP (Online Transaction Processing)** – Think PostgreSQL, MySQL, SQLite. These databases handle _frequent, small transactions_, like updating a user profile or processing an online order.  
- **OLAP (Online Analytical Processing)** – Think Snowflake, BigQuery, DuckDB. These databases are designed for _complex queries on large datasets_, like computing monthly revenue across millions of transactions.  

While most OLAP databases live in the cloud with a client-server architecture, DuckDB flips the script by keeping everything **local**. No clusters, no network latency - just raw analytical power on your machine.  

---
## The Big Data Myth

<p align="center">
  <img src="big-data.png" alt="Big Data" width="80%">
</p><p align="center" style="font-size: 0.9em; color: gray;"> Photo by 
  <a href="https://unsplash.com/pt-br/@sortino" target="_blank" style="color: gray;">Joshua Sortino</a>.
</p>

Somewhere along the way, _Big Data_ became the default mindset. If you’re working with data, the assumption is that you need a distributed system, a cloud cluster, and an army of node just to run a few queries. But let’s be real - **most workloads aren’t that big**. What we actually need is fast, efficient processing on modern hardware - and that’s exactly where DuckDB shines.  

Distributed systems are great when you truly need them, but they come with complexity, cost, and operational headaches. Debugging across multiple nodes? Painful. Managing clusters? Expensive. The truth is, modern local machines are ridiculously powerful - multi-core CPUs, plenty of RAM, fast SSDs. You can process millions of rows locally without breaking a sweat.  

That’s why DuckDB goes against the grain. Instead of scaling out, it **scales down**, running entirely in-process. No clusters, no network overhead - just raw speed. It’s designed to handle analytical workloads efficiently on a single machine, avoiding the unnecessary baggage of distributed architectures.  

So before spinning up a fleet of servers, ask yourself: do you really need it? If your dataset fits in memory, if you’re doing ad-hoc analysis, or if you just want a simple, no-fuss analytics engine, DuckDB might be all you need. In a world obsessed with scaling out, sometimes the best move is to keep it local.

---
## Into Action

DuckDB is ridiculously easy to get started with - no servers, no setup headaches. You can run it directly from the command line, embed it inside applications, or use it as a database library in languages like C++, Python, Rust, and so on. But for me, the real magic happens in Python.  

With its seamless integration into Pandas, Polars, and Apache Arrow, DuckDB feels like it was made for data analysis. Instead of dealing with a heavyweight database setup, you can just load your data, run SQL queries on DataFrames, and get results instantly - all within a Python environment.

When it comes to exploring data like this, **Jupyter Notebooks** are my go-to - whether it’s a [pure Jupyter setup](https://jupyter.org/install), the [native VS Code support](https://code.visualstudio.com/docs/datascience/jupyter-notebooks), or even [Google Colab](https://colab.google/). They’re great for prototyping because you can run each step independently, check the results instantly, and tweak things without rerunning the entire script or setting up breakpoints. It’s a fast, flexible way to iterate, making it a perfect match for DuckDB. So let’s skip the fluff and get it running.  

DuckDB can be installed directly from [PyPI](https://pypi.org/project/duckdb/). Since it's a pre-compiled binary, there are no external dependencies - just install and go. Pretty slick.

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

Let’s fire up DuckDB as an **in-memory** database:

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

Did you notice something interesting? We referenced a Python variable inside an SQL query. Since DuckDB runs inside Python, it can access local variables - meaning you can directly query Python datasets using SQL.

For example, let’s create a dataset in Pandas and query it using DuckDB:

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

Instead of relying on DuckDB automatically recognizing variable names, I prefer to explicitly register Python variables as tables. This keeps the code a bit more readable, preventing unexpected behavior in larger scripts.

```python
connection.register("movies", movies)
```

Switching between DuckDB and Pandas is effortless. We can take any query result and turn it into a [Pandas DataFrame](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.html) in a single step:

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

If you're used to SQL, DuckDB has some neat tricks up its sleeve. It offers what they call "[friendly SQL](https://duckdb.org/docs/stable/sql/dialect/friendly_sql.html)" - a set of enhancements that make queries more concise and powerful. 

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

The `genres` column is another great example. Each movie can have multiple genres stored as a pipe-separated string. DuckDB lets us split these:

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

So far, we've been running everything in-memory, which is great for quick analysis. But sometimes, we need something more permanent - maybe you want to store multiple tables, perform joins, or keep your data available across sessions. That’s where DuckDB’s **persistent** storage comes in. Instead of parsing `.csv` files every time, we can load everything into a `.duckdb` file and even store it in the cloud.

```python
connection = duckdb.connect(database="database.duckdb", read_only=False)
```

To automate the process, let’s load all the CSV files into DuckDB with a quick loop:

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

We scratched the surface of DuckDB’s capabilities, but it’s already clear that this tool has serious potential. It’s being used in production by some of the biggest names in data, and I wouldn’t be surprised if it keeps growing its adoption.

For now, it’s my go-to for personal projects. Haven’t had a chance to use it in production yet, but I’m pretty sure that opportunity will come soon.

Want to learn more? I highly recommend following [Mehdio](https://www.mehdio.com/) from MotherDuck and checking out the [Talk Python to Me](https://talkpython.fm/) episode [#491](https://talkpython.fm/episodes/show/491/duckdb-and-python-ducks-and-snakes-living-together) with [Alex Monahan](https://www.linkedin.com/in/alex-monahan-64814292/) from DuckDB Labs.

Have you worked with DuckDB? How does it fit into your workflow? 
Reach out - I’d love to hear your thoughts and experiences!