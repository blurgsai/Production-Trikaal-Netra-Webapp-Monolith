# Trident Chatbot API Documentation

## Base URL
```
Production: http://34.14.150.136:8000
```

## Authentication

All API endpoints (except `/health`) require JWT authentication using Bearer token.

### Headers
```javascript
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

### Sample JWT Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwYXZhbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc3NDM4MTkxOH0.lQ7zhcx9fiOGQdA1I_gRkeu9RbHYjUKiFzkCmbyJo70
```

---

## API Endpoints

### 1. Health Check

Check if the API is running and healthy.

**Endpoint:** `GET /health`

**Authentication:** Not required

**Response:**
```json
{
  "status": "ok",
  "llm_client_connected": true
}
```

**React Example:**
```javascript
const checkHealth = async () => {
  try {
    const response = await fetch('http://34.14.150.136:8000/health');
    const data = await response.json();
    console.log('API Status:', data.status);
  } catch (error) {
    console.error('Health check failed:', error);
  }
};
```

---

### 2. Create Session

Create a new chat session for the authenticated user.

**Endpoint:** `POST /sessions`

**Authentication:** Required

**Request Body:**
```json
{
  "title": "My Chat Session",
  "summary": "Optional session summary"
}
```

**Response:**
```json
{
  "session_id": "69c2bd4fd421ab8433fc6a25",
  "title": "My Chat Session",
  "summary": "Optional session summary",
  "user_id": "507f1f77bcf86cd799439011",
  "created_at": "2026-03-24T16:35:27.062000"
}
```

**React Example:**
```javascript
const createSession = async (title, summary = null) => {
  const token = 'YOUR_JWT_TOKEN';
  
  try {
    const response = await fetch('http://34.14.150.136:8000/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title,
        summary: summary
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Session created:', data.session_id);
    return data;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
};

// Usage
const session = await createSession('New Chat', 'Testing the API');
```

---

### 3. Get User Sessions

Retrieve all sessions for the authenticated user.

**Endpoint:** `GET /sessions`

**Authentication:** Required

**Response:**
```json
[
  {
    "session_id": "69c2bd4fd421ab8433fc6a25",
    "title": "My Chat Session",
    "summary": "Optional session summary",
    "updated_at": "2026-03-24T16:35:27.062000",
    "created_at": "2026-03-24T16:35:27.062000"
  }
]
```

**React Example:**
```javascript
const getUserSessions = async () => {
  const token = 'YOUR_JWT_TOKEN';
  
  try {
    const response = await fetch('http://34.14.150.136:8000/sessions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const sessions = await response.json();
    return sessions;
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    throw error;
  }
};
```

---

### 4. Get Session Messages

Retrieve all messages for a specific session in chronological order.

**Endpoint:** `GET /sessions/{session_id}/messages`

**Authentication:** Required

**URL Parameters:**
- `session_id` (required): The session ID to retrieve messages from

**Response:**
```json
[
  {
    "message_id": "69c2bd72b813b1aac9e7002d",
    "session_id": "69c2bd4fd421ab8433fc6a25",
    "role": "user",
    "content": "Hello! What is 5 + 3?",
    "created_at": "2026-03-24T16:36:02.123000"
  },
  {
    "message_id": "69c2bd73b813b1aac9e7002e",
    "session_id": "69c2bd4fd421ab8433fc6a25",
    "role": "assistant",
    "content": "5 + 3 equals 8.",
    "created_at": "2026-03-24T16:36:05.456000"
  }
]
```

**React Example:**
```javascript
const getSessionMessages = async (sessionId, token) => {
  try {
    const response = await fetch(`http://34.14.150.136:8000/sessions/${sessionId}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const messages = await response.json();
    return messages;
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    throw error;
  }
};

// Usage
const messages = await getSessionMessages('69c2bd4fd421ab8433fc6a25', 'YOUR_JWT_TOKEN');
console.log(`Retrieved ${messages.length} messages`);
```

---

### 5. Stream Chat Response

Send a message and receive a streaming response from the LLM.

**Endpoint:** `POST /stream`

**Authentication:** Required

**Request Body:**
```json
{
  "session_id": "69c2bd4fd421ab8433fc6a25",
  "message": "What is 5 + 3?"
}
```

**Fields:**
- `session_id` (required): The session ID to send the message to
- `message` (required): The user message to send

**Response Format:**
Server-Sent Events (SSE) stream with JSON patches:

```
data: {"p": "/messsage/content/0", "o": "append", "v": "Hello"}
data: {"p": "/messsage/content/1", "o": "append", "v": "! I can help you"}
data: [DONE]
```

**React Example with EventSource:**
```javascript
const streamChat = (sessionId, message, onMessage, onComplete, onError) => {
  const token = 'YOUR_JWT_TOKEN';
  
  // Note: EventSource doesn't support custom headers, so we need to use fetch with ReadableStream
  const streamChatWithFetch = async () => {
    try {
      const response = await fetch('http://34.14.150.136:8000/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
              onComplete?.();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              onMessage?.(parsed);
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      onError?.(error);
    }
  };

  streamChatWithFetch();
};

// Usage
streamChat(
  'session-id-here',
  'What is 5 + 3?',
  (chunk) => {
    // Handle each message chunk
    console.log('Received chunk:', chunk.v);
    // Update your UI with the chunk
  },
  () => {
    // Stream completed
    console.log('Stream completed');
  },
  (error) => {
    // Handle error
    console.error('Stream error:', error);
  }
);
```

**React Hook Example:**
```javascript
import { useState, useCallback } from 'react';

const useChatStream = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [error, setError] = useState(null);

  const streamMessage = useCallback(async (sessionId, token) => {
    setIsStreaming(true);
    setStreamedContent('');
    setError(null);

    try {
      const response = await fetch('http://34.14.150.136:8000/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: sessionId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setIsStreaming(false);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.v) {
                setStreamedContent(prev => prev + parsed.v);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setIsStreaming(false);
    }
  }, []);

  return { streamMessage, isStreaming, streamedContent, error };
};

// Component usage
function ChatComponent() {
  const { streamMessage, isStreaming, streamedContent, error } = useChatStream();
  const [sessionId] = useState('your-session-id');
  const token = 'YOUR_JWT_TOKEN';

  const handleSendMessage = () => {
    streamMessage(sessionId, token);
  };

  return (
    <div>
      <button onClick={handleSendMessage} disabled={isStreaming}>
        {isStreaming ? 'Streaming...' : 'Send Message'}
      </button>
      <div>{streamedContent}</div>
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

---

### 6. Non-Streaming Chat (Alternative)

Send a message and receive a complete response (non-streaming).

**Endpoint:** `POST /chat`

**Authentication:** Required

**Request Body:**
```json
{
  "session_id": "69c2bd4fd421ab8433fc6a25",
  "message": "What is 5 + 3?"
}
```

**Response:**
```json
{
  "response": "5 + 3 equals 8.",
  "session_id": "69c2bd4fd421ab8433fc6a25"
}
```

**React Example:**
```javascript
const sendChatMessage = async (sessionId, message) => {
  const token = 'YOUR_JWT_TOKEN';
  
  try {
    const response = await fetch('http://34.14.150.136:8000/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: sessionId,
        message: message
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
};
```

---

## Complete React Integration Example

```javascript
import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://34.14.150.136:8000';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwYXZhbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc3NDM4MTkxOH0.lQ7zhcx9fiOGQdA1I_gRkeu9RbHYjUKiFzkCmbyJo70';

function ChatApp() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [streamedResponse, setStreamedResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Fetch user sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`
        }
      });
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Chat ${new Date().toLocaleString()}`,
          summary: 'New conversation'
        })
      });
      const newSession = await response.json();
      setCurrentSession(newSession);
      setSessions([...sessions, newSession]);
      return newSession;
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const streamChatResponse = async (sessionId) => {
    setIsStreaming(true);
    setStreamedResponse('');

    try {
      const response = await fetch(`${API_BASE_URL}/stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: sessionId })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsStreaming(false);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.v) {
                setStreamedResponse(prev => prev + parsed.v);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      setIsStreaming(false);
    }
  };

  return (
    <div className="chat-app">
      <div className="sidebar">
        <button onClick={createNewSession}>New Chat</button>
        <div className="sessions-list">
          {sessions.map(session => (
            <div 
              key={session.session_id}
              onClick={() => setCurrentSession(session)}
              className={currentSession?.session_id === session.session_id ? 'active' : ''}
            >
              {session.title}
            </div>
          ))}
        </div>
      </div>
      
      <div className="chat-area">
        {currentSession && (
          <>
            <h2>{currentSession.title}</h2>
            <div className="messages">
              <div className="ai-response">
                {streamedResponse}
              </div>
            </div>
            <button 
              onClick={() => streamChatResponse(currentSession.session_id)}
              disabled={isStreaming}
            >
              {isStreaming ? 'Streaming...' : 'Get Response'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ChatApp;
```

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid JWT token)
- `403` - Forbidden (user doesn't own the session)
- `404` - Not Found (session doesn't exist)
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "detail": "Error message describing what went wrong"
}
```

**React Error Handling Example:**
```javascript
const handleApiCall = async () => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error.message);
    // Show error to user
    alert(`Error: ${error.message}`);
  }
};
```

---

## Important Notes

1. **JWT Token**: Store the JWT token securely (e.g., in httpOnly cookies or secure storage). Never expose it in client-side code in production.

2. **CORS**: The API should have CORS enabled for your frontend domain. If you encounter CORS errors, contact the backend team.

3. **Message Flow**: 
   - Create a session first
   - Insert user message into the session (currently requires backend call)
   - Call `/stream` to get AI response
   - The AI response is automatically saved to the session

4. **Session Management**: Each user has their own sessions. Sessions are tied to the user ID from the JWT token.

5. **Database**: 
   - Database: `dev`
   - Collections: `chat_sessions`, `chat_messages`
   - External MongoDB at: `34.14.212.228:27017`

6. **Rate Limiting**: Be mindful of API rate limits. Implement debouncing for user inputs.

---

## Support

For issues or questions, contact the backend team or refer to the main repository documentation.
