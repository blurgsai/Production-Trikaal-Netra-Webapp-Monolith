#!/usr/bin/env python3
import requests
import sys

UPLOADS = [
    ("US2EC04M - East Coast Harbor", "/tmp/enc_downloads/US2EC04M/ENC_ROOT/US2EC04M/US2EC04M.000"),
    ("US3EC05M - East Coast Coastal", "/tmp/enc_downloads/US3EC05M/ENC_ROOT/US3EC05M/US3EC05M.000"),
    ("US3GC01M - Gulf Coast Coastal", "/tmp/enc_downloads/US3GC01M/ENC_ROOT/US3GC01M/US3GC01M.000"),
    ("US5AK11M - Alaska Overview", "/tmp/enc_downloads/US5AK11M/ENC_ROOT/US5AK11M/US5AK11M.000"),
    ("US5AK14M - Alaska Overview 2", "/tmp/enc_downloads/US5AK14M/ENC_ROOT/US5AK14M/US5AK14M.000"),
]

login = requests.post(
    "http://localhost:5000/users/login",
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    data="username=pavan&password=password",
)
token = login.json().get("token")
print(f"Login: {login.status_code}")

for name, path in UPLOADS:
    print(f"Uploading {name}...")
    with open(path, "rb") as f:
        resp = requests.post(
            "http://localhost:8001/overlays/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": (path.split("/")[-1], f)},
            data={"name": name, "attribution": "NOAA ENC", "color": "#3388ff", "opacity": "1.0"},
            timeout=180,
        )
    print(f"  status={resp.status_code}")
    try:
        d = resp.json()
        print(f"  id={d.get('id')} bounds={d.get('bounds')} source_type={d.get('source_type')}")
    except Exception as e:
        print(f"  ERROR: {e}")
        print(f"  body: {resp.text[:200]}")
