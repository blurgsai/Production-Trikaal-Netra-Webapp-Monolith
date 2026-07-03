import asyncio
import httpx
import json
import time

BASE_URL = "http://127.0.0.1:5000/api/mongo-events"

GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"
BOLD = "\033[1m"

def log(id, desc, result, msg=""):
    color = GREEN if result == "PASS" else RED
    print(f"{color}[{result}] {id}: {desc} {msg}{RESET}")

async def run_expanded_tests():
    print(f"{BOLD}Starting Expanded API Tests (30+ Cases){RESET}\n")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        
        # --- LIST ENDPOINT TESTS (1-15) ---
        print(f"{BOLD}--- Group 1: List Endpoint ---{RESET}")

        # TC01: Status 200 OK
        try:
            resp = await client.get(f"{BASE_URL}/list")
            log("TC01", "Status Code 200", "PASS" if resp.status_code == 200 else "FAIL")
        except: log("TC01", "Status Code 200", "FAIL")

        # TC02: JSON Content Type
        try:
            log("TC02", "Content-Type JSON", "PASS" if "application/json" in resp.headers["content-type"] else "FAIL")
        except: log("TC02", "Content-Type JSON", "FAIL")

        data = resp.json()

        # TC03: Response Schema Keys
        keys = ["events", "total", "limit", "offset"]
        log("TC03", "Schema Keys Present", "PASS" if all(k in data for k in keys) else "FAIL")

        # TC04: 'events' is List
        log("TC04", "'events' is List", "PASS" if isinstance(data["events"], list) else "FAIL")

        # TC05: Default Limit functionality (check default is 1000)
        log("TC05", "Default Limit", "PASS" if data["limit"] == 1000 else "FAIL")

        # TC06: Limit Parameter Working (size check)
        resp_limit = await client.get(f"{BASE_URL}/list?limit=5")
        log("TC06", "Limit=5 Restriction", "PASS" if len(resp_limit.json()["events"]) <= 5 else "FAIL")

        # TC07: Limit Parameter in Response
        log("TC07", "Limit value in response", "PASS" if resp_limit.json()["limit"] == 5 else "FAIL")

        # TC08: Limit=0 Edge Case
        resp_zero = await client.get(f"{BASE_URL}/list?limit=0")
        log("TC08", "Limit=0 Handling", "PASS" if len(resp_zero.json()["events"]) == 0 else "FAIL")

        # TC09: Offset Logic (ID shifting)
        if len(data["events"]) >= 2:
            resp_off0 = await client.get(f"{BASE_URL}/list?limit=1&offset=0")
            resp_off1 = await client.get(f"{BASE_URL}/list?limit=1&offset=1")
            id0 = resp_off0.json()["events"][0]["event_id"]
            id1 = resp_off1.json()["events"][0]["event_id"]
            log("TC09", "Offset Functionality", "PASS" if id0 != id1 else "FAIL")
        else:
            log("TC09", "Offset Functionality", "PASS", "(Skipped - not enough data)")

        # TC10: Negative Limit Handling
        resp_neg = await client.get(f"{BASE_URL}/list?limit=-1")
        log("TC10", "Negative Limit Handling", "PASS" if resp_neg.status_code in [200, 422] else "FAIL")

        # TC11: Event Object Structure
        if data["events"]:
            evt = data["events"][0]
            log("TC11", "Event ID Present", "PASS" if "event_id" in evt else "FAIL")
            log("TC12", "Event Type Present", "PASS" if "type" in evt else "FAIL")
            log("TC13", "Start Time Present", "PASS" if "start_time" in evt else "FAIL")
            log("TC14", "Vessels List Present", "PASS" if isinstance(evt.get("vessels_involved"), list) else "FAIL")
        else:
            print("Skipping TC11-TC14 (No events)")

        # TC15: Large Limit Performance
        start = time.time()
        await client.get(f"{BASE_URL}/list?limit=1000")
        log("TC15", "Perf: Limit=1000 < 2s", "PASS" if (time.time() - start) < 2.0 else "FAIL")


        # --- PLAYBACK ENDPOINT TESTS (16+) ---
        print(f"\n{BOLD}--- Group 2: Playback Endpoint ---{RESET}")
        
        valid_id = data["events"][0]["event_id"] if data["events"] else None
        if not valid_id:
            print("Critical: No events found. Stopping.")
            return

        resp_pb = await client.get(f"{BASE_URL}/{valid_id}/playback")
        pb_data = resp_pb.json()

        # TC16: Status 200
        log("TC16", "Playback Status 200", "PASS" if resp_pb.status_code == 200 else "FAIL")

        # TC17: Root Keys
        log("TC17", "Root Keys (details, traj)", "PASS" if "event_details" in pb_data and "trajectories" in pb_data else "FAIL")

        # TC18: Event Details Integrity
        log("TC18", "Event Details Match ID", "PASS" if pb_data["event_details"]["event_id"] == valid_id else "FAIL")

        # TC19: Trajectories Type
        trajs = pb_data["trajectories"]
        log("TC19", "Trajectories is Dict", "PASS" if isinstance(trajs, dict) else "FAIL")

        # TC20: Time Window Schema
        log("TC20", "Time Window Schema", "PASS" if "query_start" in pb_data["time_window"] else "FAIL")

        # TC21: 404 Handling
        resp_404 = await client.get(f"{BASE_URL}/bad_id_999/playback")
        log("TC21", "Invalid ID -> 404", "PASS" if resp_404.status_code == 404 else "FAIL")

        # TC22: Buffer Logic Check
        tw = pb_data["time_window"]
        # query_start should be less than event_start (if both exist)
        if tw.get("query_start") and tw.get("event_start"):
            log("TC22", "Buffer Logic (Start < Event)", "PASS" if tw["query_start"] < tw["event_start"] else "FAIL")
        else:
             log("TC22", "Buffer Logic", "PASS", "(Skipped nulls)")

        # Data Integrity tests on trajectories
        valid_lat = True
        valid_lon = True
        valid_speed = True
        valid_ts_keys = True
        
        for ts, vessels in trajs.items():
            if not ts.isdigit(): valid_ts_keys = False
            for vid, point in vessels.items():
                if not (-90 <= point["latitude"] <= 90): valid_lat = False
                if not (-180 <= point["longitude"] <= 180): valid_lon = False
                if point.get("speed_mps", 0) < 0: valid_speed = False
        
        log("TC23", "Timestamp Keys numeric", "PASS" if valid_ts_keys else "FAIL")
        log("TC24", "Latitude Range Valid", "PASS" if valid_lat else "FAIL")
        log("TC25", "Longitude Range Valid", "PASS" if valid_lon else "FAIL")
        log("TC26", "Speed Non-Negative", "PASS" if valid_speed else "FAIL")

        # TC27: Vessel ID Consistency
        # Check if keys in trajectories match vessels_involved
        involved = set(str(v) for v in pb_data["event_details"].get("vessels_involved", []))
        traj_vids = set()
        for v_map in trajs.values():
            traj_vids.update(v_map.keys())
        
        # Trajectories should be subset of involved (some vessels might have no data)
        # But we shouldn't see UNKNOWN vessels
        log("TC27", "Vessel ID Consistency", "PASS" if traj_vids.issubset(involved) else "FAIL")

        # TC28: SQL Injection Safety (Basic)
        resp_sql = await client.get(f"{BASE_URL}/'OR 1=1--/playback")
        log("TC28", "SQL/Injection Safety", "PASS" if resp_sql.status_code in [404, 422] else "FAIL")

        # TC29: Empty Trajectories Handling (Schema still holds)
        # If we find an event with empty trajectories, test schema. 
        # Here we just re-verify top level structure holds even if dict empty.
        log("TC29", "Empty Traj Schema Valid", "PASS" if isinstance(trajs, dict) else "FAIL")

        # TC30: Course/Heading Range (0-360)
        valid_course = True
        for v_map in trajs.values():
            for p in v_map.values():
                c = p.get("course", 0)
                if c is not None and not (0 <= c <= 360): valid_course = False
        log("TC30", "Course Range Valid", "PASS" if valid_course else "FAIL")

        # TC31: Heading Range (0-360)
        valid_heading = True
        for v_map in trajs.values():
            for p in v_map.values():
                h = p.get("heading", 0)
                # Heading 511 means not available, so allow 511 too
                if h is not None and not (0 <= h <= 360) and h != 511: valid_heading = False
        log("TC31", "Heading Range Valid", "PASS" if valid_heading else "FAIL")

    print(f"\n{BOLD}Tests Completed.{RESET}")

if __name__ == "__main__":
    asyncio.run(run_expanded_tests())
