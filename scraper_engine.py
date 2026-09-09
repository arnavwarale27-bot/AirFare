"""
scraper_engine.py
─────────────────
Phase 6 — Automated Airfare Scraping Engine
National Airfare Price Index (SIH26056)

Targets MakeMyTrip domestic one-way search across key DGCA city-pair corridors
at T+1, T+7, and T+30 advance-purchase windows.

Anti-detection measures
───────────────────────
  • Randomised User-Agent via fake_useragent
  • Randomised viewport (1280-1920 × 700-1080)
  • Custom HTTP headers (Accept-Language, DNT, Sec headers)
  • Stealth JS patches (navigator.webdriver, chrome runtime, plugins)
  • Human-like random delays between 3-7 s per interaction
  • Per-route session isolation (new context per route batch)

Provenance flags
────────────────
  Live_Scraped      : successfully extracted from live OTA page
  Synthetic_Backup  : live extraction failed; record sourced from CSV fallback

Usage
─────
  # Install browsers once:
  playwright install chromium

  # Run all DGCA routes for T+1 / T+7 / T+30:
  python scraper_engine.py

  # Run a single route:
  python scraper_engine.py --source Delhi --destination Mumbai --windows 1,7,30

  # Dry-run (no DB insert, prints records to stdout):
  python scraper_engine.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import math
import random
import re
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import pandas as pd
from fake_useragent import UserAgent
from playwright.sync_api import (
    Page,
    Playwright,
    TimeoutError as PWTimeoutError,
    sync_playwright,
)
from sqlalchemy.exc import SQLAlchemyError

from database import engine, Base, get_db
from models import FlightRecord
from logger import audit
import models  # noqa: F401 — registers FlightRecord


# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

# DGCA priority basket — bidirectional pairs
DGCA_ROUTES: list[tuple[str, str]] = [
    ("Delhi",     "Mumbai"),
    ("Mumbai",    "Delhi"),
    ("Delhi",     "Bangalore"),
    ("Bangalore", "Delhi"),
    ("Mumbai",    "Bangalore"),
    ("Bangalore", "Mumbai"),
    ("Delhi",     "Hyderabad"),
    ("Hyderabad", "Delhi"),
    ("Delhi",     "Chennai"),
    ("Chennai",   "Delhi"),
]

# Advance-purchase windows (days from today)
DEFAULT_WINDOWS: list[int] = [1, 7, 30]

# MakeMyTrip city codes for URL construction
MMT_CITY_CODES: dict[str, str] = {
    "Delhi":     "DEL",
    "Mumbai":    "BOM",
    "Bangalore": "BLR",
    "Hyderabad": "HYD",
    "Chennai":   "MAA",
    "Kolkata":   "CCU",
    "Goa":       "GOI",
    "Kochi":     "COK",
    "Pune":      "PNQ",
    "Ahmedabad": "AMD",
}

# Fallback CSV (relative to this script)
FALLBACK_CSV = Path(__file__).parent / "Cleaned_dataset.csv"

# Max records to insert per scraper run (safety cap)
MAX_RECORDS_PER_RUN = 500

# Human-like delay range (seconds)
DELAY_MIN, DELAY_MAX = 3.0, 7.0

# Per-page timeout (ms)
PAGE_TIMEOUT_MS = 45_000

# Chunk size for bulk DB inserts
INSERT_CHUNK = 200

# Retry attempts per route before falling back
MAX_RETRIES = 2


# ─────────────────────────────────────────────────────────────────────────────
# Logging helpers
# ─────────────────────────────────────────────────────────────────────────────

def _log(level: str, msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    colour = {"INFO": "\033[36m", "WARN": "\033[33m", "ERROR": "\033[31m",
               "OK": "\033[32m", "DIM": "\033[90m"}.get(level, "")
    reset = "\033[0m"
    print(f"{colour}[{ts}] [{level:5s}] {msg}{reset}", flush=True)


# ─────────────────────────────────────────────────────────────────────────────
# Anti-detection helpers
# ─────────────────────────────────────────────────────────────────────────────

_ua = UserAgent(browsers=["chrome", "edge"], os=["windows", "macos"])

def _random_ua() -> str:
    return _ua.random

def _random_viewport() -> dict:
    return {
        "width":  random.randint(1280, 1920),
        "height": random.randint(700,  1080),
    }

def _human_delay(min_s: float = DELAY_MIN, max_s: float = DELAY_MAX) -> None:
    """Sleep a randomised duration to mimic human reading/interaction time."""
    delay = random.uniform(min_s, max_s)
    _log("DIM", f"  ⏱  waiting {delay:.1f}s …")
    time.sleep(delay)

# JavaScript patches injected before every page load to mask automation signals
_STEALTH_JS = """
() => {
    // 1. Overwrite navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});

    // 2. Fake Chrome runtime
    window.chrome = {runtime: {}, loadTimes: () => {}, csi: () => {}};

    // 3. Fake plugins list
    Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
    });

    // 4. Fake languages
    Object.defineProperty(navigator, 'languages', {
        get: () => ['en-IN', 'en-US', 'en'],
    });

    // 5. Fake permissions
    const origQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (params) =>
        params.name === 'notifications'
            ? Promise.resolve({state: Notification.permission})
            : origQuery(params);
}
"""


def _build_context(playwright: Playwright):
    """Launch a stealth Chromium context with randomised fingerprint."""
    ua = _random_ua()
    vp = _random_viewport()
    _log("INFO", f"Browser UA  : {ua[:80]}…")
    _log("INFO", f"Viewport    : {vp['width']}×{vp['height']}")

    browser = playwright.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--window-size=1920,1080",
        ],
    )
    context = browser.new_context(
        user_agent=ua,
        viewport=vp,
        locale="en-IN",
        timezone_id="Asia/Kolkata",
        extra_http_headers={
            "Accept-Language":           "en-IN,en;q=0.9,hi;q=0.8",
            "Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Encoding":           "gzip, deflate, br",
            "DNT":                       "1",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest":            "document",
            "Sec-Fetch-Mode":            "navigate",
            "Sec-Fetch-Site":            "none",
            "Sec-Fetch-User":            "?1",
        },
        java_script_enabled=True,
    )
    # Inject stealth patches on every new page before any script runs
    context.add_init_script(_STEALTH_JS)
    return browser, context


# ─────────────────────────────────────────────────────────────────────────────
# URL builders
# ─────────────────────────────────────────────────────────────────────────────

def _mmt_url(source: str, destination: str, journey_date: date) -> str:
    """
    Build a MakeMyTrip one-way search URL.
    Example:
      https://www.makemytrip.com/flight/search?
        itinerary=DEL-BOM-16092026&tripType=O&paxType=A-1_C-0_I-0
        &intl=false&cabinClass=E&ccde=IN
    """
    src_code = MMT_CITY_CODES.get(source, source[:3].upper())
    dst_code = MMT_CITY_CODES.get(destination, destination[:3].upper())
    date_str  = journey_date.strftime("%d%m%Y")   # DDMMYYYY
    itinerary = f"{src_code}-{dst_code}-{date_str}"
    return (
        f"https://www.makemytrip.com/flight/search?"
        f"itinerary={itinerary}&tripType=O"
        f"&paxType=A-1_C-0_I-0&intl=false&cabinClass=E&ccde=IN"
    )


# ─────────────────────────────────────────────────────────────────────────────
# DOM extraction — MakeMyTrip result cards
# ─────────────────────────────────────────────────────────────────────────────

# CSS selectors for MMT search results (verified against MMT DOM, 2024-2025)
_SEL = {
    "result_container": "[class*='listingCard'], [class*='flight-listing']",
    "airline":          "[class*='airlineName'], [class*='airline-name']",
    "flight_code":      "[class*='airlineCode'], [class*='flt-no']",
    "departure_time":   "[class*='departure'] [class*='time'], [class*='departureTime']",
    "arrival_time":     "[class*='arrival'] [class*='time'],   [class*='arrivalTime']",
    "duration":         "[class*='duration-text'], [class*='flightDuration']",
    "stops":            "[class*='stop-info'], [class*='stopsInfo']",
    "total_price":      "[class*='priceSection'] [class*='actual-price'], "
                        "[class*='fare-amount'], [class*='actualPrice']",
}


def _parse_duration_hours(text: str) -> Optional[float]:
    """Convert '2h 30m' or '2:30' → decimal hours."""
    if not text:
        return None
    text = text.strip()
    m = re.search(r"(\d+)\s*h", text, re.I)
    mins = re.search(r"(\d+)\s*m", text, re.I)
    h = int(m.group(1)) if m else 0
    mi = int(mins.group(1)) if mins else 0
    if h == 0 and mi == 0:
        # Try HH:MM format
        parts = text.split(":")
        if len(parts) == 2:
            h, mi = int(parts[0]), int(parts[1])
    return round(h + mi / 60, 4) if (h or mi) else None


def _parse_fare_inr(text: str) -> Optional[int]:
    """Extract integer INR value from '₹ 3,499' or 'INR 3499' strings."""
    if not text:
        return None
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else None


def _extract_cards(page: Page, source: str, destination: str,
                   journey_date: date, days_left: int) -> list[dict]:
    """
    Scrape flight result cards from the current MMT search result page.
    Returns a list of raw record dicts ready for FlightRecord construction.
    """
    records: list[dict] = []
    scraped_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        # Wait for the result cards to appear
        page.wait_for_selector(_SEL["result_container"], timeout=PAGE_TIMEOUT_MS)
    except PWTimeoutError:
        _log("WARN", "    No result cards found within timeout")
        return []

    cards = page.query_selector_all(_SEL["result_container"])
    _log("INFO", f"    Found {len(cards)} result cards")

    for card in cards[:30]:    # cap at 30 per route-window
        try:
            def _text(sel: str) -> str:
                el = card.query_selector(sel)
                return el.inner_text().strip() if el else ""

            airline     = _text(_SEL["airline"])
            flight_code = _text(_SEL["flight_code"])
            dep_time    = _text(_SEL["departure_time"])
            arr_time    = _text(_SEL["arrival_time"])
            dur_raw     = _text(_SEL["duration"])
            stops_raw   = _text(_SEL["stops"])
            price_raw   = _text(_SEL["total_price"])

            if not airline or not price_raw:
                continue    # incomplete card — skip

            total_price = _parse_fare_inr(price_raw)
            if not total_price or total_price < 500:
                continue    # unrealistic fare — skip

            # Normalise stops text
            stops_norm = "non-stop"
            if stops_raw:
                sl = stops_raw.lower()
                if "2" in sl or "multi" in sl:
                    stops_norm = "2+-stop"
                elif "1" in sl or "one" in sl:
                    stops_norm = "1-stop"

            # GST estimate (Economy assumed for MMT default search)
            base_f = max(round((total_price - 450) / 1.05), 1)
            taxes  = total_price - base_f

            records.append({
                "date_of_journey":      journey_date,
                "journey_day":          journey_date.strftime("%A"),
                "airline":              airline,
                "flight_code":          flight_code or None,
                "flight_class":         "Economy",
                "source":               source,
                "departure":            dep_time or None,
                "total_stops":          stops_norm,
                "arrival":              arr_time or None,
                "destination":          destination,
                "duration_in_hours":    _parse_duration_hours(dur_raw),
                "days_left":            days_left,
                "fare":                 total_price,
                "base_fare":            base_f,
                "taxes_and_surcharges": taxes,
                "total_fare":           total_price,
                "data_source_type":     "Live_Scraped",
                "scraped_at":           scraped_at,
            })

        except Exception as exc:
            _log("WARN", f"    Card parse error: {exc}")
            continue

    return records


# ─────────────────────────────────────────────────────────────────────────────
# Fallback: synthetic records from cleaned CSV
# ─────────────────────────────────────────────────────────────────────────────

def _synthetic_fallback(source: str, destination: str,
                        journey_date: date, days_left: int,
                        n: int = 10) -> list[dict]:
    """
    Pull n representative rows from the cleaned CSV that match this route,
    update their date/days_left, and tag them as Synthetic_Backup.
    """
    if not FALLBACK_CSV.exists():
        _log("WARN", f"    Fallback CSV not found at {FALLBACK_CSV} — skipping")
        return []

    _log("WARN", f"  ⚠  Falling back to Synthetic_Backup for {source}→{destination}")
    scraped_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        df = pd.read_csv(FALLBACK_CSV, low_memory=False)

        # Normalise column names
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        # Filter to matching route
        mask = (
            df["source"].str.strip().str.lower() == source.lower()
        ) & (
            df["destination"].str.strip().str.lower() == destination.lower()
        )
        route_df = df[mask].copy()

        if route_df.empty:
            _log("WARN", f"    No CSV rows for {source}→{destination}")
            return []

        sample = route_df.sample(n=min(n, len(route_df)), random_state=random.randint(0, 9999))

        records = []
        for _, row in sample.iterrows():
            fare = int(row.get("fare", 0) or 0)
            if fare <= 0:
                continue
            base_f = max(round((fare - 450) / 1.05), 1)
            records.append({
                "date_of_journey":      journey_date,
                "journey_day":          journey_date.strftime("%A"),
                "airline":              str(row.get("airline", "Unknown")).strip(),
                "flight_code":          str(row.get("flight_code", "") or "").strip() or None,
                "flight_class":         str(row.get("class", "Economy") or "Economy").strip(),
                "source":               source,
                "departure":            str(row.get("departure", "") or "").strip() or None,
                "total_stops":          str(row.get("total_stops", "non-stop") or "non-stop").strip(),
                "arrival":              str(row.get("arrival", "") or "").strip() or None,
                "destination":          destination,
                "duration_in_hours":    float(row["duration_in_hours"]) if pd.notna(row.get("duration_in_hours")) else None,
                "days_left":            days_left,
                "fare":                 fare,
                "base_fare":            base_f,
                "taxes_and_surcharges": fare - base_f,
                "total_fare":           fare,
                "data_source_type":     "Synthetic_Backup",
                "scraped_at":           scraped_at,
            })
        return records

    except Exception as exc:
        _log("ERROR", f"    Fallback CSV error: {exc}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Core: scrape one route across all booking windows
# ─────────────────────────────────────────────────────────────────────────────

def scrape_route(
    source: str,
    destination: str,
    date_of_journey: date,
    *,
    page: Page,
    retries: int = MAX_RETRIES,
) -> list[dict]:
    """
    Scrape one source→destination flight search for a specific journey date.
    Returns a list of record dicts. On failure, returns Synthetic_Backup records.

    Parameters
    ----------
    source, destination : city names (must match MMT_CITY_CODES keys)
    date_of_journey     : the flight date to search
    page                : active Playwright Page (caller manages context lifecycle)
    retries             : how many times to retry before falling back to CSV
    """
    days_left = (date_of_journey - date.today()).days
    url = _mmt_url(source, destination, date_of_journey)
    _t_route_start = time.time()

    _log("INFO", f"  Scraping {source:12s} → {destination:12s} | {date_of_journey} (T+{days_left})")
    _log("DIM",  f"  URL: {url}")

    for attempt in range(1, retries + 2):
        try:
            # Navigate with a randomised timeout jitter
            page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT_MS)
            _human_delay()

            # Check for bot/captcha pages
            body_text = page.inner_text("body").lower()
            if any(kw in body_text for kw in ["captcha", "are you human", "robot check", "access denied"]):
                raise RuntimeError("Bot detection page encountered")

            # Scroll to trigger lazy-loading of flight cards
            for _ in range(3):
                page.evaluate("window.scrollBy(0, window.innerHeight * 0.8)")
                time.sleep(random.uniform(0.8, 1.5))

            records = _extract_cards(page, source, destination, date_of_journey, days_left)

            if records:
                _log("OK", f"  ✓  {len(records)} Live_Scraped records")
                audit.scraper_run(source, destination, days_left, "Live_Scraped",
                                  len(records), time.time() - _t_route_start)
                return records

            _log("WARN", f"  Attempt {attempt}: 0 cards extracted — retrying…")

        except PWTimeoutError:
            _log("WARN", f"  Attempt {attempt}: Page timeout for {source}→{destination}")
        except Exception as exc:
            _log("WARN", f"  Attempt {attempt}: {type(exc).__name__}: {exc}")

        if attempt <= retries:
            _human_delay(DELAY_MAX, DELAY_MAX + 3)

    # All attempts exhausted → fallback
    result = _synthetic_fallback(source, destination, date_of_journey, days_left)
    audit.scraper_run(source, destination, days_left, "Synthetic_Backup",
                      len(result), time.time() - _t_route_start)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# DB bulk insert
# ─────────────────────────────────────────────────────────────────────────────

def _migrate_provenance_columns() -> None:
    """
    Idempotently add data_source_type and scraped_at columns if they don't
    exist yet. Safe to call on every run.
    """
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("""
            ALTER TABLE flight_records
                ADD COLUMN IF NOT EXISTS data_source_type VARCHAR(30),
                ADD COLUMN IF NOT EXISTS scraped_at       VARCHAR(30);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_fr_data_source
                ON flight_records (data_source_type);
        """))
    _log("OK", "Schema: data_source_type + scraped_at columns ready")


def _bulk_insert(records: list[dict], dry_run: bool = False) -> tuple[int, int]:
    """
    Insert records into flight_records in chunks.
    Returns (inserted_count, skipped_count).
    """
    if not records:
        return 0, 0

    if dry_run:
        _log("INFO", f"  DRY-RUN: would insert {len(records)} records")
        for r in records[:3]:
            print(f"    {json.dumps({k: str(v) for k, v in r.items()}, ensure_ascii=False)}")
        return 0, 0

    inserted = skipped = 0
    db = next(get_db())
    try:
        for i in range(0, len(records), INSERT_CHUNK):
            chunk = records[i : i + INSERT_CHUNK]
            orm_objs = []
            _t_chunk = time.time()
            for rec in chunk:
                try:
                    obj = FlightRecord(
                        date_of_journey      = rec["date_of_journey"],
                        journey_day          = rec.get("journey_day"),
                        airline              = rec["airline"],
                        flight_code          = rec.get("flight_code"),
                        flight_class         = rec.get("flight_class", "Economy"),
                        source               = rec["source"],
                        departure            = rec.get("departure"),
                        total_stops          = rec.get("total_stops", "non-stop"),
                        arrival              = rec.get("arrival"),
                        destination          = rec["destination"],
                        duration_in_hours    = rec.get("duration_in_hours"),
                        days_left            = rec.get("days_left"),
                        fare                 = rec["fare"],
                        base_fare            = rec.get("base_fare"),
                        taxes_and_surcharges = rec.get("taxes_and_surcharges"),
                        total_fare           = rec.get("total_fare"),
                        data_source_type     = rec.get("data_source_type", "Live_Scraped"),
                        scraped_at           = rec.get("scraped_at"),
                    )
                    orm_objs.append(obj)
                    inserted += 1
                except Exception as exc:
                    _log("WARN", f"    Record build error: {exc}")
                    skipped += 1

            db.bulk_save_objects(orm_objs)
            db.commit()
            chunk_elapsed = time.time() - _t_chunk
            audit.db_insert(
                "flight_records",
                len(orm_objs),
                chunk_elapsed,
                records[i].get("data_source_type", "Unknown") if records else "Unknown",
            )
            _log("OK", f"  ✓  Inserted chunk {i // INSERT_CHUNK + 1}: {len(orm_objs)} rows")

    except SQLAlchemyError as exc:
        _log("ERROR", f"DB insert error: {exc}")
        db.rollback()
    finally:
        db.close()

    return inserted, skipped


# ─────────────────────────────────────────────────────────────────────────────
# Run statistics reporter
# ─────────────────────────────────────────────────────────────────────────────

def _print_summary(stats: dict) -> None:
    print("\n" + "─" * 60)
    print("  SCRAPER RUN SUMMARY")
    print("─" * 60)
    print(f"  Routes attempted       : {stats['routes_attempted']}")
    print(f"  Routes live-scraped    : {stats['live_routes']}")
    print(f"  Routes synthetic       : {stats['synthetic_routes']}")
    print(f"  Total records scraped  : {stats['total_records']}")
    print(f"  Inserted into DB       : {stats['inserted']}")
    print(f"  Skipped (errors)       : {stats['skipped']}")
    print(f"  Elapsed                : {stats['elapsed_s']:.1f}s")
    print("─" * 60 + "\n")


# ─────────────────────────────────────────────────────────────────────────────
# CLI entrypoint
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="National Airfare Price Index — Scraper Engine (Phase 6)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--source",      default=None, help="Single source city (overrides DGCA basket)")
    parser.add_argument("--destination", default=None, help="Single destination city")
    parser.add_argument("--windows",     default=",".join(map(str, DEFAULT_WINDOWS)),
                        help=f"Comma-separated advance-purchase windows, default: {DEFAULT_WINDOWS}")
    parser.add_argument("--dry-run",     action="store_true",
                        help="Print records without inserting into DB")
    parser.add_argument("--no-migrate",  action="store_true",
                        help="Skip schema migration (if columns already exist)")
    args = parser.parse_args()

    windows: list[int] = [int(w.strip()) for w in args.windows.split(",")]

    # Determine route list
    if args.source and args.destination:
        routes = [(args.source, args.destination)]
    else:
        routes = DGCA_ROUTES

    _log("INFO", f"Scraper Engine  — SIH26056 / National Airfare Price Index")
    _log("INFO", f"Routes          : {len(routes)}")
    _log("INFO", f"Windows (T+)    : {windows}")
    _log("INFO", f"Dry-run         : {args.dry_run}")
    _log("INFO", f"Fallback CSV    : {FALLBACK_CSV.name} ({'✓ exists' if FALLBACK_CSV.exists() else '✗ missing'})")

    # Ensure DB columns exist
    if not args.no_migrate and not args.dry_run:
        _migrate_provenance_columns()

    start = time.time()
    all_records: list[dict] = []
    stats = {
        "routes_attempted": 0,
        "live_routes": 0,
        "synthetic_routes": 0,
        "total_records": 0,
        "inserted": 0,
        "skipped": 0,
        "elapsed_s": 0.0,
    }

    with sync_playwright() as pw:
        browser, context = _build_context(pw)
        page = context.new_page()

        for src, dst in routes:
            for days_ahead in windows:
                if len(all_records) >= MAX_RECORDS_PER_RUN:
                    _log("WARN", f"Reached MAX_RECORDS_PER_RUN={MAX_RECORDS_PER_RUN} — stopping early")
                    break

                journey_date = date.today() + timedelta(days=days_ahead)
                stats["routes_attempted"] += 1

                records = scrape_route(src, dst, journey_date, page=page)

                if records:
                    source_types = {r["data_source_type"] for r in records}
                    if "Live_Scraped" in source_types:
                        stats["live_routes"] += 1
                    else:
                        stats["synthetic_routes"] += 1
                    all_records.extend(records)
                    stats["total_records"] += len(records)

                _human_delay(DELAY_MIN, DELAY_MAX)

            else:
                continue
            break

        page.close()
        context.close()
        browser.close()

    # ── Bulk insert ────────────────────────────────────────────────────────
    if all_records:
        _log("INFO", f"\nInserting {len(all_records)} records into flight_records …")
        ins, skip = _bulk_insert(all_records, dry_run=args.dry_run)
        stats["inserted"] = ins
        stats["skipped"]  = skip

    stats["elapsed_s"] = time.time() - start
    audit.scraper_session(
        routes_attempted  = stats["routes_attempted"],
        live_routes       = stats["live_routes"],
        synthetic_routes  = stats["synthetic_routes"],
        total_records     = stats["total_records"],
        inserted          = stats["inserted"],
        elapsed_s         = stats["elapsed_s"],
    )
    _print_summary(stats)


if __name__ == "__main__":
    main()
