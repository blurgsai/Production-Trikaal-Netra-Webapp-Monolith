# Interface Control Document (ICD)

## Notification Server v3

**Version:** 3.0.0  
**Date:** 2026-06-16  
**Status:** Production-Ready

---

## Table of Contents

1. [Overview](#1-overview)
2. [Notification Producer Interface](#2-notification-producer-interface)
3. [Frontend App Interface](#3-frontend-app-interface)
4. [Common Data Models](#4-common-data-models)
5. [Error Handling](#5-error-handling)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Appendix: Channel-Specific Behavior](#7-appendix-channel-specific-behavior)

---

## 1. Overview

The Notification Server v3 provides a loosely-coupled, horizontally-scalable notification platform. It supports WebSocket push, email delivery, and open-ended payload schemas under the `data` field.

This ICD defines the contract between:

- **Notification Producers** — Backend systems that dispatch notifications
- **Frontend Applications** — Client apps (web/mobile) that receive and display notifications

### Base URL

| Environment | Base URL |
|-------------|----------|
| Local Dev   | `http://localhost:8000` |
| Swarm LB    | `http://localhost:8080` |
| Node Direct | `http://localhost:8001` (or 8002, 8003) |
| WebSocket   | `ws://localhost:8000/api/ws/{client_id}` |

### API Versioning

All API routes are prefixed with `/api`. Admin routes are at `/admin/*`.

---

## 2. Notification Producer Interface

Producers authenticate via **API Key** header (`X-API-Key`) and call HTTP REST endpoints.

### 2.1 Send Notification

**Endpoint:** `POST /api/notify`

**Description:** Primary dispatch endpoint. Delivers notifications via channels configured for the topic (WebSocket, Email, or both).

#### Request Headers

| Header        | Required | Description                  |
|---------------|----------|------------------------------|
| `X-API-Key`   | Yes      | Pre-configured API key       |
| `Content-Type`| Yes      | `application/json`           |

#### Request Body — `SendNotificationRequest`

| Field         | Type       | Required | Description                                         |
|---------------|------------|----------|-----------------------------------------------------|
| `topic`       | `string`   | Yes      | Registered topic name (snake_case: `a-z0-9_.-`)     |
| `client_ids`  | `string[]` | No*      | Direct delivery to specific client IDs              |
| `group_id`    | `string`   | No*      | Deliver to all members of a registered group        |
| `title`       | `string`   | No       | Notification title (default: `""`)                  |
| `body`        | `string`   | Yes      | Notification body (min 1 char)                      |
| `data`        | `object`   | No       | Arbitrary producer-defined payload (schema-free)    |
| `source_system`| `string`  | No       | Identifier of the calling system                    |

\* At least one of `client_ids` or `group_id` must be provided.

#### Example Request

```bash
curl -X POST "http://localhost:8000/api/notify" \
  -H "X-API-Key: secret-key-1" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "alerts",
    "client_ids": ["user-123", "user-456"],
    "title": "System Maintenance",
    "body": "Scheduled maintenance in 30 minutes.",
    "data": {
      "priority": "high",
      "category": "infra",
      "action_url": "https://status.example.com"
    },
    "source_system": "monitoring"
  }'
```

#### Response — `DeliveryResult` (201 Created)

| Field                 | Type       | Description                              |
|-----------------------|------------|------------------------------------------|
| `notification_id`     | `string`   | Unique MongoDB ObjectId of the stored notification |
| `topic`               | `string`   | Topic that was used                      |
| `channels_attempted`  | `string[]` | Channels tried (e.g., `["websocket"]`) |
| `channels_delivered`  | `string[]` | Channels that succeeded                  |
| `ws_delivered_to`     | `string[]` | Client IDs that received WebSocket push  |
| `ws_published`        | `boolean`  | Whether published to Redis for swarm     |
| `email_sent_to`       | `string[]` | Recipients that received email           |

#### Example Response

```json
{
  "notification_id": "666ff1234567890abcdef123",
  "topic": "alerts",
  "channels_attempted": ["websocket", "email"],
  "channels_delivered": ["websocket"],
  "ws_delivered_to": ["user-123"],
  "ws_published": true,
  "email_sent_to": []
}
```

---

### 2.2 Topic Management

Topics define which channels (`websocket`, `email`) are enabled and optionally override SMTP/storage settings.

#### 2.2.1 Create Topic

**Endpoint:** `POST /api/topics`

**Request Body:**

| Field                     | Type       | Required | Description                              |
|---------------------------|------------|----------|------------------------------------------|
| `topic`                   | `string`   | Yes      | `^[a-z0-9_.\-]+$`                        |
| `channels`                | `string[]` | Yes      | `["websocket"]` or `["email"]` or both   |
| `email_template`          | `string`   | No       | Jinja2 template string for email body    |
| `email_subject_template`  | `string`   | No       | Jinja2 template for email subject        |
| `metadata`                | `object`   | No       | Arbitrary key-value metadata             |
| `storage_uri`             | `string`   | No       | Override MongoDB URI for this topic      |
| `storage_db`              | `string`   | No       | Override MongoDB database                |
| `storage_collection`      | `string`   | No       | Collection name (default: `notifications`) |
| `smtp_*`                  | varies     | No       | Per-topic SMTP overrides                 |

#### 2.2.2 List Topics

**Endpoint:** `GET /api/topics`

**Response:** `Array<TopicConfig>`

#### 2.2.3 Get Topic

**Endpoint:** `GET /api/topics/{topic}`

#### 2.2.4 Update Topic

**Endpoint:** `PATCH /api/topics/{topic}`

**Request Body:** Same fields as Create (all optional).

#### 2.2.5 Delete Topic

**Endpoint:** `DELETE /api/topics/{topic}`

**Response:** `204 No Content`

---

### 2.3 Group Management

Groups are named sets of `client_ids` used for bulk targeting.

#### 2.3.1 Upsert Group

**Endpoint:** `PUT /api/groups/{group_id}`

**Request Body:**

| Field         | Type       | Required | Description                              |
|---------------|------------|----------|------------------------------------------|
| `group_id`    | `string`   | Yes      | `^[a-z0-9_.\-]+$`                        |
| `client_ids`  | `string[]` | Yes      | Members of the group                     |
| `metadata`    | `object`   | No       | Arbitrary metadata                       |

#### 2.3.2 List Groups

**Endpoint:** `GET /api/groups`

#### 2.3.3 Get Group

**Endpoint:** `GET /api/groups/{group_id}`

#### 2.3.4 Add Members

**Endpoint:** `POST /api/groups/{group_id}/members`

**Request Body:** `{"client_ids": ["u3", "u4"]}`

#### 2.3.5 Remove Members

**Endpoint:** `DELETE /api/groups/{group_id}/members`

**Request Body:** `{"client_ids": ["u3"]}`

#### 2.3.6 Delete Group

**Endpoint:** `DELETE /api/groups/{group_id}`

**Response:** `204 No Content`

---

### 2.4 User Management (Read-Only)

**Important:** User data is managed by an external system. The Notification Server provides **read-only access** to user information for notification delivery purposes (e.g., email resolution). Create, Update, and Delete operations on users are **not available** via the Notification Server API.

#### 2.4.1 User Login

**Endpoint:** `POST /api/login`

**Description:** Authenticate a user with username and password. Returns a JWT token for subsequent WebSocket connections.

**Request Body:**

```json
{
  "username": "john",
  "password": "test123"
}
```

**Response:**

```json
{
  "client_id": "user-123",
  "username": "john",
  "display_name": "John Doe",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401 Unauthorized` — Invalid username or password
- `401 Unauthorized` — User account is inactive
- `401 Unauthorized` — User has no password set

#### 2.4.2 List Users

**Endpoint:** `GET /api/users`

**Description:** Retrieve all registered users (read-only).

**Query Parameters:**

| Param         | Type      | Default | Description                              |
|---------------|-----------|---------|------------------------------------------|
| `skip`        | `integer` | 0       | Pagination offset                        |
| `limit`       | `integer` | 50      | Max items (1-200)                        |

**Response:** `Array<User>`

#### 2.4.3 Get User by Client ID

**Endpoint:** `GET /api/users/{client_id}`

**Description:** Retrieve a specific user by their client identifier.

**Response:** `User` or `404 Not Found`

#### 2.4.4 Check User Existence

**Endpoint:** `HEAD /api/users/{client_id}`

**Description:** Check if a user exists without retrieving full data.

**Response:** `200 OK` if exists, `404 Not Found` otherwise.

#### 2.4.5 User Count

**Endpoint:** `GET /api/users/count`

**Description:** Get total number of registered users.

**Response:** `{"count": 42}`

---

### 2.5 Notification Query (Producer Side)

Producers typically do not query notifications, but the endpoints exist for audit/debugging.

#### 2.5.1 List Notifications for Client

**Endpoint:** `GET /api/notifications/{client_id}`

**Query Parameters:**

| Param         | Type      | Default | Description                              |
|---------------|-----------|---------|------------------------------------------|
| `topic`       | `string`  | null    | Filter by topic                          |
| `skip`        | `integer` | 0       | Pagination offset                        |
| `limit`       | `integer` | 50      | Max items (1-200)                        |
| `unread_only` | `boolean` | false   | Only unread notifications                |

---

## 3. Frontend App Interface

Frontend apps connect via **WebSocket** for real-time push and use **HTTP** for reading/marking notifications.

### 3.1 WebSocket Connection

**Endpoint:** `ws://{host}/api/ws?token={jwt_token}`

**Description:** Persistent WebSocket connection for receiving push notifications. Authentication is done via JWT token passed as a query parameter.

#### Connection Flow

1. Authenticate via `POST /api/login` to receive JWT token
2. Open WebSocket to `/api/ws?token={jwt_token}`
3. Server validates the JWT token before accepting the connection
4. If token is invalid or expired, connection is rejected with code `1008`
5. Receive JSON push messages when notifications are sent
6. Send `"ping"` to receive `"pong"` (optional keepalive)
7. Heartbeat frames `{"type": "heartbeat"}` sent every 30s if no traffic

**Important:** The `client_id` is no longer used in the URL path. The user identity is derived from the JWT token payload (`sub` claim).

#### Receiving Notifications

When a producer sends a notification targeting this `client_id`, the server pushes:

```json
{
  "id": "666ff1234567890abcdef123",
  "topic": "alerts",
  "client_ids": ["user-123"],
  "group_id": null,
  "title": "System Maintenance",
  "body": "Scheduled maintenance in 30 minutes.",
  "data": {
    "priority": "high",
    "category": "infra",
    "action_url": "https://status.example.com"
  },
  "channels_attempted": ["websocket"],
  "channels_delivered": ["websocket"],
  "read_by": [],
  "source_system": "monitoring",
  "created_at": "2026-06-16T09:00:00Z",
  "updated_at": "2026-06-16T09:00:00Z"
}
```

**Note:** In a multi-node swarm, Redis pub/sub ensures the message reaches the node where the client's WebSocket is connected.

#### JavaScript Example

```javascript
const clientId = "user-123";
const ws = new WebSocket(`ws://localhost:8000/api/ws/${clientId}`);

ws.onopen = () => console.log("Connected");

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  if (notification.type === "heartbeat") return;
  console.log("New notification:", notification);
  // Display in UI, play sound, etc.
};

ws.onclose = () => console.log("Disconnected");

// Keepalive
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) ws.send("ping");
}, 25000);
```

---

### 3.2 HTTP API for Frontend

Frontends use the same HTTP endpoints as producers for reading notifications and marking them read.

#### 3.2.1 List My Notifications

**Endpoint:** `GET /api/notifications/{client_id}`

**Headers:** `X-API-Key: {key}`

**Query Parameters:**

| Param         | Type      | Default | Description                              |
|---------------|-----------|---------|------------------------------------------|
| `topic`       | `string`  | null    | Filter by topic                          |
| `skip`        | `integer` | 0       | Pagination offset                        |
| `limit`       | `integer` | 50      | Max items (1-200)                        |
| `unread_only` | `boolean` | false   | Only unread                              |

**Response:** `Array<Notification>`

#### 3.2.2 Mark Notification Read

**Endpoint:** `PATCH /api/notifications/{notification_id}/read?client_id={client_id}`

**Response:** `Notification` (updated with `read_by` including the client)

#### 3.2.3 Mark All Read

**Endpoint:** `PATCH /api/notifications/{client_id}/read-all`

**Response:**

```json
{"marked_read": 5}
```

---

### 3.3 Admin Web UI

Administrators access the web dashboard at `/admin` endpoints:

| Route              | Method | Description           |
|--------------------|--------|-----------------------|
| `/admin/login`     | GET/POST| Login page / submit  |
| `/admin/logout`    | POST   | Clear session         |
| `/admin`           | GET    | Dashboard with stats  |
| `/admin/groups`    | GET    | Group management      |
| `/admin/clients`   | GET    | Client overview       |

---

## 4. Common Data Models

### 4.1 `User`

```json
{
  "id": "string (24-char hex ObjectId)",
  "client_id": "string",
  "display_name": "string | null",
  "email": "string | null",
  "is_active": true,
  "created_at": "2026-06-16T09:00:00Z"
}
```

**Note:** User records are managed externally. The Notification Server only reads this data for email resolution and client validation.

### 4.2 `Notification`

```json
{
  "id": "string (24-char hex ObjectId)",
  "topic": "string",
  "client_ids": ["string"],
  "group_id": "string | null",
  "title": "string",
  "body": "string",
  "data": {},
  "channels_attempted": ["websocket"],
  "channels_delivered": ["websocket"],
  "read_by": ["client-id"],
  "source_system": "string | null",
  "created_at": "2026-06-16T09:00:00Z",
  "updated_at": "2026-06-16T09:00:00Z"
}
```

### 4.2 `TopicConfig`

```json
{
  "id": "string",
  "topic": "alerts",
  "channels": ["websocket", "email"],
  "email_template": "Hello {{ name }}, ...",
  "email_subject_template": "Alert: {{ title }}",
  "metadata": {},
  "storage_uri": "mongodb://... | null",
  "storage_db": "string | null",
  "storage_collection": "notifications",
  "smtp_host": "smtp.example.com | null",
  "smtp_port": 587,
  "smtp_user": "... | null",
  "smtp_password": "... | null",
  "smtp_from": "... | null",
  "smtp_tls": true,
  "created_at": "2026-06-16T09:00:00Z",
  "updated_at": "2026-06-16T09:00:00Z"
}
```

### 4.3 `Group`

```json
{
  "id": "string",
  "group_id": "team-a",
  "client_ids": ["u1", "u2"],
  "metadata": {"dept": "eng"},
  "created_at": "2026-06-16T09:00:00Z",
  "updated_at": "2026-06-16T09:00:00Z"
}
```

### 4.4 `DeliveryResult`

```json
{
  "notification_id": "string",
  "topic": "string",
  "channels_attempted": ["string"],
  "channels_delivered": ["string"],
  "ws_delivered_to": ["string"],
  "ws_published": true,
  "email_sent_to": ["string"]
}
```

---

## 5. Error Handling

### 5.1 HTTP Error Response Format

All errors return JSON:

```json
{
  "detail": "Human-readable error message"
}
```

### 5.2 Error Codes

| Status | Error            | Trigger                                    |
|--------|------------------|--------------------------------------------|
| 400    | Bad Request      | Malformed JSON, validation errors          |
| 401    | Unauthorized     | Missing or invalid `X-API-Key`             |
| 404    | Not Found        | Resource (topic, group, notification) missing |
| 409    | Conflict         | Duplicate topic or group ID on create      |
| 422    | Validation Error | Pydantic validation failure (e.g., `body` too short, invalid `topic` format) |
| 502    | External Service | SMTP or MongoDB connection failure         |

### 5.3 Producer-Specific Errors

| Scenario                              | Status | Detail Example                              |
|---------------------------------------|--------|---------------------------------------------|
| Topic does not exist                  | 404    | `TopicConfig 'alerts' not found`            |
| Neither `client_ids` nor `group_id`   | 422    | `Must provide client_ids or group_id`       |
| Group not found                       | 404    | `Group 'team-a' not found`                  |
| Invalid topic name (`My Topic!`)      | 422    | `String should match pattern '^[a-z0-9_.\-]+$'` |
| Duplicate topic on create           | 409    | `TopicConfig 'alerts' already exists`     |

---

## 6. Authentication & Authorization

### 6.1 Producer Authentication

Producers must include a valid API key in **every** request:

```
X-API-Key: secret-key-1
```

- API keys are configured server-side via the `API_KEYS` environment variable (JSON array)
- If `API_KEYS` is empty (`[]`), the API is **open** (no auth required) — useful for development
- Multiple keys are supported for rotation

### 6.2 Admin Authentication

Admin dashboard uses **cookie-based session auth**:

1. `POST /admin/login` with `username` + `password`
2. Server sets `admin_session` HTTP-only cookie
3. All `/admin/*` routes require valid session
4. `POST /admin/logout` clears cookie

Session tokens are JWT-like signed tokens with 24-hour expiry.

### 6.3 WebSocket Authentication

WebSocket connections **do not require authentication** in the current version. The `client_id` in the URL path identifies the connection. If auth is needed, implement a token query parameter or subprotocol handshake.

---

## 7. Appendix: Channel-Specific Behavior

### 7.1 WebSocket Channel

- Immediate push to connected clients
- In a swarm, Redis pub/sub broadcasts to all nodes
- Delivery status tracked in `ws_delivered_to`
- If client is offline, notification is still stored in DB; client retrieves via `GET /api/notifications/{client_id}`

### 7.2 Email Channel

- Requires topic-level or global SMTP configuration
- Uses Jinja2 templates (`email_template`, `email_subject_template`) with `data` fields as template variables
- If SMTP is not configured, email is silently skipped
- Delivery status tracked in `email_sent_to`

### 7.3 Storage Routing (Per-Topic)

Topics can override MongoDB storage for data isolation:

| Default | `mongodb://localhost:27017` / `notification_server` / `notifications` |
| Override | Set `storage_uri`, `storage_db`, `storage_collection` on topic config |
| Rule | If any storage field is set, **all three** must be set (strict mode) |

---

## 8. Future Scope: Enterprise Scale Mitigations

The current design is optimized for moderate scale (hundreds to low thousands of concurrent clients). For enterprise-scale deployments (10,000+ concurrent clients, high notification volume), the following mitigations are planned:

### 8.1 Large Group Notification Handling

**Issue:** MongoDB has a 16MB document limit. Notifications sent to very large groups (10,000+ users) could exceed this limit when storing `client_ids` arrays.

**Planned Mitigations:**
- Store `client_ids` in a separate collection and reference via notification ID
- Implement a "broadcast flag" pattern for system-wide notifications instead of enumerating recipients
- Shard notifications by topic or time range to distribute document size

### 8.2 Query Performance Optimization

**Issue:** With millions of notifications, `find({client_ids: "user-x"})` queries may slow down.

**Planned Mitigations:**
- Ensure `{client_ids: 1}` index exists (currently present)
- Implement TTL (Time-To-Live) policies for automatic cleanup of old notifications
- Add compound indexes for common query patterns (e.g., `{client_ids: 1, created_at: -1}`)
- Consider read replicas for notification query endpoints

### 8.3 WebSocket Connection Scaling

**Issue:** Each node stores connections in memory (`ws_manager._connections`). 10,000+ concurrent connections per node could consume significant RAM.

**Planned Mitigations:**
- Horizontal scaling with additional nodes (already supported via swarm mode)
- Implement connection pooling and limit max connections per node
- Consider connection offloading to a dedicated WebSocket service
- Add health checks and automatic connection draining during node shutdown

### 8.4 Redis Pub/Sub Scalability

**Issue:** Every notification publishes to Redis in swarm mode. High notification volume could saturate Redis.

**Planned Mitigations:**
- Implement Redis clustering for horizontal scaling
- Add message batching for high-volume topics
- Consider direct delivery for critical, high-frequency topics (bypassing Redis)
- Add Redis monitoring and alerting for saturation

### 8.5 Email Rate Limiting

**Issue:** SMTP servers have rate limits (e.g., 1000/hour). Large group emails could be throttled.

**Planned Mitigations:**
- Implement a queue system (e.g., Celery, RQ) for async email delivery
- Add batch sending with configurable delays between batches
- Integrate with transactional email services (SendGrid, AWS SES) for better rate handling
- Add retry logic with exponential backoff for failed deliveries

### 8.6 Per-Topic Storage Isolation

**Current Status:** Per-topic storage routing is supported via `storage_uri`, `storage_db`, `storage_collection` fields.

**Future Enhancements:**
- Automatic storage provisioning for new topics
- Storage tiering (hot/cold data) based on notification age
- Cross-topic analytics queries across distributed storage

---

## Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 3.1.0   | 2026-06-16 | Auto   | Removed client_id from pipeline; WebSocket now uses JWT token authentication via query parameter |
| 3.0.2   | 2026-06-16 | Auto   | Added Future Scope section (section 8) with enterprise-scale mitigations |
| 3.0.1   | 2026-06-16 | Auto   | Added read-only User Management API (section 2.4) and User data model (section 4.1) |
| 3.0.0   | 2026-06-16 | Auto   | Initial ICD for v3       |
