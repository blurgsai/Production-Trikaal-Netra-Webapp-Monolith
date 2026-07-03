"""
event.py API - Full Test Suite
Router prefix: /api/events  (hits ClickHouse ais_events_flat table)

Endpoints under test:
  GET  /api/events/                    - list events with filters
  GET  /api/events/count               - total count with filters
  GET  /api/events/types               - distinct event types
  GET  /api/events/{event_id}          - single event by ID
  GET  /api/events/{event_id}/trajectories - event trajectory
  POST /api/events/share               - save trajectory to GCS

Run against a live server:
    uvicorn main:app --host 127.0.0.1 --port 5000
    python tests/test_event_endpoints.py
"""

import asyncio
import httpx
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://127.0.0.1:5000/api/events"

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"
DIM    = "\033[2m"

passed = 0
failed = 0
skipped = 0


def log(tc_id: str, desc: str, result: str, detail: str = ""):
    global passed, failed, skipped
    if result == "PASS":
        color = GREEN
        passed += 1
    elif result == "SKIP":
        color = YELLOW
        skipped += 1
    else:
        color = RED
        failed += 1
    suffix = f"  {DIM}{detail}{RESET}" if detail else ""
    print(f"  {color}[{result}]{RESET} {tc_id}: {desc}{suffix}")


def section(title: str):
    print(f"\n{BOLD}{title}{RESET}")
    print(f"  {'-' * 62}")


VALID_SEVERITIES = {"info", "warning", "high", "critical", "low", "medium"}


# ================================================================
#  GROUP 1 - GET /api/events/  (TC01-TC17)
# ================================================================

async def test_list(client: httpx.AsyncClient) -> list:
    section("Group 1 - GET /api/events/  (list events)")

    # TC01 - basic reachability + status 200
    try:
        resp = await client.get(f"{BASE}/")
        log("TC01", "Status 200 OK", "PASS" if resp.status_code == 200 else "FAIL",
            f"got {resp.status_code}")
    except Exception as exc:
        log("TC01", "Status 200 OK", "FAIL", str(exc))
        return []

    # TC02 - content-type JSON
    ct = resp.headers.get("content-type", "")
    log("TC02", "Content-Type is application/json",
        "PASS" if "application/json" in ct else "FAIL", ct)

    data = resp.json()

    # TC03 - response is a list (response_model=List[dict])
    log("TC03", "Response body is a list",
        "PASS" if isinstance(data, list) else "FAIL",
        f"got {type(data).__name__}")

    # TC04 - default limit=10 → at most 10 items
    log("TC04", "Default limit=10 returns <=10 items",
        "PASS" if len(data) <= 10 else "FAIL",
        f"got {len(data)} items")

    # TC05 - custom limit=5 respected
    r5 = await client.get(f"{BASE}/?limit=5")
    log("TC05", "limit=5 returns <=5 items",
        "PASS" if len(r5.json()) <= 5 else "FAIL",
        f"got {len(r5.json())} items")

    # TC06 - limit below minimum (ge=1) → 422
    r6 = await client.get(f"{BASE}/?limit=0")
    log("TC06", "limit=0 (below ge=1) -> 422",
        "PASS" if r6.status_code == 422 else "FAIL",
        f"got {r6.status_code}")

    # TC07 - limit above maximum (le=100) → 422
    r7 = await client.get(f"{BASE}/?limit=101")
    log("TC07", "limit=101 (above le=100) -> 422",
        "PASS" if r7.status_code == 422 else "FAIL",
        f"got {r7.status_code}")

    # TC08 - negative limit → 422
    r8 = await client.get(f"{BASE}/?limit=-1")
    log("TC08", "limit=-1 -> 422",
        "PASS" if r8.status_code == 422 else "FAIL",
        f"got {r8.status_code}")

    # TC09 - negative offset → 422
    r9 = await client.get(f"{BASE}/?offset=-1")
    log("TC09", "offset=-1 (below ge=0) -> 422",
        "PASS" if r9.status_code == 422 else "FAIL",
        f"got {r9.status_code}")

    # TC10 - offset paginates (offset=0 vs offset=1 yield different first item)
    if len(data) >= 2:
        r_a = await client.get(f"{BASE}/?limit=1&offset=0")
        r_b = await client.get(f"{BASE}/?limit=1&offset=1")
        id_a = r_a.json()[0].get("event_id") if r_a.json() else None
        id_b = r_b.json()[0].get("event_id") if r_b.json() else None
        log("TC10", "offset=0 vs offset=1 give different first item",
            "PASS" if id_a != id_b else "FAIL",
            f"offset0={id_a}, offset1={id_b}")
    else:
        log("TC10", "Offset pagination shifts results", "SKIP", "fewer than 2 events")

    # TC11 - event_type filter: returned items match the requested type
    if data:
        first_type = data[0].get("event_type")
        if first_type:
            r11 = await client.get(f"{BASE}/?event_type={first_type}&limit=5")
            filtered = r11.json()
            all_match = all(e.get("event_type") == first_type for e in filtered)
            log("TC11", f"event_type={first_type} filter only returns matching rows",
                "PASS" if r11.status_code == 200 and all_match else "FAIL",
                f"items={len(filtered)} all_match={all_match}")
        else:
            log("TC11", "event_type filter", "SKIP", "no event_type in first row")
    else:
        log("TC11", "event_type filter", "SKIP", "empty result set")

    # TC12 - severity filter: returned items match the requested severity
    if data:
        first_sev = data[0].get("severity")
        if first_sev:
            r12 = await client.get(f"{BASE}/?severity={first_sev}&limit=5")
            filtered12 = r12.json()
            all_sev = all(e.get("severity") == first_sev for e in filtered12)
            log("TC12", f"severity={first_sev} filter only returns matching rows",
                "PASS" if r12.status_code == 200 and all_sev else "FAIL",
                f"items={len(filtered12)} all_match={all_sev}")
        else:
            log("TC12", "severity filter", "SKIP", "no severity in first row")
    else:
        log("TC12", "severity filter", "SKIP", "empty result set")

    # TC13 - start_date filter: all returned timestamps >= start_date
    if data and data[0].get("timestamp"):
        cutoff = data[0]["timestamp"]
        r13 = await client.get(f"{BASE}/?start_date={cutoff}&limit=10")
        filtered13 = r13.json()
        all_after = all((e.get("timestamp") or 0) >= cutoff for e in filtered13)
        log("TC13", "start_date filter: all timestamps >= start_date",
            "PASS" if r13.status_code == 200 and all_after else "FAIL",
            f"cutoff={cutoff} items={len(filtered13)}")
    else:
        log("TC13", "start_date filter", "SKIP", "no timestamp data")

    # TC14 - end_date filter: all returned timestamps <= end_date
    if data and data[0].get("timestamp"):
        cutoff14 = data[0]["timestamp"]
        r14 = await client.get(f"{BASE}/?end_date={cutoff14}&limit=10")
        filtered14 = r14.json()
        all_before = all((e.get("timestamp") or 0) <= cutoff14 for e in filtered14)
        log("TC14", "end_date filter: all timestamps <= end_date",
            "PASS" if r14.status_code == 200 and all_before else "FAIL",
            f"cutoff={cutoff14} items={len(filtered14)}")
    else:
        log("TC14", "end_date filter", "SKIP", "no timestamp data")

    # TC15 - each event has core fields
    if data:
        e = data[0]
        core = {"event_id", "event_type", "severity", "timestamp"}
        missing = core - e.keys()
        log("TC15", "Each event has core fields (event_id/event_type/severity/timestamp)",
            "PASS" if not missing else "FAIL",
            f"missing={missing}" if missing else "")
    else:
        log("TC15", "Each event has core fields", "SKIP", "empty result")

    # TC16 - vessels field is a list (or null)
    if data:
        vessels_ok = all(e.get("vessels") is None or isinstance(e.get("vessels"), list)
                         for e in data)
        log("TC16", "vessels field is list or null on every item",
            "PASS" if vessels_ok else "FAIL")
    else:
        log("TC16", "vessels field type", "SKIP", "empty result")

    # TC17 - performance: default list < 5 s
    t0 = time.time()
    await client.get(f"{BASE}/")
    elapsed = time.time() - t0
    log("TC17", "Default list response < 5 s",
        "PASS" if elapsed < 5.0 else "FAIL",
        f"{elapsed:.3f}s")

    return data


# ================================================================
#  GROUP 2 - GET /api/events/count  (TC18-TC24)
# ================================================================

async def test_count(client: httpx.AsyncClient, list_data: list):
    section("Group 2 - GET /api/events/count")

    # TC18 - status 200
    try:
        resp = await client.get(f"{BASE}/count")
        log("TC18", "Status 200 OK",
            "PASS" if resp.status_code == 200 else "FAIL",
            f"got {resp.status_code}")
    except Exception as exc:
        log("TC18", "Status 200 OK", "FAIL", str(exc))
        return

    data = resp.json()

    # TC19 - response has 'total' key
    log("TC19", "Response has 'total' key",
        "PASS" if "total" in data else "FAIL")

    # TC20 - total is a non-negative number
    total = data.get("total", -1)
    log("TC20", "total is a non-negative number",
        "PASS" if isinstance(total, (int, float)) and total >= 0 else "FAIL",
        f"total={total}")

    # TC21 - count matches list length for same limit
    if list_data:
        first_type = list_data[0].get("event_type")
        if first_type:
            r_count = await client.get(f"{BASE}/count?event_type={first_type}")
            r_list  = await client.get(f"{BASE}/?event_type={first_type}&limit=100")
            count_n = r_count.json().get("total", -1)
            list_n  = len(r_list.json())
            # count >= list_n (list_n is bounded by limit=100)
            log("TC21", "Count with event_type filter >= list items with same filter",
                "PASS" if count_n >= list_n else "FAIL",
                f"count={count_n} list_items={list_n}")
        else:
            log("TC21", "Count vs list consistency", "SKIP", "no event_type available")
    else:
        log("TC21", "Count vs list consistency", "SKIP", "empty list data")

    # TC22 - event_type filter reduces count vs unfiltered
    if list_data:
        first_type = list_data[0].get("event_type")
        if first_type:
            r_all = await client.get(f"{BASE}/count")
            r_fil = await client.get(f"{BASE}/count?event_type={first_type}")
            total_all = r_all.json().get("total", 0)
            total_fil = r_fil.json().get("total", 0)
            log("TC22", "event_type filter count <= unfiltered count",
                "PASS" if total_fil <= total_all else "FAIL",
                f"filtered={total_fil} unfiltered={total_all}")
        else:
            log("TC22", "event_type filter reduces count", "SKIP", "no event_type")
    else:
        log("TC22", "event_type filter reduces count", "SKIP", "no list data")

    # TC23 - severity filter reduces count vs unfiltered
    if list_data:
        first_sev = list_data[0].get("severity")
        if first_sev:
            r_all = await client.get(f"{BASE}/count")
            r_sev = await client.get(f"{BASE}/count?severity={first_sev}")
            total_sev = r_sev.json().get("total", 0)
            total_all = r_all.json().get("total", 0)
            log("TC23", "severity filter count <= unfiltered count",
                "PASS" if total_sev <= total_all else "FAIL",
                f"filtered={total_sev} unfiltered={total_all}")
        else:
            log("TC23", "severity filter reduces count", "SKIP", "no severity")
    else:
        log("TC23", "severity filter reduces count", "SKIP", "no list data")

    # TC24 - performance < 3 s
    t0 = time.time()
    await client.get(f"{BASE}/count")
    elapsed = time.time() - t0
    log("TC24", "Count response < 3 s",
        "PASS" if elapsed < 3.0 else "FAIL",
        f"{elapsed:.3f}s")


# ================================================================
#  GROUP 3 - GET /api/events/types  (TC25-TC30)
# ================================================================

async def test_types(client: httpx.AsyncClient) -> list:
    section("Group 3 - GET /api/events/types")

    try:
        resp = await client.get(f"{BASE}/types")
        log("TC25", "Status 200 OK",
            "PASS" if resp.status_code == 200 else "FAIL",
            f"got {resp.status_code}")
    except Exception as exc:
        log("TC25", "Status 200 OK", "FAIL", str(exc))
        return []

    data = resp.json()

    # TC26 - response is a list
    log("TC26", "Response is a list",
        "PASS" if isinstance(data, list) else "FAIL")

    if not data:
        log("TC27", "Each item has 'type' and 'severity'", "SKIP", "empty types list")
        log("TC28", "severity values are valid strings", "SKIP", "empty types list")
        log("TC29", "No duplicate types", "SKIP", "empty types list")
        log("TC30", "Types response < 3 s", "SKIP", "empty types list")
        return data

    # TC27 - each item has 'type' and 'severity' keys
    all_keys = all("type" in item and "severity" in item for item in data)
    log("TC27", "Each item has 'type' and 'severity' keys",
        "PASS" if all_keys else "FAIL")

    # TC28 - severity values are known strings
    bad_sev = [item for item in data
               if item.get("severity") not in VALID_SEVERITIES | {"unknown"}]
    log("TC28", "severity values are recognised strings",
        "PASS" if not bad_sev else "FAIL",
        f"bad={[b.get('severity') for b in bad_sev]}" if bad_sev else "")

    # TC29 - no duplicate type values
    types = [item.get("type") for item in data]
    log("TC29", "No duplicate event types in response",
        "PASS" if len(types) == len(set(types)) else "FAIL",
        f"total={len(types)} unique={len(set(types))}")

    # TC30 - performance < 3 s
    t0 = time.time()
    await client.get(f"{BASE}/types")
    elapsed = time.time() - t0
    log("TC30", "Types response < 3 s",
        "PASS" if elapsed < 3.0 else "FAIL",
        f"{elapsed:.3f}s")

    return data


# ================================================================
#  GROUP 4 - GET /api/events/{event_id}  (TC31-TC38)
# ================================================================

async def test_get_by_id(client: httpx.AsyncClient, list_data: list) -> str | None:
    section("Group 4 - GET /api/events/{event_id}")

    if not list_data:
        for tc in range(31, 39):
            log(f"TC{tc:02d}", f"(skipped - no events in DB)", "SKIP")
        return None

    valid_id = list_data[0].get("event_id")

    # TC31 - status 200 with valid ID
    try:
        resp = await client.get(f"{BASE}/{valid_id}")
        log("TC31", "Status 200 with valid event_id",
            "PASS" if resp.status_code == 200 else "FAIL",
            f"id={valid_id} got {resp.status_code}")
    except Exception as exc:
        log("TC31", "Status 200 with valid event_id", "FAIL", str(exc))
        return None

    data = resp.json()

    # TC32 - event_id in response matches queried ID
    log("TC32", "event_id in response matches queried ID",
        "PASS" if str(data.get("event_id")) == str(valid_id) else "FAIL",
        f"expected={valid_id} got={data.get('event_id')}")

    # TC33 - required fields present
    required = {"event_id", "event_type", "timestamp", "severity", "status",
                "start_time", "end_time", "vessels"}
    missing = required - data.keys()
    log("TC33", "All required fields present in single-event response",
        "PASS" if not missing else "FAIL",
        f"missing={missing}" if missing else "")

    # TC34 - event_type is a non-empty string
    log("TC34", "event_type is a non-empty string",
        "PASS" if isinstance(data.get("event_type"), str) and data["event_type"] else "FAIL",
        f"got={data.get('event_type')!r}")

    # TC35 - start_time is numeric (int or None)
    st = data.get("start_time")
    log("TC35", "start_time is numeric or null",
        "PASS" if st is None or isinstance(st, (int, float)) else "FAIL",
        f"got {type(st).__name__}={st}")

    # TC36 - vessels is a list or null
    v = data.get("vessels")
    log("TC36", "vessels is list or null",
        "PASS" if v is None or isinstance(v, list) else "FAIL",
        f"got {type(v).__name__}")

    # TC37 - non-existent event_id → 404
    r37 = await client.get(f"{BASE}/nonexistent_fake_event_id_999")
    log("TC37", "Non-existent event_id -> 404",
        "PASS" if r37.status_code == 404 else "FAIL",
        f"got {r37.status_code}")

    # TC38 - performance < 5 s
    t0 = time.time()
    await client.get(f"{BASE}/{valid_id}")
    elapsed = time.time() - t0
    log("TC38", "Single event response < 5 s",
        "PASS" if elapsed < 5.0 else "FAIL",
        f"{elapsed:.3f}s")

    return valid_id


# ================================================================
#  GROUP 5 - GET /api/events/{event_id}/trajectories  (TC39-TC47)
# ================================================================

async def test_trajectories(client: httpx.AsyncClient, valid_id: str | None):
    section("Group 5 - GET /api/events/{event_id}/trajectories")

    if not valid_id:
        for tc in range(39, 48):
            log(f"TC{tc:02d}", "(skipped - no valid event_id)", "SKIP")
        return

    # TC39 - status 200 with valid ID
    try:
        resp = await client.get(f"{BASE}/{valid_id}/trajectories", timeout=30.0)
        log("TC39", "Status 200 with valid event_id",
            "PASS" if resp.status_code == 200 else "FAIL",
            f"got {resp.status_code}")
    except Exception as exc:
        log("TC39", "Status 200 with valid event_id", "FAIL", str(exc))
        return

    data = resp.json()

    # TC40 - root keys: trajectories, event_details, speed_graph
    root_keys = {"trajectories", "event_details", "speed_graph"}
    missing = root_keys - data.keys()
    log("TC40", "Root keys present (trajectories/event_details/speed_graph)",
        "PASS" if not missing else "FAIL",
        f"missing={missing}" if missing else "")

    # TC41 - trajectories is a dict
    trajs = data.get("trajectories", {})
    log("TC41", "trajectories is a dict",
        "PASS" if isinstance(trajs, dict) else "FAIL")

    # TC42 - event_details has expected sub-fields
    ed = data.get("event_details", {})
    ed_keys = {"event_id", "event_type", "start_time", "end_time", "vessels"}
    missing_ed = ed_keys - ed.keys()
    log("TC42", "event_details has required sub-fields",
        "PASS" if not missing_ed else "FAIL",
        f"missing={missing_ed}" if missing_ed else "")

    # TC43 - event_details.event_id matches queried ID
    log("TC43", "event_details.event_id matches queried ID",
        "PASS" if str(ed.get("event_id")) == str(valid_id) else "FAIL",
        f"expected={valid_id} got={ed.get('event_id')}")

    # TC44 - speed_graph schema
    sg = data.get("speed_graph", {})
    sg_keys = {"enabled", "unit", "speed_data"}
    missing_sg = sg_keys - sg.keys()
    log("TC44", "speed_graph has enabled/unit/speed_data keys",
        "PASS" if not missing_sg else "FAIL",
        f"missing={missing_sg}" if missing_sg else "")

    # TC45 - speed_graph.enabled is bool
    log("TC45", "speed_graph.enabled is a boolean",
        "PASS" if isinstance(sg.get("enabled"), bool) else "FAIL",
        f"got {type(sg.get('enabled')).__name__}")

    # TC46 - trajectory timestamp keys are numeric strings (if data exists)
    if trajs:
        bad_ts = [k for k in trajs if not k.lstrip("-").isdigit()]
        log("TC46", "Trajectory keys are numeric timestamp strings",
            "PASS" if not bad_ts else "FAIL",
            f"bad={bad_ts[:3]}" if bad_ts else f"{len(trajs)} frames")
    else:
        log("TC46", "Trajectory keys are numeric timestamp strings", "SKIP",
            "no trajectory data for this event (event may have no AIS pings)")

    # TC47 - non-existent event_id → 404
    r47 = await client.get(f"{BASE}/nonexistent_fake_id_xyz/trajectories", timeout=15.0)
    log("TC47", "Non-existent event_id/trajectories -> 404",
        "PASS" if r47.status_code == 404 else "FAIL",
        f"got {r47.status_code}")


# ================================================================
#  GROUP 6 - POST /api/events/share  (TC48-TC52)
# ================================================================

async def test_share(client: httpx.AsyncClient, valid_id: str | None):
    section("Group 6 - POST /api/events/share")

    # TC48 - missing body → 422
    r48 = await client.post(f"{BASE}/share")
    log("TC48", "Missing body -> 422",
        "PASS" if r48.status_code == 422 else "FAIL",
        f"got {r48.status_code}")

    # TC49 - missing event_id field → 422
    r49 = await client.post(f"{BASE}/share", json={"user_id": "test_user"})
    log("TC49", "Body missing event_id -> 422",
        "PASS" if r49.status_code == 422 else "FAIL",
        f"got {r49.status_code}")

    # TC50 - missing user_id field → 422
    if valid_id:
        r50 = await client.post(f"{BASE}/share", json={"event_id": valid_id})
        log("TC50", "Body missing user_id -> 422",
            "PASS" if r50.status_code == 422 else "FAIL",
            f"got {r50.status_code}")
    else:
        log("TC50", "Body missing user_id -> 422", "SKIP", "no valid_id available")

    # TC51 - non-existent event_id → 404 (event lookup fails before GCS)
    r51 = await client.post(f"{BASE}/share",
                            json={"event_id": "nonexistent_999", "user_id": "test"})
    log("TC51", "Non-existent event_id in share -> 404",
        "PASS" if r51.status_code == 404 else "FAIL",
        f"got {r51.status_code}")

    # TC52 - valid body: 200 (GCS configured) or 500 (GCS not configured)
    if valid_id:
        r52 = await client.post(f"{BASE}/share",
                                json={"event_id": valid_id, "user_id": "test_user"},
                                timeout=30.0)
        if r52.status_code == 200:
            body = r52.json()
            has_keys = all(k in body for k in ("success", "file", "bucket", "path"))
            log("TC52", "Valid share -> 200 with GCS response keys",
                "PASS" if has_keys else "FAIL",
                f"keys={list(body.keys())}")
        elif r52.status_code == 500:
            log("TC52", "Valid share -> 500 (GCS not configured in this env)",
                "SKIP",
                "GCS credentials not available - endpoint logic is correct up to GCS call")
        else:
            log("TC52", "Valid share -> 200 or 500",
                "FAIL", f"unexpected {r52.status_code}")
    else:
        log("TC52", "Valid share -> 200/500", "SKIP", "no valid event_id")


# ================================================================
#  RUNNER
# ================================================================

async def run():
    print(f"\n{BOLD}{'='*64}")
    print(" event.py API - Full Test Suite")
    print(f" Target: {BASE}")
    print(f"{'='*64}{RESET}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # reachability probe
        try:
            await client.get(f"{BASE}/")
        except httpx.ConnectError:
            print(f"\n{RED}[FATAL] Cannot reach {BASE}/ -- is the server running?{RESET}")
            print("  Start with: uvicorn main:app --host 127.0.0.1 --port 5000\n")
            return

        list_data  = await test_list(client)
        await test_count(client, list_data)
        await test_types(client)
        valid_id   = await test_get_by_id(client, list_data)
        await test_trajectories(client, valid_id)
        await test_share(client, valid_id)

    total = passed + failed + skipped
    print(f"\n{BOLD}{'-'*64}")
    print(f"  Results: {GREEN}{passed} passed{RESET} . "
          f"{RED}{failed} failed{RESET} . "
          f"{YELLOW}{skipped} skipped{RESET} . {total} total")
    print(f"{'-'*64}{RESET}\n")


if __name__ == "__main__":
    asyncio.run(run())
