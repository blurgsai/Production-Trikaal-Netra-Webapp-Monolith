# Notification Server v3

Loosely-coupled, reusable notification server. Drop it alongside any project and call it from any producer system.

## Key Design Decisions

| Concern | Choice |
|---|---|
| Schema for payload | Open-ended `data: dict[str, Any]` — producers attach anything |
| Delivery channels | Configured per-topic (websocket, email) — not hardcoded |
| Targeting | `client_ids` (direct) **or** `group_id` (resolved server-side) |
| Auth | Optional `X-API-Key` header — set `API_KEYS=[]` to disable |
| Arch pattern | Layered (clients → models/mapper → services → router) per design patterns doc |

## Project Structure

```
src/
  main.py
  shared/
    config/         # Settings (pydantic-settings, .env)
    dependencies/   # FastAPI DI: DB session, API key guard
    errors/         # Typed HTTP exceptions
    websocket/      # WebSocketManager singleton
    email/          # Async SMTP sender with template rendering
  features/
    notifications/  # /api/notify, /api/notifications, /api/ws/{client_id}
    topics/         # /api/topics — CRUD for topic→channel config
    groups/         # /api/groups — manage client_id sets
```

## Quick Start — Docker Compose (recommended)

```bash
# 1. Copy and edit the compose env file
cp .env.example docker.env
# Edit docker.env: set SECRET_KEY, API_KEYS, and SMTP_* if needed

# 2. Start the stack (MongoDB + app)
docker compose up -d --build

# 3. Create your first admin user
docker compose exec app python create_admin.py create admin yourpassword

# 4. Open the admin panel
#    http://localhost:8000/admin
#    API docs: http://localhost:8000/docs
```

To stop: `docker compose down`  
To wipe all data: `docker compose down -v`

## Quick Start — Local Dev

```bash
cp .env.example .env
# edit .env (set MONGODB_URI=mongodb://localhost:27017)

pip install -r requirements.txt
cd src
uvicorn main:app --reload

# Create first admin user
python create_admin.py create admin yourpassword
```

API docs: http://localhost:8000/docs

## How It Works

### 1. Register a topic
```http
POST /api/topics
X-API-Key: secret-key-1

{
  "topic": "order.shipped",
  "channels": ["websocket", "email"],
  "email_subject_template": "Your order $order_id has shipped",
  "email_template": "<p>Hi, your order <b>$order_id</b> is on its way!</p>"
}
```

### 2. Send a notification (from any producer system)
```http
POST /api/notify
X-API-Key: secret-key-1

{
  "topic": "order.shipped",
  "client_ids": ["user-123", "user@example.com"],
  "title": "Order Shipped",
  "body": "Your order has shipped",
  "data": {
    "order_id": "ORD-9999",
    "tracking_url": "https://track.example.com/ORD-9999"
  },
  "source_system": "order-service"
}
```

### 3. Client connects via WebSocket
```js
const ws = new WebSocket("ws://localhost:8000/api/ws/user-123");
ws.onmessage = (e) => console.log(JSON.parse(e.data));
// receives: { type: "notification", id, topic, title, body, data }
```

### 4. Client polls inbox
```http
GET /api/notifications/user-123?unread_only=true
X-API-Key: secret-key-1
```

## Open-Ended `data` Field

The `data` field accepts any JSON object. The `email_template` / `email_subject_template` strings use Python's `$variable` substitution against the flattened `data` dict + core fields (`topic`, `title`, `body`, `source_system`). No schema registration needed — just send whatever context your producer has.

## Groups

```http
PUT /api/groups/premium-users
{ "group_id": "premium-users", "client_ids": ["u1", "u2", "u3"] }

POST /api/notify
{ "topic": "product.update", "group_id": "premium-users", ... }
```
