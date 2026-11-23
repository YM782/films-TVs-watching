#!/usr/bin/env python3
"""Build 300-title movie and TV charts for CineScope.

Ranks 1-250 come from IMDb's public Top 250 charts through the documented
community JSON mirror. Ranks 251-300 are a clearly labelled CineScope
extension calculated from IMDb's official non-commercial bulk datasets.

The extension uses IMDb ratings and vote counts with a Bayesian weighted
rating (m=25,000). It is NOT an official IMDb Top 300 chart.
"""
from __future__ import annotations

import csv
import gzip
import io
import json
import math
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "rankings-top300.json"
CHARTS = {
    "movie": "https://imdb-top250.mmdju.workers.dev/top250?limit=250",
    "tv": "https://imdb-top250.mmdju.workers.dev/toptv?limit=250",
}
DATASETS = {
    "basics": "https://datasets.imdbws.com/title.basics.tsv.gz",
    "ratings": "https://datasets.imdbws.com/title.ratings.tsv.gz",
}
MIN_VOTES = 25_000
BAYESIAN_M = 25_000
USER_AGENT = "CineScope-Journal/1.0 (personal non-commercial film catalog)"


def open_url(url: str):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
    )
    return urllib.request.urlopen(request, timeout=180)


def get_json(url: str) -> dict:
    last_error = None
    for attempt in range(4):
        try:
            with open_url(url) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code == 429 or 500 <= exc.code < 600:
                time.sleep(2 ** attempt)
                continue
            detail = exc.read().decode("utf-8", "replace")[:500]
            raise RuntimeError(f"HTTP {exc.code} for {url}: {detail}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Could not fetch {url}: {last_error}")


def rows_from_chart(payload: dict) -> list[dict]:
    rows = payload if isinstance(payload, list) else (
        payload.get("data") or payload.get("items") or payload.get("results") or []
    )
    if not isinstance(rows, list):
        raise RuntimeError("IMDb chart response did not contain a list.")
    return rows


def imdb_id(item: dict) -> str:
    for value in (item.get("id"), item.get("imdb_id"), item.get("url"), item.get("link")):
        match = re.search(r"tt\d{5,}", str(value or ""))
        if match:
            return match.group(0)
    return ""


def normalize_chart_row(row: dict, kind: str, index: int) -> dict:
    title = str(row.get("title") or row.get("name") or "").strip()
    identifier = imdb_id(row)
    if not title or not identifier:
        raise RuntimeError(f"IMDb chart row {index} is missing a title or IMDb ID: {row}")
    return {
        "rank": int(row.get("rank") or index),
        "id": identifier,
        "title": title,
        "year": str(row.get("year") or ""),
        "rating": float(row["rating"]) if row.get("rating") not in (None, "") else None,
        "votes": int(row.get("votes") or 0),
        "url": f"https://www.imdb.com/title/{identifier}/",
        "rankSource": "IMDb Top 250",
        "kind": kind,
    }


def stream_tsv_gz(url: str):
    """Yield TSV rows without writing the multi-hundred-MB dataset to disk."""
    last_error = None
    for attempt in range(4):
        try:
            response = open_url(url)
            compressed = gzip.GzipFile(fileobj=response)
            text = io.TextIOWrapper(compressed, encoding="utf-8", newline="")
            reader = csv.DictReader(text, delimiter="\t")
            for row in reader:
                yield row
            text.close()
            response.close()
            return
        except (urllib.error.URLError, urllib.error.HTTPError, OSError, EOFError, TimeoutError) as exc:
            last_error = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Could not stream IMDb dataset {url}: {last_error}")


def load_eligible_ratings() -> dict[str, tuple[float, int]]:
    print("Downloading/streaming IMDb title.ratings.tsv.gz…", flush=True)
    ratings: dict[str, tuple[float, int]] = {}
    for row in stream_tsv_gz(DATASETS["ratings"]):
        try:
            votes = int(row["numVotes"])
            rating = float(row["averageRating"])
        except (KeyError, TypeError, ValueError):
            continue
        if votes >= MIN_VOTES and 0 < rating <= 10:
            ratings[row["tconst"]] = (rating, votes)
    print(f"Eligible rated titles: {len(ratings):,}", flush=True)
    return ratings


def title_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").casefold())


def build_extension(kind: str, official_rows: list[dict], ratings: dict[str, tuple[float, int]]) -> list[dict]:
    official_ids = {item["id"] for item in official_rows if item.get("id")}
    title_types = {"movie"} if kind == "movie" else {"tvSeries", "tvMiniSeries"}
    unresolved: dict[tuple[str, str], dict] = {}
    for item in official_rows:
        if not item.get("id"):
            unresolved[(title_key(item["title"]), str(item.get("year") or "")[:4])] = item

    candidates: list[dict] = []
    rating_sum = 0.0
    rating_count = 0

    print(f"Streaming IMDb title.basics.tsv.gz for {kind} extension…", flush=True)
    for row in stream_tsv_gz(DATASETS["basics"]):
        if row.get("titleType") not in title_types:
            continue
        if row.get("isAdult") == "1":
            continue
        identifier = row.get("tconst", "")
        if not identifier:
            continue
        title = (row.get("primaryTitle") or "").strip()
        if not title:
            continue
        start_year = row.get("startYear", "")
        if not start_year.isdigit() or int(start_year) < 1900:
            continue
        if kind == "movie":
            runtime = row.get("runtimeMinutes", "")
            if not runtime.isdigit() or int(runtime) < 45:
                continue

        # The community chart mirror occasionally omits an IMDb ID for a row.
        # Resolve that row against IMDb's own title basics by exact title + year.
        unresolved_key = (title_key(title), start_year)
        missing_chart_row = unresolved.get(unresolved_key)
        if missing_chart_row:
            missing_chart_row["id"] = identifier
            missing_chart_row["url"] = f"https://www.imdb.com/title/{identifier}/"
            rating_data = ratings.get(identifier)
            if rating_data:
                missing_chart_row["rating"], missing_chart_row["votes"] = rating_data
            official_ids.add(identifier)
            del unresolved[unresolved_key]
            continue

        if identifier in official_ids:
            continue
        rating_data = ratings.get(identifier)
        if not rating_data:
            continue
        rating, votes = rating_data
        candidates.append({
            "id": identifier,
            "title": title,
            "year": (
                f"{start_year}–{row['endYear']}"
                if kind == "tv" and row.get("endYear", "").isdigit()
                else start_year
            ),
            "rating": rating,
            "votes": votes,
        })
        rating_sum += rating
        rating_count += 1

    if unresolved:
        titles = ", ".join(item["title"] for item in unresolved.values())
        raise RuntimeError(f"Could not resolve missing IMDb IDs for {kind} chart rows: {titles}")

    # Fill rating/vote fields from IMDb's official ratings dataset when the
    # chart mirror omitted them.
    for item in official_rows:
        if item.get("id") and (item.get("rating") is None or not item.get("votes")):
            rating_data = ratings.get(item["id"])
            if rating_data:
                item["rating"], item["votes"] = rating_data

    if not candidates:
        raise RuntimeError(f"No eligible supplementary {kind} titles were found.")

    average_rating = rating_sum / rating_count
    for item in candidates:
        rating = item["rating"]
        votes = item["votes"]
        item["weightedRating"] = (
            (votes / (votes + BAYESIAN_M)) * rating
            + (BAYESIAN_M / (votes + BAYESIAN_M)) * average_rating
        )

    candidates.sort(
        key=lambda item: (item["weightedRating"], item["votes"], item["title"].casefold()),
        reverse=True,
    )

    extension = []
    for offset, item in enumerate(candidates[:50], start=251):
        identifier = item["id"]
        extension.append({
            "rank": offset,
            "id": identifier,
            "title": item["title"],
            "year": item["year"],
            "rating": round(item["rating"], 1),
            "votes": item["votes"],
            "url": f"https://www.imdb.com/title/{identifier}/",
            "rankSource": "CineScope weighted-rating extension",
            "weightedRating": round(item["weightedRating"], 4),
            "kind": kind,
        })
    return extension


def main() -> int:
    charts: dict[str, list[dict]] = {}
    chart_metadata: dict[str, dict] = {}

    for kind, url in CHARTS.items():
        print(f"Loading IMDb Top 250 {kind} chart…", flush=True)
        payload = get_json(url)
        rows = rows_from_chart(payload)
        if len(rows) < 250:
            raise RuntimeError(f"Expected 250 {kind} chart rows, received {len(rows)}.")
        official = [normalize_chart_row(row, kind, i) for i, row in enumerate(rows[:250], start=1)]
        charts[kind] = official
        chart_metadata[kind] = {
            "source": payload.get("source", "IMDb Top 250 via community JSON mirror") if isinstance(payload, dict) else "IMDb Top 250 via community JSON mirror",
            "updatedAt": payload.get("updatedAt") if isinstance(payload, dict) else None,
        }

    ratings = load_eligible_ratings()
    for kind in ("movie", "tv"):
        charts[kind].extend(build_extension(kind, charts[kind], ratings))
        if len(charts[kind]) != 300:
            raise RuntimeError(f"Expected 300 {kind} titles; generated {len(charts[kind])}.")

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "title": "CineScope Top 300 Movies & TV",
        "counts": {"movie": len(charts["movie"]), "tv": len(charts["tv"])},
        "methodology": {
            "officialRange": "Ranks 1–250 follow the IMDb Top 250 movie or TV chart.",
            "extendedRange": "Ranks 251–300 are a CineScope extension selected from IMDb's official non-commercial datasets using a Bayesian weighted rating; this is not an official IMDb Top 300 ranking.",
            "minimumVotes": MIN_VOTES,
            "bayesianM": BAYESIAN_M,
            "movieTypes": ["movie"],
            "tvTypes": ["tvSeries", "tvMiniSeries"],
            "sources": [
                "https://www.imdb.com/chart/top/",
                "https://www.imdb.com/chart/toptv/",
                "https://datasets.imdbws.com/",
            ],
            "chartMetadata": chart_metadata,
        },
        "movie": charts["movie"],
        "tv": charts["tv"],
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {OUTPUT.relative_to(ROOT)}: 300 movies + 300 TV titles.", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
