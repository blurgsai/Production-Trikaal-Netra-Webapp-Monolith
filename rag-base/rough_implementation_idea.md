# Implementation Plan: Dynamic MCP Resource Refresh After Global Document Upload

## Goal

When a user uploads a new **Global Document**, the MCP client should automatically become aware of the new document metadata (name, description, URI, etc.) without restarting either the API service or the MCP server.

The objective is **not** to refresh embeddings or ChromaDB. Those are already updated during ingestion.

The objective is to refresh the **resource context** that the LLM receives from the MCP server so that it can decide whether the newly uploaded document is relevant enough to use.

---

# Desired Flow

```
POST /add-global-documents
        │
        ▼
Save document metadata
        │
        ▼
Upload / ingest document
        │
        ▼
Chunk document
        │
        ▼
Generate embeddings
        │
        ▼
Store vectors
        │
        ▼
Update MongoDB
        │
        ▼
Ingestion succeeds
        │
        ▼
POST MCP Server
/notify/resources_updated
        │
        ▼
MCP Server sends MCP resource update notification
        │
        ▼
MCP Client receives notification
        │
        ▼
Invalidate cached resources context
        │
        ▼
Next user prompt
        │
        ▼
Client re-fetches resources from MCP Server
        │
        ▼
Updated resource descriptions are included in the LLM context
```

---

# Step 1

Modify only the `/add-global-documents` endpoint.

Do **not** trigger notifications from `/add-session-documents`.

This feature is only for Global Documents because they are exposed as MCP resources.

---

# Step 2

Only after ALL of the following succeed:

* metadata saved
* document uploaded
* ingestion completed
* embeddings generated
* MongoDB updated

trigger a POST request to the MCP server.

Example endpoint:

```
POST /notify/resources_updated
```

This endpoint is an internal application endpoint.

It is **not** part of the MCP protocol.

Its only responsibility is telling the MCP server:

> "Global resources have changed."

---

# Step 3

Inside the MCP server, implement `/notify/resources_updated`.

Responsibilities:

* Receive the POST request.
* Notify the connected MCP client that the global resources have changed.
* Do not perform ingestion.
* Do not query MongoDB.
* Do not rebuild resources.

It should only act as a trigger.

---

# Step 4

On the MCP client side

When the notification is received:

* Do not immediately reload resources.
* Simply invalidate the cached resource context.

For example:

```
resources_context_stale = True
```

or an equivalent mechanism.

---

# Step 5

Inside `LLMClientWithMCP.run_conversation()`

Before constructing the system prompt:

```
if resources_context_stale:
    refresh_resources_context()
    resources_context_stale = False
```

Refreshing should re-fetch the current MCP resources exactly as performed during startup.

The client should then rebuild its cached resources context.

---

# Expected Behaviour

Current state:

```
Global Resources

- HR Policies
- Finance Reports
```

User uploads

```
Engineering Guidelines.pdf

Description:
Company coding standards and CI/CD practices.
```

Upload succeeds.

Notification is sent.

No restart occurs.

On the next chat request the client refreshes resources.

The LLM now receives:

```
Global Resources

- HR Policies
- Finance Reports
- Engineering Guidelines

Description:
Company coding standards and CI/CD practices.
```

The LLM can now decide whether to invoke the text-search MCP tool for this newly available source.

---

# Please Determine

Based on the current codebase, identify the exact implementation points for:

1. The POST trigger inside `/add-global-documents`.
2. The implementation of `/notify/resources_updated` inside the MCP server.
3. The correct SDK method for notifying the connected MCP client.
4. The client-side notification handler.
5. The cache invalidation logic.
6. The refresh logic inside `LLMClientWithMCP.run_conversation()`.

Do not redesign the architecture. Use this architecture and produce an implementation plan with the exact files, classes, and methods that need to be modified.
