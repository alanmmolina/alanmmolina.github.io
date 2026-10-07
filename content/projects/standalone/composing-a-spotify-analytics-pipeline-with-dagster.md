---
title: Composing a Spotify Analytics Pipeline with Dagster
date: 2025-04-21
draft: false
tags:
  - projects
  - standalone
  - data-engineering
  - dagster
  - duckdb
---
---

The fastest way to understand an asset-first orchestrator is to build something real with it. This is a **Spotify** analytics pipeline in [[notes/tools/dagster|Dagster]], from API call to the numbers I actually wanted to look at.

The pipeline extracts artist data from **Spotify**, pushes it through a Medallion Architecture (`bronze` → `silver` → `gold`), and lands consolidated artist insights ready for analysis.

Data Engineering with a soundtrack.

---
## Project Overview

<p align="center">
  <img src="dagster-spotify-architecture.svg" alt="Architecture Overview" width="100%">
</p>

The pipeline collects artist data from **Spotify** and refines it through three layers. `bronze` is raw `.json` pulled straight from **Spotify**'s API using **Python**. `silver` is transformed, structured `.parquet` written with [[notes/tools/duckdb|DuckDB]]. `gold` consolidates metrics into `.parquet`, also via [[notes/tools/duckdb|DuckDB]].

The layers also keep the scope honest. This is about what [[notes/tools/dagster|Dagster]] can do with a real extraction, not about building a complete Data Lake with historical versioning.

---
## Setting the Stage

Setting up takes one **Python** environment. [[notes/tools/dagster|Dagster]] is a **Python** framework, so there is no separate infrastructure or services to stand up before the first asset runs.

For dependencies I'm using `uv`. It resolves and installs fast and makes virtual environments less painful than the usual tools. A few packages go in `pyproject.toml`:

```toml
dependencies = [
	"dagster>=1.10.6",
    "dagster-webserver>=1.10.6",
    "dagster-duckdb>=0.26.6",
    "requests>=2.32.3",
]
```

[[notes/tools/dagster|Dagster]] also needs a little configuration to sit comfortably next to modern **Python** tooling. Two blocks in `pyproject.toml`:

```toml
[tool.dagster]
module_name = "project.definitions"
code_location_name = "project"

[tool.setuptools.packages.find]
include = ["project"]

```

I called this project `project`. Yes, I know, I've truly been blessed with the gift of creativity.

A larger project would split these into separate folders per component type. For a demonstration, flat is fine:

```
.
├── data
│   ├── bronze
│   ├── silver
│   └── gold
├── project
│   ├── assets.py
│   ├── definitions.py
│   ├── partitions.py
│   └── resources.py
└── pyproject.toml
```

The `data` directories mirror the Medallion layers. Inside the package, the code splits into **assets**, **resources** and **partitions**, which matches [[notes/tools/dagster|Dagster]]'s component model.

One `.env` in the root holds the **Spotify** API credentials. Fine for a tutorial. Production wants a secrets manager.

```bash
SPOTIFY_API_CLIENT_ID=...
SPOTIFY_API_CLIENT_SECRET=...
```

That's the whole setup. From here it's pipeline code.

---
## Setting Up the Resources

The resource needs credentials first. Register an application in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/) and take the client ID and secret from it. Those two values are what the pipeline uses to authenticate.

```python
# ./resources.py

import base64
import time
from typing import Any, Optional

import requests
from dagster import ConfigurableResource
from pydantic import BaseModel


class SpotifyAPIError(Exception):
    """Exception raised for Spotify API errors."""
    pass


class SpotifyToken(BaseModel):
    """Spotify authentication token with expiration tracking."""

    access_token: str
    expires_at: float

    def is_valid(self) -> bool:
        """Check if token is still valid."""
        return time.time() < self.expires_at


class SpotifyAPI(ConfigurableResource):
    """Resource for interacting with the Spotify Web API."""

    client_id: str
    client_secret: str

    # API endpoints and constants
    BASE_URL: str = "https://api.spotify.com/v1"
    AUTH_URL: str = "https://accounts.spotify.com/api/token"
    TOKEN_EXPIRY_BUFFER: int = 300  # 5 minutes safety buffer

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._token: Optional[SpotifyToken] = None

    def _get_auth_token(self) -> str:
        """Get or refresh Spotify authentication token using client credentials flow."""
        # Return cached token if still valid
        if self._token and self._token.is_valid():
            return self._token.access_token

        # Prepare authentication credentials
        credentials: str = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode("utf-8")
        ).decode("utf-8")

        response: requests.Response = requests.post(
            url=self.AUTH_URL,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
        )
        if response.status_code != 200:
            raise SpotifyAPIError(f"Authentication failed: {response.text}")

        # Create token with calculated expiry time
        result: dict[str, Any] = response.json()
        self._token = SpotifyToken(
            access_token=result["access_token"],
            expires_at=time.time() + result["expires_in"] - self.TOKEN_EXPIRY_BUFFER,
        )

        return self._token.access_token

    def _make_api_request(
        self, endpoint: str, params: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """Make authenticated request to Spotify API with automatic token refresh."""
        url: str = f"{self.BASE_URL}/{endpoint}"

        # Get token and make requests
        response: requests.Response = requests.get(
            url=url,
            headers={"Authorization": f"Bearer {self._get_auth_token()}"},
            params=params,
        )

        # If unauthorized, token might be expired - refresh and retry once
        if response.status_code == 401:
            self._token = None
            response = requests.get(
                url=url,
                headers={"Authorization": f"Bearer {self._get_auth_token()}"},
                params=params,
            )
        if response.status_code != 200:
            raise SpotifyAPIError(f"API request failed: {response.status_code} - {response.text}")

        return response.json()

    def _get_artist_id(self, artist: str) -> str:
        """Search for an artist by name and return their Spotify ID."""
        params: dict[str, Any] = {
            "q": f"artist:{artist}",
            "type": "artist",
            "limit": 1,
        }
        response: dict[str, Any] = self._make_api_request(endpoint="search", params=params)
        items: list[dict[str, Any]] = response.get("artists", {}).get("items", [])
        if not items:
            raise SpotifyAPIError(f"No artists found for '{artist}'")
        return items[0]["id"]

    def get_artist(self, artist: str) -> dict[str, Any]:
        """Get all albums for an artist"""
        id: str = self._get_artist_id(artist=artist)
        results: dict[str, Any] = self._make_api_request(endpoint=f"artists/{id}")
        return results

    def get_artist_albums(self, artist: str) -> list[dict[str, Any]]:
        """Get all albums for an artist by name."""
        id: str = self._get_artist_id(artist=artist)
        results: dict[str, Any] = self._make_api_request(
            endpoint=f"artists/{id}/albums", params={"limit": 50, "market": "BR"}
        )
        if "items" not in results:
            raise SpotifyAPIError("Unexpected API response: 'items' field missing")
        return results["items"]

    def get_artist_top_tracks(self, artist: str) -> list[dict[str, Any]]:
        """Get top tracks for an artist by name."""
        id: str = self._get_artist_id(artist=artist)
        results: dict[str, Any] = self._make_api_request(
            endpoint=f"artists/{id}/top-tracks", params={"market": "BR"}
        )
        if "tracks" not in results:
            raise SpotifyAPIError("Unexpected API response: 'tracks' field missing")
        return results["tracks"]

```

The `SpotifyAPI` resource handles authentication with automatic token refresh, so tokens do not expire mid-run. It raises dedicated exceptions instead of leaking raw HTTP errors, caches the token to cut API calls, and exposes small methods for the exact data the pipeline needs.

Keeping _how to access Spotify_ out of the pipeline logic is what [[notes/tools/dagster|Dagster]] resources are for. Tests swap in a mock resource and the pipeline code does not change.

Fragile pipelines usually leak their integrations everywhere. A resource like this is the difference between debugging auth failures at 2am and forgetting the API is there.

---
## Defining Our Data Partitions

Scope comes next: [partitions](https://docs.dagster.io/etl-pipeline-tutorial/create-and-materialize-partitioned-asset), one per artist:

```python
# ./partitions.py

from dagster import StaticPartitionsDefinition


ARTISTS = StaticPartitionsDefinition(
    partition_keys=[
        "Charlie Brown Jr.",
        "Eminem",
        "Imagine Dragons",
        "Johnny Cash",
        "Linkin Park",
        "Red Hot Chili Peppers",
        "Twenty One Pilots",
    ]
)

```

Each artist is its own partition, so they run independently and in parallel. Refreshing one artist does not touch the others, and adding an artist is a new partition key, not a code change.

I populated the partitions with my favorite artists, from the lyrical storytelling of **Johnny Cash** to the raw energy of **Linkin Park**. There's something satisfying about a pipeline that analyzes the music that soundtracked different phases of my life.

---
## Defining Our Assets

The module starts with imports:

```python
#./assets.py

import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, Optional

from dagster import AssetExecutionContext, AssetKey, MaterializeResult, MetadataValue, asset
from dagster_duckdb import DuckDBResource

from .partitions import ARTISTS
from .resources import SpotifyAPI
```

One utility first, for Data Lake paths:

```python
#./assets.py

class Layer:
    """Access patterns for Data Lake layers."""
    
    @staticmethod
    def _exists(path: str) -> str:
        """Internal method that ensures directory exists for the given path."""
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        return path
    
    @staticmethod
    def bronze(asset: str, artist: Optional[str] = None, mode: Literal["read", "write"] = "read") -> str:
        """Path for `bronze` layer asset."""
        if mode == "read":
            return f"data/bronze/{artist}/{asset}.json" if artist else f"data/bronze/*/{asset}.json"
        return Layer._exists(path=f"data/bronze/{artist}/{asset}.json")
    
    @staticmethod
    def silver(asset: str, mode: Literal["read", "write"] = "read") -> str:
        """Path for `silver` layer asset."""
        path: str = f"data/silver/{asset}"
        return f"{path}/*/*.parquet" if mode == "read" else Layer._exists(path=path)
    
    @staticmethod
    def gold(asset: str, mode: Literal["read", "write"] = "read") -> str:
        """Path for `gold` layer asset."""
        path: str = f"data/gold/{asset}"
        return f"{path}/*.parquet" if mode == "read" else Layer._exists(path=path)
```

`Layer` gives every stage of the pipeline the same path rules: read globs, write paths, and directory creation on the way out. Path consistency is one of those Data Engineering problems that looks small until it is not, and abstracting it means the transformation code stays about transformations. It saves the debugging session where the file is somewhere you did not expect.

---
### `bronze`

`bronze` is extraction and nothing else: pull from **Spotify**, keep the response as it arrived. The first asset:

```python
#./assets.py

@asset(
    name="artist",
    key_prefix="bronze",
    group_name="spotify",
    partitions_def=ARTISTS,
    kinds={"bronze", "python", "json"},
    description="Artist profile data from Spotify API in raw json format.",
)
def bronze__artist(context: AssetExecutionContext, spotify: SpotifyAPI) -> MaterializeResult:
    artist: str = context.partition_key
    path: str = Layer.bronze(asset="artist", artist=artist, mode="write")
    data: dict = spotify.get_artist(artist=artist)

    with open(file=path, mode="w") as file:
        json.dump(data, file, indent=2)

    return MaterializeResult(
        metadata={
            "Artist": MetadataValue.text(artist),
            "File": MetadataValue.path(path),
            "File Size (KB)": MetadataValue.float(os.path.getsize(path) / 1024),
            "Timestamp": MetadataValue.timestamp(datetime.now(UTC)),
        }
    )
```

One job: extract artist data from the **Spotify** API and store it as raw `.json`. The simplicity is the point. Nothing transforms here, so nothing can corrupt the raw copy.

A few choices to notice. Partitioning means one artist per run, which keeps scheduling flexible. The asset returns metadata about what it produced, so [[notes/tools/dagster|Dagster]]'s UI can show it. Paths go through `Layer` like everything else.

The same pattern covers albums and top tracks:

```python
#./assets.py

@asset(
    name="artist_albums",
    key_prefix="bronze",
    group_name="spotify",
    partitions_def=ARTISTS,
    kinds={"bronze", "python", "json"},
    description="Artist album catalog from Spotify API in raw json format."
)
def bronze__artist_albums(context: AssetExecutionContext, spotify: SpotifyAPI) -> MaterializeResult:
    artist: str = context.partition_key
    path: str = Layer.bronze(asset="artist_albums", artist=artist, mode="write")
    data: dict = spotify.get_artist_albums(artist=artist)

    with open(file=path, mode="w") as file:
        json.dump(data, file, indent=2)

    return MaterializeResult(
        metadata={
            "Artist": MetadataValue.text(artist),
            "File": MetadataValue.path(path),
            "File Size (KB)": MetadataValue.float(os.path.getsize(path) / 1024),
            "Timestamp": MetadataValue.timestamp(datetime.now(UTC)),
        }
    )


@asset(
    name="artist_top_tracks",
    key_prefix="bronze",
    group_name="spotify",
    partitions_def=ARTISTS,
    kinds={"bronze", "python", "json"},
    description="Artist top tracks from Spotify API in raw json format."
)
def bronze__artist_top_tracks(context: AssetExecutionContext, spotify: SpotifyAPI) -> MaterializeResult:
    artist: str = context.partition_key
    path: str = Layer.bronze(asset="artist_top_tracks", artist=artist, mode="write")
    data: dict = spotify.get_artist_top_tracks(artist=artist)

    with open(file=path, mode="w") as file:
        json.dump(data, file, indent=2)

    return MaterializeResult(
        metadata={
            "Artist": MetadataValue.text(artist),
            "File": MetadataValue.path(path),
            "File Size (KB)": MetadataValue.float(os.path.getsize(path) / 1024),
            "Timestamp": MetadataValue.timestamp(datetime.now(UTC)),
        }
    )

```

Same shape, different API endpoints. Album data can refresh without re-fetching profiles or tracks.

---
### `silver`

`silver` turns the raw capture into something analytics can use. The first one:

```python
#./assets.py

@asset(
    name="artist",
    key_prefix="silver",
    group_name="spotify",
    partitions_def=ARTISTS,
    kinds={"silver", "duckdb", "parquet"},
    deps=[AssetKey(["bronze", "artist"])],
    description="Artist profile data from Spotify API in structured parquet format.",
)
def silver__artist(context: AssetExecutionContext, duckdb: DuckDBResource) -> MaterializeResult:
    artist: str = context.partition_key
    path: str = Layer.silver(asset="artist", mode="write")

    with duckdb.get_connection() as connection:
        connection.execute(
            query=f"""
            COPY (
                SELECT 
                    name AS artist, 
                    id, 
                    genres, 
                    popularity, 
                    followers.total AS total_followers
                FROM read_json_auto('{Layer.bronze(asset="artist", artist=artist, mode="read")}')
            ) TO '{path}'
            (FORMAT parquet, PARTITION_BY artist, OVERWRITE_OR_IGNORE);
        """
        )

    return MaterializeResult(
        metadata={
            "Artist": MetadataValue.text(artist),
            "File": MetadataValue.path(path),
            "File Size (KB)": MetadataValue.float(os.path.getsize(path) / 1024),
            "Timestamp": MetadataValue.timestamp(datetime.now(UTC)),
        }
    )
```

Raw artist `.json` becomes structured `.parquet` through [[notes/tools/duckdb|DuckDB]]. The query keeps only the fields we need (`name`, `id`, `genres` and friends), flattens nested structures like `followers`, and writes the output partitioned by artist so the organization pattern holds through the pipeline.

[[notes/tools/duckdb|DuckDB]] is the right tool for `silver` and `gold`. `read_json_auto()` infers schemas from nested structures without hand-written DDL. The SQL is ordinary SQL, which means `UNNEST` handles the nested artist arrays without ceremony. And `.parquet` output comes out as columnar storage the analytical queries can use directly, which is what the Medallion layers want anyway.

The same pattern covers albums and top tracks:

```python
#./assets.py

@asset(
    name="artist_albums",
    key_prefix="silver",
    group_name="spotify",
    partitions_def=ARTISTS,
    kinds={"silver", "duckdb", "parquet"},
    deps=[AssetKey(["bronze", "artist_albums"])],
    description="Artist album catalog from Spotify API in structured parquet format.",
)
def silver__artist_albums(context: AssetExecutionContext, duckdb: DuckDBResource) -> MaterializeResult:
    artist: str = context.partition_key
    path: str = Layer.silver(asset="artist_albums", mode="write")

    with duckdb.get_connection() as connection:
        connection.execute(
            query=f"""
                COPY (
                    SELECT
                        artists.unnest.name AS artist,
                        artists.unnest.id AS artist_id,
                        albums.id, 
                        albums.name, 
                        albums.release_date, 
                        albums.total_tracks, 
                        albums.album_type
                    FROM read_json_auto('{Layer.bronze(asset="artist_albums", mode="read")}') AS albums,
                    UNNEST(albums.artists) AS artists
                ) TO '{path}'
                (FORMAT parquet, PARTITION_BY artist, OVERWRITE_OR_IGNORE);
            """
        )

    return MaterializeResult(
        metadata={
            "Artist": MetadataValue.text(artist),
            "File": MetadataValue.path(path),
            "File Size (KB)": MetadataValue.float(os.path.getsize(path) / 1024),
            "Timestamp": MetadataValue.timestamp(datetime.now(UTC)),
        }
    )


@asset(
    name="artist_top_tracks",
    key_prefix="silver",
    group_name="spotify",
    partitions_def=ARTISTS,
    kinds={"silver", "duckdb", "parquet"},
    deps=[AssetKey(["bronze", "artist_top_tracks"])],
    description="Artist top tracks from Spotify API in structured parquet format.",
)
def silver__artist_top_tracks(context: AssetExecutionContext, duckdb: DuckDBResource) -> MaterializeResult:
    artist: str = context.partition_key
    path: str = Layer.silver(asset="artist_top_tracks", mode="write")

    with duckdb.get_connection() as connection:
        connection.execute(
            query=f"""
                COPY (
                    SELECT 
                        artists.unnest.name AS artist,
                        artists.unnest.id AS artist_id,
                        tracks.album.id AS album_id,
                        tracks.id,
                        tracks.name,
                        tracks.duration_ms,
                        tracks.explicit,
                        tracks.popularity,
                        tracks.is_local,
                        tracks.is_playable,
                        tracks.track_number
                    FROM 
                        read_json_auto('{Layer.bronze(asset="artist_top_tracks", mode="read")}') AS tracks,
                        UNNEST(tracks.artists) AS artists
                ) TO '{path}'
                (FORMAT parquet, PARTITION_BY artist, OVERWRITE_OR_IGNORE);
            """
        )

    return MaterializeResult(
        metadata={
            "Artist": MetadataValue.text(artist),
            "File": MetadataValue.path(path),
            "File Size (KB)": MetadataValue.float(os.path.getsize(path) / 1024),
            "Timestamp": MetadataValue.timestamp(datetime.now(UTC)),
        }
    )

```

Albums keep type and release dates. Tracks keep popularity and the usual details. Both unnest the artist arrays **Spotify** nests inside each response.

---
### `gold`

`gold` is where the layers become something worth looking at:

```python
#./assets.py

@asset(
    name="artist_insights",
    key_prefix="gold",
    group_name="spotify",
    kinds={"gold", "duckdb", "parquet"},
    deps=[
        AssetKey(["silver", "artist"]),
        AssetKey(["silver", "artist_top_tracks"]),
        AssetKey(["silver", "artist_albums"]),
    ],
    description="Consolidated artist insights combining profile, album, and track metrics.",
)
def gold__artist_insights(context: AssetExecutionContext, duckdb: DuckDBResource) -> MaterializeResult:
    path: str = Layer.gold(asset="artist_insights", mode="write")

    with duckdb.get_connection() as connection:
        connection.execute(
            query=f"""
            COPY (
                -- Base artist information
                WITH artist_base AS (
                    SELECT 
                        artist,
                        id AS artist_id,
                        popularity AS artist_popularity,
                        total_followers
                    FROM '{Layer.silver(asset="artist", mode="read")}'
                ),
                
                -- Album metrics aggregated by artist
                album_metrics AS (
                    SELECT 
                        artist_id,
                        AVG(total_tracks) AS avg_tracks_per_album,
                        MIN(release_date) AS first_album_date,
                        MAX(release_date) AS latest_album_date
                    FROM '{Layer.silver(asset="artist_albums", mode="read")}'
                    GROUP BY artist_id
                ),
                
                -- Track metrics aggregated by artist
                track_metrics AS (
                    SELECT 
                        artist_id,
                        AVG(popularity) AS avg_track_popularity,
                        AVG(duration_ms)/1000 AS avg_track_duration_seconds,
                        SUM(CASE WHEN explicit THEN 1 ELSE 0 END)::FLOAT / COUNT(id) * 100 AS explicit_content_percentage
                    FROM '{Layer.silver(asset="artist_top_tracks", mode="read")}'
                    GROUP BY artist_id
                ),
                
                -- Top track for each artist
                top_tracks AS (
                    SELECT DISTINCT ON (artist_id)
                        artist_id,
                        id AS track_id,
                        name AS track_name,
                        popularity AS track_popularity,
                        album_id
                    FROM '{Layer.silver(asset="artist_top_tracks", mode="read")}'
                    ORDER BY artist_id, popularity DESC
                ),
                
                -- Album info for lookup
                album_lookup AS (
                    SELECT 
                        id AS album_id, 
                        name AS album_name
                    FROM '{Layer.silver(asset="artist_albums", mode="read")}'
                )
                
                -- Final insights table
                SELECT
                    artist_info.artist,
                    artist_info.artist_id,
                    artist_info.artist_popularity,
                    artist_info.total_followers,
                    
                    -- Album metrics
                    artist_albums.avg_tracks_per_album,
                    artist_albums.first_album_date,
                    artist_albums.latest_album_date,
                    
                    -- Track metrics
                    artist_tracks.avg_track_popularity,
                    artist_tracks.avg_track_duration_seconds,
                    artist_tracks.explicit_content_percentage,
                    
                    -- Top track info
                    popular_track.track_name AS top_track_name,
                    popular_track.track_popularity AS top_track_popularity,
                    track_album.album_name AS top_track_album
                    
                FROM artist_base AS artist_info
                LEFT JOIN album_metrics AS artist_albums 
                    ON artist_info.artist_id = artist_albums.artist_id
                LEFT JOIN track_metrics AS artist_tracks 
                    ON artist_info.artist_id = artist_tracks.artist_id
                LEFT JOIN top_tracks AS popular_track 
                    ON artist_info.artist_id = popular_track.artist_id
                LEFT JOIN album_lookup AS track_album 
                    ON popular_track.album_id = track_album.album_id
            ) TO '{path}'
            (FORMAT parquet, OVERWRITE);
            """
        )

    return MaterializeResult(
        metadata={
            "File": MetadataValue.path(path),
            "File Size (KB)": MetadataValue.float(os.path.getsize(path) / 1024),
            "Timestamp": MetadataValue.timestamp(datetime.now(UTC)),
        }
    )
```

The `gold` asset joins all three `silver` datasets into one row per artist. Unlike `bronze` and `silver`, which process one artist at a time, it aggregates across all of them.

The query is longer because the output is richer. CTEs split the work: base artist info, album metrics, track metrics. Averages like tracks-per-album and track popularity come out of the aggregations, and a `DISTINCT ON` picks each artist's most popular track. Everything joins into one row per artist.

The dataset answers the questions worth asking: who has the highest track popularity, how duration correlates with it, how much of a catalog is explicit. `gold` is the layer that ends up in front of people. It is the reason the careful parts underneath exist.

---
## Setting Up the Definitions

Last piece is wiring. A *dunder init* file would work; a dedicated `definitions.py` is clearer:

```python
# ./definitions.py

import os

from dagster import Definitions, load_assets_from_modules
from dagster_duckdb import DuckDBResource

from . import assets, resources

SPOTIFY_API_CLIENT_ID: str = os.getenv("SPOTIFY_API_CLIENT_ID")
SPOTIFY_API_CLIENT_SECRET: str = os.getenv("SPOTIFY_API_CLIENT_SECRET")

defs = Definitions(
    assets=load_assets_from_modules([assets]),
    resources={
        "spotify": resources.SpotifyAPI(
            client_id=SPOTIFY_API_CLIENT_ID,
            client_secret=SPOTIFY_API_CLIENT_SECRET,
        ),
        "duckdb": DuckDBResource(
            database=":memory:",
            read_only=False,
        ),
    },
)
```

[[notes/tools/dagster|Dagster]] loads whatever the `Definitions` object holds. Jobs, schedules, and sensors would live here too. Anything that should show up in the [[notes/tools/dagster|Dagster]] UI has to be registered in it.

[[notes/tools/duckdb|DuckDB]] runs in-memory here, which is enough. It is only a processing engine between layers: everything materializes as `.parquet`, so there is no database to persist.

---

## Pressing Play

With the code in place, a local [[notes/tools/dagster|Dagster]] instance is one command. Virtual environment activated:

```sh
dagster dev
```

That initializes the project and opens the local UI:

<p align="center">
  <img src="dagster-spotify-init-ui.png" alt="Dagster UI" width="100%">
</p>

Skipping a full UI tour. The lineage graph renders the assets, dependencies flowing left to right, with a status on each. Nothing is materialized yet, which just means no code has run to produce the data outputs, so every partition reads as missing and the `gold` asset shows _Never materialized._

The tags under each asset (`bronze`, `python`, `json`) say what it is and what it runs on before you open the code. [Kind tags](https://docs.dagster.io/guides/build/assets/metadata-and-tags/kind-tags) cover a long list already, and you can contribute your own.

Materializing one partition shows the loop. Right-click any `bronze` asset and select **Materialize**. The materialization context lists the available partitions: pick one, or all of them for a backfill run. Choose a single one, click **Launch run**, and the status changes live. When it finishes, the details land in the **Asset Catalog**:

<p align="center">
  <img src="dagster-spotify-single-partition-materialization.png" alt="Single Asset (and Partition) Materialization" width="100%">
</p>

The **Overview** tab shows the metadata the code returned. Numeric items get plots for free, which is useful for row counts on anything table-shaped. Other [[notes/tools/dagster|Dagster]] components can read the same metadata programmatically.

The other tabs do what you would expect. **Partitions** tracks each partition's status and run IDs. **Events** is the full materialization history. **Checks** holds quality tests, which this demo skips. **Lineage** draws upstream and downstream dependencies.

Back on the main graph, the white **Materialize All** button opens the same partition context. Select everything and launch. [[notes/tools/dagster|Dagster]] orders the run by the asset and partition dependencies, and files appear in the Medallion folders as each asset completes. When it finishes, every partition reads green:

<p align="center">
  <img src="dagster-spotify-materialize-all.png" alt="All Assets (and Partitions) Materialization" width="100%">
</p>

Green everywhere. Whether the numbers are right is another question.

---
## Analyzing Our Results

I ran this workflow step by step more than once. The output is what matters: query the `artist_insights` `.parquet` with [[notes/tools/duckdb|DuckDB]]:

```sql
SELECT * FROM read_parquet("data/gold/artist_insights")
```

And we get something like:

```
┌───────────────────────┬────────────────────────┬───────────────────┬─────────────────┬──────────────────────┬──────────────────┬───────────────────┬──────────────────────┬────────────────────────────┬─────────────────────────────┬────────────────┬──────────────────────┬───────────────────────────────────┐
│        artist         │       artist_id        │ artist_popularity │ total_followers │ avg_tracks_per_album │ first_album_date │ latest_album_date │ avg_track_popularity │ avg_track_duration_seconds │ explicit_content_percentage │ top_track_name │ top_track_popularity │          top_track_album          │
│        varchar        │        varchar         │       int64       │      int64      │        double        │     varchar      │      varchar      │        double        │           double           │            float            │    varchar     │        int64         │              varchar              │
├───────────────────────┼────────────────────────┼───────────────────┼─────────────────┼──────────────────────┼──────────────────┼───────────────────┼──────────────────────┼────────────────────────────┼─────────────────────────────┼────────────────┼──────────────────────┼───────────────────────────────────┤
│ Charlie Brown Jr.     │ 1on7ZQ2pvgeQF4vmIA09x5 │                77 │         8297699 │   14.681818181818182 │ 1997-01-01       │ 2024-11-29        │                 71.8 │         209.86010000000002 │                         0.0 │ Zóio De Lula   │                   74 │ Preço Curto, Prazo Longo          │
│ Eminem                │ 7dGJo4pcD2V6oG8kP0tJRR │                92 │        99748616 │                 10.3 │ 1996-11-12       │ 2024-12-12        │                 84.7 │         290.09229999999997 │                       100.0 │ Without Me     │                   89 │ The Eminem Show                   │
│ Imagine Dragons       │ 53XhwfbYqKCa1cC15pYq2q │                88 │        57006678 │                 5.58 │ 2012-09-04       │ 2025-02-21        │                 83.4 │                   193.8215 │                         0.0 │ Believer       │                   88 │ Evolve                            │
│ Johnny Cash           │ 6kACVPfCOnqzgfEF5ryl0x │                76 │         6711049 │                19.88 │ 1979-05-01       │ 2025-02-11        │                 70.4 │         181.71089999999998 │                         0.0 │ Hurt           │                   76 │ American IV: The Man Comes Around │
│ Linkin Park           │ 6XyY86QOPPrYVGvF9ch6wz │                90 │        29644064 │                11.74 │ 2000-10-24       │ 2025-03-27        │                 85.1 │                    189.262 │                        10.0 │ Numb           │                   90 │ NULL                              │
│ Red Hot Chili Peppers │ 0L8ExT028jH3ddEcZwqJJ5 │                85 │        22377753 │    10.28888888888889 │ 1984-08-10       │ 2022-11-25        │                 82.2 │                    270.201 │                         0.0 │ Can't Stop     │                   88 │ By the Way (Deluxe Edition)       │
│ Twenty One Pilots     │ 3YQKmKGau1PzlVlkL1iodx │                85 │        25286775 │     4.67741935483871 │ 2009-12-29       │ 2025-04-09        │                 79.6 │                   212.5751 │                         0.0 │ Stressed Out   │                   87 │ Blurryface                        │
└───────────────────────┴────────────────────────┴───────────────────┴─────────────────┴──────────────────────┴──────────────────┴───────────────────┴──────────────────────┴────────────────────────────┴─────────────────────────────┴────────────────┴──────────────────────┴───────────────────────────────────┘
```

The artist with the most followers is **Eminem**, at nearly 100 million, and to no one's surprise 100% of the tracks we pulled are explicit. **Imagine Dragons** sit second at 57 million followers, but **Linkin Park** scores higher on popularity. **Spotify**'s API docs explain it: popularity is calculated from an artist's tracks, not from follower count. I think few would disagree that **Johnny Cash**'s version of Hurt beats the original by **Nine Inch Nails**, and the data backs me up, it is his most popular track. **Imagine Dragons**' Believer showing up as their top track is the one I did not expect to feel anything about. It is my favorite song and it played at my wedding.

---

That is the pipeline, built with free and open-source tools. The pattern holds at larger scale too: a handful of artists or thousands, the architecture does not change. [[notes/tools/dagster|Dagster]]'s asset-oriented approach is the part that grows.

Natural next steps: more artists, scheduled refreshes with [[notes/tools/dagster|Dagster]]'s scheduler, or a dashboard pointed at the insights.

The design is simplified on purpose, since this project is about [[notes/tools/dagster|Dagster]]'s asset-oriented approach. Two things it does not cover: **Spotify**'s extraction volume limits, and unhandled [[notes/tools/duckdb|DuckDB]] multi-write errors, which show up in more complex implementations.

It was a fun one to build.

---

## Encore: Applying the Factory Pattern

DRY matters in the asset definitions too, and [[notes/tools/dagster|Dagster]] leaves room for abstraction here. A factory pattern turns asset creation into something closer to production. **Dagster**'s [Factory Patterns in Python](https://dagster.io/blog/python-factory-patterns) is the writeup worth reading on it.

Start with a `.yaml` file defining the assets:

```yaml
# encore/assets.yaml

bronze:
  - name: artist
    description: Artist profile data from Spotify API in raw json format.
  
  - name: artist_albums
    description: Artist album catalog from Spotify API in raw json format.
  
  - name: artist_top_tracks
    description: Artist top tracks from Spotify API in raw json format.
```

[[notes/tools/pydantic|Pydantic]] models give the abstraction type checking and validation:

```python
# encore/assets.py

class Metadata(BaseModel):
    """Pydantic model for asset metadata."""

    artist: str = Field(..., description="Artist name from partition key")
    file: Path = Field(..., description="Path to the asset file")

    def to_dagster_metadata(self) -> dict[str, MetadataValue]:
        """Convert this model to Dagster metadata."""
        return {
            "Artist": MetadataValue.text(self.artist),
            "File": MetadataValue.path(str(self.file)),
            "File Size (KB)": MetadataValue.float(self.file.stat().st_size / 1024),
            "Timestamp": MetadataValue.timestamp(datetime.now(UTC)),
        }


class BronzeAssetSpec(BaseModel):
    """Pydantic model for bronze layer asset specification."""

    name: str
    description: str

    @computed_field
    def api_method(self) -> str:
        """Derive API method name from asset name."""
        return f"get_{self.name}"
```

`AssetFactory` does the generating. This one only covers `bronze`, but the same shape extends to `silver` and `gold`. The idea: a function that returns asset-decorated functions, so every configuration knob for asset creation becomes a parameter:

```python
# encore/assets.py

class AssetFactory:
    """Factory for creating Spotify data assets."""

    @staticmethod
    def bronze(spec: BronzeAssetSpec) -> AssetsDefinition:
        """Create a bronze layer asset from a specification."""

        @asset(
            name=spec.name,
            key_prefix="bronze",
            group_name="spotify",
            partitions_def=ARTISTS,
            kinds={"bronze", "python", "json"},
            description=spec.description,
        )
        def _(context: AssetExecutionContext, spotify: SpotifyAPI) -> MaterializeResult:
            artist: str = context.partition_key
            path: str = Layer.bronze(asset=spec.name, artist=artist, mode="write")

            # Dynamically call the Spotify resource API method
            api = getattr(spotify, spec.api_method)
            data = api(artist=artist)

            # Write the data
            with open(file=path, mode="w") as file:
                json.dump(data, file, indent=2)

            metadata = Metadata(artist=artist, file=path)
            return MaterializeResult(metadata=metadata.to_dagster_metadata())

        return _
```

Last, `AssetLoader` feeds the `.yaml` into the factory. It reads the config, turns it into validated [[notes/tools/pydantic|Pydantic]] models, and hands those over:

```python
# encore/assets.py

class AssetLoader:
    """Loads and creates assets from configuration."""

    @staticmethod
    @cache
    def load_config(path: str) -> dict:
        """Load and cache asset configuration."""
        return yaml.safe_load(Path(path).read_text())

    @classmethod
    def bronze(cls, path: str = "project/encore/assets.yaml") -> list[AssetsDefinition]:
        """Create all bronze assets from the configuration file."""
        config: dict = cls.load_config(path)
        specs: list[BronzeAssetSpec] = [
            BronzeAssetSpec.model_validate(item) for item in config["bronze"]
        ]

        # Create dictionary of assets using dictionary comprehension
        return [AssetFactory.bronze(spec) for spec in specs]
```

Loading them is one line:

```python
# encore/assets.py

assets: list[AssetsDefinition] = AssetLoader.bronze()
```

When we start our local [[notes/tools/dagster|Dagster]] instance, the `bronze` assets will appear in the UI:

<p align="center">
  <img src="dagster-spotify-factory-bronze-models.png" alt="Factory Generated Bronze Assets" width="100%">
</p>

A new asset now means a new entry in `.yaml`, not a code change. Configuration sits apart from implementation, which is the part that keeps a codebase adaptable.

Whether it is worth the abstraction depends on how many assets you have. Three or four similar ones is where it starts paying; below that, hand-written definitions are fine. Abstraction for its own sake is still a waste. This one buys back the time you would spend typing the same definitions, which is time you can spend on the parts that are actually new.

Write the pattern once.