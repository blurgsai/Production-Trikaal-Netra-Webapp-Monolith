"""
Compound Events API — Full Test Suite
Tests: GET /api/compound-events/list  (TC01–TC20)
       GET /api/compound-events/playback (TC21–TC45)

Run against a live server:
    uvicorn main:app --host 127.0.0.1 --port 5000
    python tests/test_compound_events.py
"""

import asyncio
import httpx
import sys
import time

# Force UTF-8 output on Windows terminals that default to cp1252
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://127.0.0.1:5000/api/compound-events"

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
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
    print(f"  {'-' * 60}")


# ═══════════════════════════════════════════════════════════════
#  GROUP 1 — LIST ENDPOINT  (TC01–TC20)
# ═══════════════════════════════════════════════════════════════

async def test_list(client: httpx.AsyncClient) -> dict | None:
    section("Group 1 · List Endpoint  GET /api/compound-events/list")

    # TC01 — basic reachability
    try:
        resp = await client.get(f"{BASE}/list")
        log("TC01", "Status 200 OK", "PASS" if resp.status_code == 200 else "FAIL",
            f"got {resp.status_code}")
    except Exception as exc:
        log("TC01", "Status 200 OK", "FAIL", str(exc))
        return None

    # TC02 — content-type
    ct = resp.headers.get("content-type", "")
    log("TC02", "Content-Type is application/json", "PASS" if "application/json" in ct else "FAIL", ct)

    data = resp.json()

    # TC03 — envelope schema keys
    required = {"events", "total", "limit", "offset"}
    missing = required - data.keys()
    log("TC03", "Envelope keys (events/total/limit/offset)", "PASS" if not missing else "FAIL",
        f"missing={missing}" if missing else "")

    # TC04 — events is a list
    log("TC04", "'events' field is a list", "PASS" if isinstance(data.get("events"), list) else "FAIL")

    # TC05 — total is non-negative int
    log("TC05", "'total' is non-negative int",
        "PASS" if isinstance(data.get("total"), int) and data["total"] >= 0 else "FAIL",
        f"total={data.get('total')}")

    # TC06 — default limit equals 50
    log("TC06", "Default limit is 50",
        "PASS" if data.get("limit") == 50 else "FAIL",
        f"got {data.get('limit')}")

    # TC07 — default offset equals 0
    log("TC07", "Default offset is 0",
        "PASS" if data.get("offset") == 0 else "FAIL",
        f"got {data.get('offset')}")

    # TC08 — custom limit respected
    r8 = await client.get(f"{BASE}/list?limit=2")
    d8 = r8.json()
    log("TC08", "limit=2 returns ≤2 events",
        "PASS" if len(d8.get("events", [])) <= 2 else "FAIL",
        f"got {len(d8.get('events', []))}")

    # TC09 — limit echoed in response
    log("TC09", "limit=2 echoed in response body",
        "PASS" if d8.get("limit") == 2 else "FAIL",
        f"got {d8.get('limit')}")

    # TC10 — offset pagination shifts results
    if data.get("total", 0) >= 2:
        r_a = await client.get(f"{BASE}/list?limit=1&offset=0")
        r_b = await client.get(f"{BASE}/list?limit=1&offset=1")
        id_a = r_a.json()["events"][0]["id"] if r_a.json().get("events") else None
        id_b = r_b.json()["events"][0]["id"] if r_b.json().get("events") else None
        log("TC10", "Offset pagination shifts results", "PASS" if id_a != id_b else "FAIL",
            f"offset=0 → {id_a}, offset=1 → {id_b}")
    else:
        log("TC10", "Offset pagination shifts results", "SKIP", "not enough data")

    # TC11 — limit below minimum → 422
    r11 = await client.get(f"{BASE}/list?limit=0")
    log("TC11", "limit=0 (below min=1) → 422",
        "PASS" if r11.status_code == 422 else "FAIL",
        f"got {r11.status_code}")

    # TC12 — limit above maximum → 422
    r12 = await client.get(f"{BASE}/list?limit=9999")
    log("TC12", "limit=9999 (above max=1000) → 422",
        "PASS" if r12.status_code == 422 else "FAIL",
        f"got {r12.status_code}")

    # TC13 — negative offset → 422
    r13 = await client.get(f"{BASE}/list?offset=-1")
    log("TC13", "offset=-1 → 422",
        "PASS" if r13.status_code == 422 else "FAIL",
        f"got {r13.status_code}")

    # TC14 — search with known type substring
    r14 = await client.get(f"{BASE}/list?q=geofence")
    d14 = r14.json()
    matched = all("geofence" in (e.get("type") or "").lower()
                  for e in d14.get("events", []))
    log("TC14", "q=geofence returns only geofence types",
        "PASS" if r14.status_code == 200 and matched else "FAIL",
        f"events={[e.get('type') for e in d14.get('events', [])]}")

    # TC15 — search with no match
    r15 = await client.get(f"{BASE}/list?q=zzz_nonexistent_xyz")
    d15 = r15.json()
    log("TC15", "No-match search returns empty events list",
        "PASS" if r15.status_code == 200 and d15.get("events") == [] else "FAIL",
        f"total={d15.get('total')}")

    # TC16 — per-item schema: required fields
    events = data.get("events", [])
    if events:
        e = events[0]
        required_item = {"id", "type", "constituent_types", "vessels_involved", "severity", "compound"}
        missing_item = required_item - e.keys()
        log("TC16", "Each item has required fields",
            "PASS" if not missing_item else "FAIL",
            f"missing={missing_item}" if missing_item else "")
    else:
        log("TC16", "Each item has required fields", "SKIP", "collection empty")

    # TC17 — compound flag is always True
    all_compound = all(e.get("compound") is True for e in events)
    log("TC17", "'compound' flag is True on every item",
        "PASS" if all_compound else "FAIL" if events else "SKIP")

    # TC18 — constituent_types is a non-empty list on every item
    all_list = all(isinstance(e.get("constituent_types"), list) and len(e["constituent_types"]) >= 2
                   for e in events)
    log("TC18", "constituent_types is list with ≥2 entries",
        "PASS" if all_list else "FAIL" if events else "SKIP")

    # TC19 — vessels_involved is a list on every item
    all_vessels = all(isinstance(e.get("vessels_involved"), list) for e in events)
    log("TC19", "vessels_involved is a list on every item",
        "PASS" if all_vessels else "FAIL" if events else "SKIP")

    # TC20 — performance: default list < 2 s
    t_start = time.time()
    await client.get(f"{BASE}/list")
    elapsed = time.time() - t_start
    log("TC20", "Default list response < 2 s",
        "PASS" if elapsed < 2.0 else "FAIL",
        f"{elapsed:.3f}s")

    return data


# ═══════════════════════════════════════════════════════════════
#  GROUP 2 — PLAYBACK ENDPOINT  (TC21–TC45)
# ═══════════════════════════════════════════════════════════════

async def test_playback(client: httpx.AsyncClient, list_data: dict):
    section("Group 2 · Playback Endpoint  GET /api/compound-events/playback")

    events = list_data.get("events", [])
    if not events:
        print(f"  {YELLOW}[SKIP]{RESET} No compound events in collection — skipping all playback tests.")
        global skipped
        skipped += 25
        return

    valid_id   = events[0]["id"]
    valid_type = events[0]["type"]

    # TC21 — status 200 with valid compound ID
    try:
        resp = await client.get(f"{BASE}/playback?id={valid_id}")
        log("TC21", "Status 200 with valid ID",
            "PASS" if resp.status_code == 200 else "FAIL",
            f"got {resp.status_code}")
    except Exception as exc:
        log("TC21", "Status 200 with valid ID", "FAIL", str(exc))
        return

    pb = resp.json()

    # TC22 — root envelope keys
    root_keys = {"event_details", "trajectories", "time_window"}
    missing = root_keys - pb.keys()
    log("TC22", "Root keys (event_details/trajectories/time_window)",
        "PASS" if not missing else "FAIL",
        f"missing={missing}" if missing else "")

    ed = pb.get("event_details", {})

    # TC23 — event_details._id matches queried ID
    log("TC23", "event_details._id matches queried compound ID",
        "PASS" if ed.get("_id") == valid_id else "FAIL",
        f"expected={valid_id} got={ed.get('_id')}")

    # TC24 — event_details.type matches known type
    log("TC24", "event_details.type matches compound type from list",
        "PASS" if ed.get("type") == valid_type else "FAIL",
        f"expected={valid_type} got={ed.get('type')}")

    # TC25 — compound flag is True
    log("TC25", "event_details.compound is True",
        "PASS" if ed.get("compound") is True else "FAIL",
        f"got {ed.get('compound')}")

    # TC26 — constituent_types is list with ≥2 entries
    ct = ed.get("constituent_types", [])
    log("TC26", "constituent_types is list with ≥2 entries",
        "PASS" if isinstance(ct, list) and len(ct) >= 2 else "FAIL",
        f"got {ct}")

    # TC27 — constituent_events keys match constituent_types
    ce = ed.get("constituent_events", {})
    keys_match = set(ct) == set(ce.keys())
    log("TC27", "constituent_events keys match constituent_types",
        "PASS" if keys_match else "FAIL",
        f"types={set(ct)} events_keys={set(ce.keys())}")

    # TC28 — each constituent event has _id, type, vessels_involved
    ce_ok = all(
        isinstance(v, dict) and "_id" in v and "type" in v and "vessels_involved" in v
        for v in ce.values()
    )
    log("TC28", "Each constituent event has _id/type/vessels_involved",
        "PASS" if ce_ok else "FAIL")

    # TC29 — vessels_involved is non-empty list
    vi = ed.get("vessels_involved", [])
    log("TC29", "vessels_involved is a non-empty list",
        "PASS" if isinstance(vi, list) and len(vi) > 0 else "FAIL",
        f"got {vi}")

    # TC30 — severity is a non-empty string
    sev = ed.get("severity")
    log("TC30", "severity is a non-empty string",
        "PASS" if isinstance(sev, str) and sev else "FAIL",
        f"got={sev!r}")

    # TC31 — time_window schema
    tw = pb.get("time_window", {})
    tw_keys = {"query_start", "query_end", "event_start", "event_end", "buffer_hours"}
    missing_tw = tw_keys - tw.keys()
    log("TC31", "time_window has all required keys",
        "PASS" if not missing_tw else "FAIL",
        f"missing={missing_tw}" if missing_tw else "")

    # TC32 — buffer_hours is exactly 3
    log("TC32", "buffer_hours is 3",
        "PASS" if tw.get("buffer_hours") == 3 else "FAIL",
        f"got {tw.get('buffer_hours')}")

    # TC33 — query_start is 3 hr before event_start
    qs = tw.get("query_start")
    es = tw.get("event_start")
    THREE_HOURS_MS = 3 * 60 * 60 * 1000
    if qs and es:
        diff = es - qs
        log("TC33", "query_start is exactly 3 hr before event_start",
            "PASS" if diff == THREE_HOURS_MS else "FAIL",
            f"diff={diff}ms expected={THREE_HOURS_MS}ms")
    else:
        log("TC33", "query_start is exactly 3 hr before event_start", "SKIP", "null timestamps")

    # TC34 — query_end is 3 hr after event_end (when event_end is not null)
    qe = tw.get("query_end")
    ee = tw.get("event_end")
    if qe and ee:
        diff_end = qe - ee
        log("TC34", "query_end is exactly 3 hr after event_end",
            "PASS" if diff_end == THREE_HOURS_MS else "FAIL",
            f"diff={diff_end}ms expected={THREE_HOURS_MS}ms")
    else:
        log("TC34", "query_end is 3 hr after event_end", "SKIP", "event_end is null (open-ended event)")

    # TC35 — trajectories is a dict
    trajs = pb.get("trajectories", {})
    log("TC35", "trajectories is a dict",
        "PASS" if isinstance(trajs, dict) else "FAIL")

    # TC36 — trajectory timestamp keys are numeric strings
    bad_ts = [k for k in trajs if not k.lstrip("-").isdigit()]
    log("TC36", "All trajectory keys are numeric timestamp strings",
        "PASS" if not bad_ts else "FAIL",
        f"bad={bad_ts[:3]}" if bad_ts else "")

    # TC37-40: coordinate + kinematics range checks
    valid_lat = valid_lon = valid_speed = valid_course = True
    for ts_key, vessel_map in trajs.items():
        for vid, pt in vessel_map.items():
            if not (-90 <= (pt.get("latitude") or 0) <= 90):
                valid_lat = False
            if not (-180 <= (pt.get("longitude") or 0) <= 180):
                valid_lon = False
            if (pt.get("speed_mps") or 0) < 0:
                valid_speed = False
            c = pt.get("course") or 0
            if not (0 <= c <= 360):
                valid_course = False

    log("TC37", "Latitude values in range [-90, 90]",   "PASS" if valid_lat   else "FAIL")
    log("TC38", "Longitude values in range [-180, 180]", "PASS" if valid_lon   else "FAIL")
    log("TC39", "Speed values are non-negative",          "PASS" if valid_speed else "FAIL")
    log("TC40", "Course values in range [0, 360]",        "PASS" if valid_course else "FAIL")

    # TC41 — trajectory vessel IDs are subset of vessels_involved
    traj_vids: set[str] = set()
    for vessel_map in trajs.values():
        traj_vids.update(vessel_map.keys())
    involved_set = set(str(v) for v in vi)
    log("TC41", "Trajectory vessel IDs ⊆ vessels_involved",
        "PASS" if traj_vids.issubset(involved_set) else "FAIL",
        f"extra={traj_vids - involved_set}" if not traj_vids.issubset(involved_set) else "")

    # TC42 — missing 'id' param → 422
    r42 = await client.get(f"{BASE}/playback")
    log("TC42", "Missing id param → 422",
        "PASS" if r42.status_code == 422 else "FAIL",
        f"got {r42.status_code}")

    # TC43 — malformed ObjectId (not 24-hex) → 400
    r43 = await client.get(f"{BASE}/playback?id=not_an_objectid")
    log("TC43", "Malformed ObjectId → 400",
        "PASS" if r43.status_code == 400 else "FAIL",
        f"got {r43.status_code}")

    # TC44 — valid-format ObjectId that doesn't exist → 404
    r44 = await client.get(f"{BASE}/playback?id=aaaaaaaaaaaaaaaaaaaaaaaa")
    log("TC44", "Valid-format but non-existent ObjectId → 404",
        "PASS" if r44.status_code == 404 else "FAIL",
        f"got {r44.status_code}")

    # TC45 — SQL injection attempt in id param → 400 or 422 (never 500)
    r45 = await client.get(f"{BASE}/playback?id=' OR 1=1--")
    log("TC45", "SQL injection in id param → 400/422 (never 500)",
        "PASS" if r45.status_code in (400, 422) else "FAIL",
        f"got {r45.status_code}")

    # TC46 — a second distinct compound event also returns 200
    if len(events) >= 2:
        second_id = events[1]["id"]
        r46 = await client.get(f"{BASE}/playback?id={second_id}")
        log("TC46", "Second compound event also returns 200",
            "PASS" if r46.status_code == 200 else "FAIL",
            f"id={second_id} got {r46.status_code}")
    else:
        log("TC46", "Second compound event playback", "SKIP", "only 1 event in collection")

    # TC47 — response time < 30 s (ClickHouse query included)
    t0 = time.time()
    await client.get(f"{BASE}/playback?id={valid_id}", timeout=60.0)
    elapsed = time.time() - t0
    log("TC47", "Playback response < 30 s",
        "PASS" if elapsed < 30.0 else "FAIL",
        f"{elapsed:.2f}s")


# ═══════════════════════════════════════════════════════════════
#  RUNNER
# ═══════════════════════════════════════════════════════════════

async def run():
    print(f"\n{BOLD}{'='*64}")
    print(" Compound Events API - Full Test Suite")
    print(f"{'='*64}{RESET}")
    print(f"  Target: {BASE}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        # verify server is reachable before running
        try:
            await client.get(f"{BASE}/list")
        except httpx.ConnectError:
            print(f"\n{RED}[FATAL] Cannot reach {BASE}/list — is the server running?{RESET}")
            print(f"  Start with: uvicorn main:app --host 127.0.0.1 --port 5000\n")
            return

        list_data = await test_list(client)
        if list_data is not None:
            await test_playback(client, list_data)

    # ── Summary ─────────────────────────────────────────────────
    total = passed + failed + skipped
    print(f"\n{BOLD}{'─'*64}")
    print(f"  Results: {GREEN}{passed} passed{RESET} · "
          f"{RED}{failed} failed{RESET} · "
          f"{YELLOW}{skipped} skipped{RESET} · {total} total")
    print(f"{'─'*64}{RESET}\n")


if __name__ == "__main__":
    asyncio.run(run())
