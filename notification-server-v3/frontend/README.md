# Notification Demo Frontend

A simple web demo to test the Notification Server v3 WebSocket functionality with username/password authentication.

## Features

- **Login Page**: Authenticate with username and password (bcrypt hashed in DB)
- **Dashboard**: Two notification cards for different topics (Alerts & Updates)
- **Real-time WebSocket**: Auto-connects to notification server using authenticated client_id
- **Badge Counts**: Shows unread notification count
- **Mark as Read**: Click notifications to mark them read

## Setup

1. Ensure the Notification Server swarm is running:
   ```bash
   cd "/home/pavankumarkona/Projects/Notification Server v3"
   docker-compose -f docker-compose.swarm.yml up -d
   ```

2. Create a test user in MongoDB with username and password_hash:
   ```python
   import bcrypt
   
   # Generate password hash
   password = "test123"
   salt = bcrypt.gensalt()
   password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
   
   # Insert into MongoDB
   db.users.insert_one({
       "client_id": "user-123",
       "username": "john",
       "password_hash": password_hash,
       "display_name": "John Doe",
       "email": "john@example.com",
       "is_active": True,
       "created_at": datetime.now(timezone.utc),
       "updated_at": datetime.now(timezone.utc)
   })
   ```

3. Open the demo in your browser:
   ```
   file:///home/pavankumarkona/Projects/Notification Server v3/frontend/index.html
   ```

4. Login with username `john` and password `test123`

## Testing with Postman

### 1. Create Topics

First, create the two topics used by the demo:

**Create Alerts Topic:**
```
POST http://localhost:8080/api/topics
Headers:
  X-API-Key: secret-key-1
  Content-Type: application/json

Body:
{
  "topic": "alerts",
  "channels": ["websocket"],
  "metadata": {}
}
```

**Create Updates Topic:**
```
POST http://localhost:8080/api/topics
Headers:
  X-API-Key: secret-key-1
  Content-Type: application/json

Body:
{
  "topic": "updates",
  "channels": ["websocket"],
  "metadata": {}
}
```

### 2. Send Notifications

**Send to Alerts Topic:**
```
POST http://localhost:8080/api/notify
Headers:
  X-API-Key: secret-key-1
  Content-Type: application/json

Body:
{
  "topic": "alerts",
  "client_ids": ["user-123"],
  "title": "System Alert",
  "body": "This is a test alert notification",
  "data": {
    "priority": "high",
    "category": "system"
  }
}
```

**Send to Updates Topic:**
```
POST http://localhost:8080/api/notify
Headers:
  X-API-Key: secret-key-1
  Content-Type: application/json

Body:
{
  "topic": "updates",
  "client_ids": ["user-123"],
  "title": "New Update Available",
  "body": "Version 3.0.1 is now available",
  "data": {
    "version": "3.0.1",
    "release_notes": "Bug fixes and improvements"
  }
}
```

### 3. Test Login API

**Login Endpoint:**
```
POST http://localhost:8080/api/login
Headers:
  Content-Type: application/json

Body:
{
  "username": "john",
  "password": "test123"
}

Response:
{
  "client_id": "user-123",
  "username": "john",
  "display_name": "John Doe"
}
```

### 4. Send to Multiple Clients

You can send to multiple client IDs at once:
```json
{
  "topic": "alerts",
  "client_ids": ["user-123", "user-456", "user-789"],
  "title": "Maintenance Notice",
  "body": "Scheduled maintenance in 1 hour"
}
```

### 5. Send via Groups

First create a group:
```
POST http://localhost:8080/api/groups/engineering
Headers:
  X-API-Key: secret-key-1
  Content-Type: application/json

Body:
{
  "group_id": "engineering",
  "client_ids": ["user-123", "user-456"],
  "metadata": {
    "department": "engineering"
  }
}
```

Then send to the group:
```json
{
  "topic": "alerts",
  "group_id": "engineering",
  "title": "Team Meeting",
  "body": "Standup in 15 minutes"
}
```

## WebSocket Endpoints

The demo connects to:
- `ws://localhost:8000/api/ws?token={jwt_token}` (via nginx load balancer)
- Direct node: `ws://localhost:8001/api/ws?token={jwt_token}` (node 1)

**Important:** The JWT token is passed as a query parameter. The server validates the token before accepting the connection.

## Notes

- The demo uses localStorage to persist the session (token, client_id, username, display_name)
- Login is authenticated via `POST /api/login` which validates username/password against bcrypt hash and returns a JWT token
- WebSocket connections send the JWT token as a query parameter (`?token=...`)
- The server validates the JWT token on WebSocket connect and extracts the user_id from the `sub` claim
- Both notification cards connect to the same WebSocket endpoint but filter by topic
- Heartbeat is sent every 25 seconds to keep connections alive
- Click on a notification to mark it as read
- Badge shows count of unread notifications
