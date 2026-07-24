import sys
import os
import random
import time
import asyncio
import json
import jwt
import httpx
from pathlib import Path
from dotenv import load_dotenv

# Add project root to python path to import core clients
sys.path.append(str(Path(__file__).parent.parent))

from core.clients.minio_client import MinioClient

# Load env configuration
load_dotenv()

API_BASE = "http://localhost:8000"
JWT_SECRET = os.getenv("JWT_SECRET", "jwt-secret-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
USERNAME = "pavan"
CHAT_TIMEOUT = 120
SEPARATOR = "=" * 70

def generate_random_project():
    """Generates a random unique project, file content, and query keys."""
    adjectives = ["Aether", "Chronos", "Goliath", "Quantum", "Hyperion", "Obsidian", "Vanguard", "Apex", "Eclipse", "Ragnarok"]
    nouns = ["Matrix", "Grid", "Pinnacle", "Prism", "Sentry", "Harvester", "Catalyst", "Beacon", "Conduit", "Engine"]
    locations = ["Sagittarius Arm", "Vega Sector", "Kepler Void", "Solar System", "Betelgeuse Ring"]
    
    project_name = f"Project {random.choice(adjectives)} {random.choice(nouns)} {random.randint(100, 999)}"
    year = random.randint(2040, 2200)
    location = random.choice(locations)
    
    content = f"The {project_name} is a classified energy generation facility built in the year {year} located in the {location}."
    query = f"What is {project_name} and when and where was it built?"
    
    # Keywords we expect in the positive response
    expected_keywords = [str(year), location]
    
    return project_name, content, query, expected_keywords

def mint_token(username: str, role: str = "user") -> str:
    """Create a HS256 JWT matching what jwt_auth.py expects."""
    payload = {
        "sub": username,
        "role": role,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

async def create_session(client: httpx.AsyncClient, token: str) -> str:
    resp = await client.post(
        f"{API_BASE}/sessions",
        json={"title": f"Dynamic Ingestion Flow Test {int(time.time())}"},
        headers=auth_headers(token),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["session_id"]

async def ask(client: httpx.AsyncClient, token: str, session_id: str, message: str) -> str:
    print(f"\n  💬 Asking: \"{message}\"")
    full_answer = ""
    
    async with client.stream(
        "POST",
        f"{API_BASE}/stream",
        json={"session_id": session_id, "message": message},
        headers={
            **auth_headers(token),
            "Accept": "text/event-stream",
        },
        timeout=CHAT_TIMEOUT,
    ) as response:
        response.raise_for_status()
        async for raw_line in response.aiter_lines():
            line = raw_line.strip()
            if not line or not line.startswith("data:"):
                continue
            payload = line[5:].strip()
            if payload == "[DONE]":
                break
            try:
                event = json.loads(payload)
                full_answer += event.get("v", "")
            except Exception:
                pass
                
    print(f"  🤖 Response: {full_answer}")
    return full_answer

async def add_global_document(client: httpx.AsyncClient, token: str, file_name: str, session_id: str) -> dict:
    resp = await client.post(
        f"{API_BASE}/add-global-documents",
        json={
            "file_path": file_name,
            "file_name": file_name,
            "description": f"Automated test document for {file_name}",
            "session_id": session_id
        },
        headers=auth_headers(token),
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()

async def main():
    print(f"\n{SEPARATOR}")
    print("🚀 STARTING AUTOMATED DYNAMIC INGESTION INTEGRATION TEST")
    print(f"{SEPARATOR}")
    
    # 1. Generate unique random project details
    project_name, file_content, query, expected_keywords = generate_random_project()
    file_name = f"auto_{project_name.lower().replace(' ', '_')}.txt"
    local_path = Path("data") / file_name
    
    print(f"📁 Generated project name : {project_name}")
    print(f"📝 Expected details      : Year {expected_keywords[0]} in {expected_keywords[1]}")
    print(f"📄 Generated filename    : {file_name}")
    
    # 2. Save file locally
    os.makedirs("data", exist_ok=True)
    with open(local_path, "w") as f:
        f.write(file_content)
    print(f"✓ Saved temporary file to: {local_path}")
    
    try:
        # 3. Upload to MinIO
        minio_client = MinioClient()
        print(f"☁️  Uploading '{file_name}' to MinIO bucket '{minio_client.bucket_name}'...")
        minio_client.client.fput_object(minio_client.bucket_name, file_name, str(local_path))
        print("✓ Upload to MinIO complete.")
        
        # 4. Mint token and create session
        token = mint_token(USERNAME)
        async with httpx.AsyncClient() as client:
            print("\n🔑 Minting JWT and initializing session...")
            session_id = await create_session(client, token)
            print(f"✓ Session created: {session_id}")
            
            # 5. Ask question BEFORE ingestion (expect "I don't know / can't answer")
            print("\n--- STEP 1: Ask BEFORE Ingestion ---")
            answer_before = await ask(client, token, session_id, query)
            negative_phrases = ["don't have", "do not have", "no information", "not available", "cannot find", "unable to find"]
            answered_before = not any(p in answer_before.lower() for p in negative_phrases)
            
            if answered_before:
                print("⚠️  Warning: LLM claimed to know the answer before indexing.")
            else:
                print("✅ PASS: LLM correctly reported it has no info about this new project.")
                
            # 6. Ingest document via API
            print("\n--- STEP 2: Ingest Document via API ---")
            print(f"Calling /add-global-documents for {file_name}...")
            upload_result = await add_global_document(client, token, file_name, session_id)
            print(f"✓ Ingestion API response: {upload_result}")
            
            # Wait for propagation
            print("⏳ Waiting 3 seconds for index updating and cache invalidation...")
            await asyncio.sleep(3)
            
            # 7. Ask question AFTER ingestion (expect correct response with keywords)
            print("\n--- STEP 3: Ask AFTER Ingestion ---")
            answer_after = await ask(client, token, session_id, query)
            
            # Verify if expected keywords are present in response
            missing_keywords = [kw for kw in expected_keywords if kw.lower() not in answer_after.lower()]
            
            if missing_keywords:
                print(f"\n❌ FAIL: Answer did not contain expected details {missing_keywords}")
                print(f"Answer received: {answer_after}")
                sys.exit(1)
            else:
                print(f"\n✅ PASS: Answer contains all expected details: {expected_keywords}")
                
    finally:
        # Cleanup local file
        if local_path.exists():
            os.remove(local_path)
            print(f"🗑️  Cleaned up local file '{local_path}'")
            
    print(f"\n{SEPARATOR}")
    print("🎉 INTEGRATION TEST SUITE COMPLETED SUCCESSFULLY!")
    print(f"{SEPARATOR}\n")

if __name__ == "__main__":
    asyncio.run(main())
