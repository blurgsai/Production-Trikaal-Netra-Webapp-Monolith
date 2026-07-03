# Backend Test Results: Events API

**Date:** 2026-02-16
**Status:** ✅ **ALL 31 TESTS PASSED**
**Environment:** Local Integration (FastAPI + MongoDB + ClickHouse)

## Summary
I executed the expanded live API test suite ([tests/test_api_expanded.py](file:///e:/blurgs/Projects/Trikaal%20Netra/Production-Trikaal-Netra-Webapp-Backend/tests/test_api_expanded.py)) against the backend. 

| Component | Total Tests | Passed | Failed | Success Rate |
| :--- | :--- | :--- | :--- | :--- |
| List Endpoint | 15 | 15 | 0 | 100% |
| Playback Endpoint | 16 | 16 | 0 | 100% |
| **Total** | **31** | **31** | **0** | **100%** |

---

## Detailed Results

### Group 1: List Events (`/api/mongo-events/list`)

| ID | Description | Result |
| :--- | :--- | :--- |
| TC01 | Status Code 200 | ✅ PASS |
| TC02 | Content-Type JSON | ✅ PASS |
| TC03 | Schema Keys Present | ✅ PASS |
| TC04 | 'events' is List | ✅ PASS |
| TC05 | Default Limit (1000) | ✅ PASS |
| TC06 | Limit=5 Restriction | ✅ PASS |
| TC07 | Limit Value in Response | ✅ PASS |
| TC08 | Limit=0 Handling (Empty) | ✅ PASS |
| TC09 | Offset Functionality | ✅ PASS |
| TC10 | Negative Limit Handling | ✅ PASS |
| TC11 | Event ID Present | ✅ PASS |
| TC12 | Event Type Present | ✅ PASS |
| TC13 | Start Time Present | ✅ PASS |
| TC14 | Vessels List Present | ✅ PASS |
| TC15 | Perf: Limit=1000 < 2s | ✅ PASS |

### Group 2: Playback (`/api/mongo-events/{id}/playback`)

| ID | Description | Result |
| :--- | :--- | :--- |
| TC16 | Playback Status 200 | ✅ PASS |
| TC17 | Root Keys (details, traj) | ✅ PASS |
| TC18 | Event Details Match ID | ✅ PASS |
| TC19 | Trajectories is Dict | ✅ PASS |
| TC20 | Time Window Schema | ✅ PASS |
| TC21 | Invalid ID -> 404 | ✅ PASS |
| TC22 | Buffer Logic (Start < Event) | ✅ PASS |
| TC23 | Timestamp Keys numeric | ✅ PASS |
| TC24 | Latitude Range Valid | ✅ PASS |
| TC25 | Longitude Range Valid | ✅ PASS |
| TC26 | Speed Non-Negative | ✅ PASS |
| TC27 | Vessel ID Consistency | ✅ PASS |
| TC28 | SQL/Injection Safety | ✅ PASS |
| TC29 | Empty Traj Schema Valid | ✅ PASS |
| TC30 | Course Range Valid | ✅ PASS |
| TC31 | Heading Range Valid | ✅ PASS |

## Conclusion
The backend is verified with a comprehensive suite of 31 automated tests covering status codes, schema validation, data integrity, security (SQLi), and performance.
