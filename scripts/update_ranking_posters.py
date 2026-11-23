#!/usr/bin/env python3
"""Build a static IMDb-ID -> TMDb poster manifest for GitHub Pages.

Required environment variable:
    TMDB_READ_ACCESS_TOKEN  TMDb API Read Access Token (never committed)

The script keeps the API token on the GitHub Actions runner. Only public poster
paths and attribution metadata are written to data/ranking-posters.json.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "ranking-posters.json"
CHARTS = {
    "movie": "https://imdb-top250.mmdju.workers.dev/top250?limit=100",
    "tv": "https://imdb-top250.mmdju.workers.dev/toptv?limit=100",
}
TMDB_API = "https://api.themoviedb.org/3"
TMDB_IMAGE = "https://image.tmdb.org/t/p/w500"
USER_AGENT = "CineScope-Journal/1.0 (personal film catalog)"


def request_json(url: str, token: str | None = None) -> dict | list:
    headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    last_error = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
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
    raise RuntimeError(f"Request failed after retries: {url}: {last_error}")


def rows_from_payload(payload: dict | list) -> list[dict]:
    if isinstance(payload, list):
        return payload
    for key in ("data", "items", "results"):
        value = payload.get(key)
        if isinstance(value, list):
            return value
    return []


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def get_title(item: dict) -> str:
    return str(item.get("title") or item.get("name") or item.get("originalTitle") or "").strip()


def get_imdb_id(item: dict) -> str:
    candidates = [item.get("id"), item.get("imdb_id"), item.get("url"), item.get("link")]
    for candidate in candidates:
        match = re.search(r"tt\d{5,}", str(candidate or ""))
        if match:
            return match.group(0)
    return ""


def find_by_imdb_id(imdb_id: str, token: str, kind: str) -> dict | None:
    url = f"{TMDB_API}/find/{urllib.parse.quote(imdb_id)}?external_source=imdb_id"
    result = request_json(url, token)
    key = "movie_results" if kind == "movie" else "tv_results"
    matches = result.get(key, []) if isinstance(result, dict) else []
    return next((item for item in matches if item.get("poster_path")), None)


def find_by_title(item: dict, token: str, kind: str) -> dict | None:
    title = get_title(item)
    if not title:
        return None
    endpoint = "movie" if kind == "movie" else "tv"
    params = {"query": title, "include_adult": "false"}
    year = str(item.get("year") or "")[:4]
    if year.isdigit():
        params["year" if kind == "movie" else "first_air_date_year"] = year
    url = f"{TMDB_API}/search/{endpoint}?{urllib.parse.urlencode(params)}"
    result = request_json(url, token)
    candidates = [x for x in result.get("results", []) if x.get("poster_path")]
    if not candidates:
        return None

    wanted = normalize(title)
    def score(candidate: dict) -> tuple[float, int]:
        candidate_title = candidate.get("title") if kind == "movie" else candidate.get("name")
        similarity = SequenceMatcher(None, wanted, normalize(str(candidate_title or ""))).ratio()
        date = str((candidate.get("release_date") if kind == "movie" else candidate.get("first_air_date")) or "")
        candidate_year = date[:4]
        year_penalty = 0 if not year or candidate_year == year else 1
        return similarity, -year_penalty

    best = max(candidates, key=score)
    similarity, _ = score(best)
    return best if similarity >= 0.86 else None


def main() -> int:
    token = os.environ.get("TMDB_READ_ACCESS_TOKEN", "").strip()
    if not token:
        print("ERROR: Add TMDB_READ_ACCESS_TOKEN in GitHub repository Settings > Secrets and variables > Actions.", file=sys.stderr)
        return 2

    manifest: dict[str, dict] = {}
    totals = {"movie": 0, "tv": 0}
    matched = {"movie": 0, "tv": 0}
    missing: list[str] = []

    for kind, chart_url in CHARTS.items():
        print(f"Loading IMDb {kind} Top 100…")
        chart = rows_from_payload(request_json(chart_url))
        if not chart:
            raise RuntimeError(f"IMDb {kind} chart returned no rows.")
        for item in chart[:100]:
            totals[kind] += 1
            title = get_title(item)
            imdb_id = get_imdb_id(item)
            tmdb_item = None

            if imdb_id:
                try:
                    tmdb_item = find_by_imdb_id(imdb_id, token, kind)
                except RuntimeError as exc:
                    print(f"Warning: {imdb_id} lookup failed: {exc}", file=sys.stderr)
                time.sleep(0.22)

            if not tmdb_item and title:
                try:
                    tmdb_item = find_by_title(item, token, kind)
                except RuntimeError as exc:
                    print(f"Warning: title search failed for {title}: {exc}", file=sys.stderr)
                time.sleep(0.22)

            if not tmdb_item or not tmdb_item.get("poster_path"):
                missing.append(f"{kind}: {title or imdb_id or 'unknown title'}")
                continue

            poster_path = tmdb_item["poster_path"]
            key = imdb_id or f"title:{normalize(title)}"
            manifest[key] = {
                "poster": f"{TMDB_IMAGE}{poster_path}",
                "poster_path": poster_path,
                "tmdb_id": tmdb_item.get("id"),
                "media_type": kind,
                "title": title,
                "source": "TMDb",
                "match": "imdb_id" if imdb_id else "title_year",
            }
            matched[kind] += 1
            if matched[kind] % 20 == 0:
                print(f"  {kind}: {matched[kind]}/{totals[kind]} posters matched")

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "TMDb API",
        "imageBase": TMDB_IMAGE,
        "notice": "Poster paths and metadata are sourced from TMDb. This product uses the TMDB API but is not endorsed or certified by TMDB.",
        "totals": totals,
        "matched": matched,
        "missingCount": len(missing),
        "posters": manifest,
        "unmatched": missing,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(manifest)} poster matches to {OUTPUT.relative_to(ROOT)}")
    print(f"Matched: movie {matched['movie']}/{totals['movie']}, TV {matched['tv']}/{totals['tv']}")
    if missing:
        print(f"Unmatched titles ({len(missing)}):")
        for title in missing:
            print(f"  - {title}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
