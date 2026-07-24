# Unit Test Gap Analysis — Real-World Scenarios

---

## `test_features_notifications.py`

- **`fetch_notifications_for_client` client fn** — zero tests at the client layer (pagination, unread filter at DB level)
- **`send_notification` — both WS + email channels** — no combined-delivery test; only one channel at a time tested
- **`send_notification` → group_id target** — `_resolve_client_ids` covers groups but `send_notification` itself is never tested with a `group_id`
- **Email with zero valid email addresses** — all users have `email=None`; expect `email` not in `channels_delivered`
- **Email with partial email addresses** — only subset of clients have email; only those should receive
- **`send_notification` with `source_system`** — not asserted in template_vars or result
- **`mark_notification_read` idempotent** — marking already-read notification should not duplicate in `read_by`
- **`mark_all_read` returns 0** — client has no unread notifications
- **`_resolve_notif_db` with real topic storage config** — topic has non-None `storage_uri`/`storage_db`; verifies custom DB is returned
- **`update_notification_delivery` with empty channel lists** — `channels_attempted=[]`, `channels_delivered=[]`
- **Empty group notification** — group exists but `client_ids=[]`; notification stored but delivered to nobody

---

## `test_features_groups.py`

- **`fetch_all_groups` client fn** — no tests at the client layer (returns list, empty collection)
- **`upsert_group` metadata update** — verifies metadata is overwritten on second upsert
- **`upsert_group_service` with empty `client_ids`** — create group with no initial members
- **`list_groups` on empty collection** — returns `[]`
- **Large group membership** — adding 100+ client_ids; assert all stored
- **Notification to group after deletion** — `NotFoundError` propagated from `_resolve_client_ids`

---

## `test_features_topics.py`

- **`fetch_all_topic_configs` client fn** — zero tests at the client layer
- **`update_topic_config` client fn** — zero tests at the client layer
- **`TopicConfigDocument` with custom storage** — `storage_uri`/`storage_db` set; non-default values accessible
- **`create_topic_config` with both channels** — ws + email together
- **Topic email channel with no SMTP config** — partial SMTP → expect `ValidationError` or graceful skip
- **`update_topic_config_service` removes a channel** — e.g., removing `email` from `channels`
- **`list_topic_configs` on empty collection** — returns `[]`

---

## `test_features_users.py`

- **`fetch_all_users` on empty collection** — returns `[]`, no crash
- **`user_exists` for inactive user** — `is_active=False` but doc exists → should return `True`
- **`fetch_user` with `email=None`** — used in email resolution path; must handle gracefully
- **`get_user` for inactive user** — read-only API returns user regardless of active status
- **`count_users` when collection is empty** — returns `0`
- **`list_users` on empty collection** — returns `[]`

---

## `test_features_admin.py`

- **`get_known_clients` when users collection is empty** — returns `[]`, no crash
- **`get_known_clients` user with no notifications** — enrichment fills zeroes correctly
- **`get_known_clients` user is inactive** — `is_active=False` user still appears in list
- **`get_dashboard_stats` prefers `users.count` over notification aggregate** — verifies the `or` fallback logic
- **`get_all_groups_with_stats` on empty groups** — returns `[]`
- **`get_group_detail` with non-empty metadata** — metadata dict returned as-is

---

## `test_features_auth_router.py`

- **Login with empty credentials** — blank username/password → 401
- **`next` param with valid relative path** — e.g., `/admin/dashboard` → redirects there
- **POST login without form body** — missing fields → 422 or 401
- **Session cookie expired** — already-expired token on login page → no redirect, renders form

---

## `test_shared_auth.py`

- **`change_password` for non-existent user** — should raise or silently no-op (document expected behaviour)
- **`delete_admin_user` for non-existent user** — document expected behaviour
- **`set_user_active` for non-existent user** — document expected behaviour
- **`init_db` called twice** — idempotent; no duplicate-table error

---

## `test_shared_redis.py`

- **`publish_ws_event` with empty `client_ids`** — `[]` published; shape still valid
- **`run_ws_subscriber` malformed JSON** — non-JSON `data` field → must not crash, log and skip
- **`run_ws_subscriber` non-message type** — e.g., subscribe-confirmation message ignored cleanly
- **Redis publish failure** — connection error on `publish` → exception handled, not raised to caller

---

## `test_shared_websocket.py`

- **`disconnect` socket that was never connected** — graceful no-op
- **`send_to_client` one-of-two sockets is dead** — dead socket removed, live one delivers; returns `True`
- **`broadcast_to_clients` with empty client list** — returns `{}`
- **`broadcast_to_clients` client has no connections** — result `{"client-1": False}`
- **`disconnect` last socket removes client key** — `_connections` dict does not retain empty lists

---

## `test_shared_dependencies.py`

- **`get_db` returns correct DB name** — verify `client[db_name]` is called with the configured DB
- **`require_api_key` — multiple valid keys, one matches** — only exact match accepted
- **API key with leading/trailing whitespace** — should not match (or document if stripped)
