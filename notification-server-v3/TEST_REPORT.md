# Notification Server v3 - Test Report

**Date:** 2026-06-16  
**Environment:** Python 3.13.5, pytest 9.0.2, FastAPI 0.111.0, Starlette 0.37.2  
**Test Framework:** pytest with pytest-asyncio  

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | 159 |
| **Passed** | 159 (100%) |
| **Failed** | 0 |
| **Errors** | 0 |
| **Skipped** | 0 |
| **Duration** | ~7 seconds |

---

## Test Suite Breakdown

### End-to-End Tests (`tests/e2e/test_api.py`) — 18 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestHealth` | `test_health_endpoint` | PASS |
| `TestTopicsFlow` | `test_create_list_get_update_delete` | PASS |
| | `test_create_duplicate_returns_409` | PASS |
| | `test_update_missing_returns_404` | PASS |
| | `test_delete_missing_returns_404` | PASS |
| | `test_invalid_topic_name` | PASS |
| `TestGroupsFlow` | `test_upsert_list_get_add_remove_delete` | PASS |
| | `test_get_missing_returns_404` | PASS |
| | `test_add_members_missing_returns_404` | PASS |
| `TestNotificationsFlow` | `test_send_list_read_readall` | PASS |
| | `test_send_with_group` | PASS |
| | `test_send_missing_topic_returns_404` | PASS |
| | `test_send_no_target_returns_422` | PASS |
| | `test_mark_read_missing_returns_404` | PASS |
| | `test_unauthorized_without_api_key` | PASS |
| `TestAuthFlow` | `test_login_page` | PASS |
| | `test_logout` | PASS |
| `TestWebSocketEndpoint` | `test_websocket_connect` | PASS |

### Unit Tests — 141 tests

#### Features / Admin (`tests/unit/test_features_admin.py`) — 6 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestGetKnownClients` | `test_aggregates` | PASS |
| `TestGetAllGroupsWithStats` | `test_returns_groups` | PASS |
| `TestGetGroupDetail` | `test_returns_group` | PASS |
| | `test_returns_none_when_not_found` | PASS |
| `TestGetDashboardStats` | `test_returns_counts` | PASS |
| | `test_zero_clients_when_no_data` | PASS |

#### Features / Auth Router (`tests/unit/test_features_auth_router.py`) — 6 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestLoginPage` | `test_redirects_when_already_logged_in` | PASS |
| | `test_get_login_renders` | PASS |
| `TestLoginSubmit` | `test_valid_login_redirects` | PASS |
| | `test_invalid_login_returns_401` | PASS |
| | `test_safe_next_redirect` | PASS |
| `TestLogout` | `test_clears_cookie_and_redirects` | PASS |

#### Features / Groups (`tests/unit/test_features_groups.py`) — 18 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestGroupDocument` | `test_from_full_doc` | PASS |
| | `test_defaults` | PASS |
| `TestMapGroup` | `test_maps_correctly` | PASS |
| `TestFetchGroup` | `test_returns_document_when_found` | PASS |
| | `test_returns_none_when_not_found` | PASS |
| `TestUpsertGroup` | `test_upserts_and_returns` | PASS |
| `TestAddMembersToGroup` | `test_adds_and_returns` | PASS |
| `TestRemoveMembersFromGroup` | `test_removes_and_returns` | PASS |
| `TestDeleteGroup` | `test_returns_true_when_deleted` | PASS |
| | `test_returns_false_when_not_found` | PASS |
| `TestUpsertGroupService` | `test_creates_new` | PASS |
| | `test_updates_existing` | PASS |
| `TestGetGroup` | `test_raises_not_found` | PASS |
| | `test_returns_group` | PASS |
| `TestListGroups` | `test_returns_list` | PASS |
| `TestAddMembers` | `test_raises_not_found` | PASS |
| | `test_adds_members` | PASS |
| `TestRemoveMembers` | `test_raises_not_found` | PASS |
| | `test_removes_members` | PASS |
| `TestDeleteGroupService` | `test_raises_not_found` | PASS |
| | `test_deletes` | PASS |

#### Features / Notifications (`tests/unit/test_features_notifications.py`) — 23 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestNotificationDocument` | `test_from_full_doc` | PASS |
| | `test_defaults` | PASS |
| `TestMapNotification` | `test_maps_correctly` | PASS |
| `TestFetchNotificationById` | `test_returns_document_when_found` | PASS |
| | `test_returns_none_for_invalid_id` | PASS |
| `TestInsertNotification` | `test_inserts_and_returns` | PASS |
| `TestMarkNotificationRead` | `test_marks_and_returns` | PASS |
| | `test_returns_none_for_invalid_id` | PASS |
| `TestMarkAllReadForClient` | `test_returns_modified_count` | PASS |
| `TestUpdateNotificationDelivery` | `test_updates` | PASS |
| | `test_silently_returns_for_invalid_id` | PASS |
| `TestResolveClientIds` | `test_returns_client_ids_when_provided` | PASS |
| | `test_resolves_from_group` | PASS |
| | `test_raises_when_group_not_found` | PASS |
| | `test_raises_when_neither_provided` | PASS |
| `TestResolveNotifDb` | `test_fallback_when_no_topic` | PASS |
| | `test_fallback_when_topic_not_found` | PASS |
| `TestSendNotification` | `test_raises_when_topic_not_found` | PASS |
| | `test_sends_via_websocket_only` | PASS |
| | `test_sends_via_email_only` | PASS |
| `TestGetNotificationsForClient` | `test_returns_mapped_notifications` | PASS |
| `TestMarkRead` | `test_raises_when_not_found` | PASS |
| | `test_returns_mapped` | PASS |
| `TestMarkAllRead` | `test_returns_count` | PASS |

#### Features / Topics (`tests/unit/test_features_topics.py`) — 15 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestTopicConfigDocument` | `test_from_full_doc` | PASS |
| | `test_defaults` | PASS |
| `TestMapTopicConfig` | `test_maps_correctly` | PASS |
| `TestFetchTopicConfig` | `test_returns_document_when_found` | PASS |
| | `test_returns_none_when_not_found` | PASS |
| `TestInsertTopicConfig` | `test_inserts_and_returns` | PASS |
| `TestDeleteTopicConfig` | `test_returns_true_when_deleted` | PASS |
| | `test_returns_false_when_not_found` | PASS |
| `TestGetTopicConfig` | `test_raises_not_found` | PASS |
| | `test_returns_mapped_doc` | PASS |
| `TestListTopicConfigs` | `test_returns_list` | PASS |
| `TestCreateTopicConfig` | `test_raises_conflict_when_exists` | PASS |
| | `test_creates_new` | PASS |
| `TestUpdateTopicConfigService` | `test_raises_not_found` | PASS |
| | `test_updates_fields` | PASS |
| `TestDeleteTopicConfigService` | `test_raises_not_found` | PASS |
| | `test_deletes_successfully` | PASS |

#### Shared / Auth (`tests/unit/test_shared_auth.py`) — 12 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestInitDb` | `test_creates_table` | PASS |
| `TestCreateAdminUser` | `test_creates_user` | PASS |
| | `test_duplicate_username_raises` | PASS |
| `TestAuthenticate` | `test_valid_credentials` | PASS |
| | `test_invalid_password` | PASS |
| | `test_unknown_user` | PASS |
| | `test_inactive_user` | PASS |
| `TestListAdminUsers` | `test_lists_users` | PASS |
| `TestSetUserActive` | `test_deactivates_and_reactivates` | PASS |
| `TestChangePassword` | `test_changes_password` | PASS |
| `TestDeleteAdminUser` | `test_deletes_user` | PASS |
| `TestSessionToken` | `test_encode_decode_roundtrip` | PASS |
| | `test_decode_invalid_token_returns_none` | PASS |
| | `test_decode_tampered_token_returns_none` | PASS |
| | `test_decode_expired_token_returns_none` | PASS |

#### Shared / Config (`tests/unit/test_shared_config.py`) — 5 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestSettings` | `test_default_values` | PASS |
| | `test_api_keys_parsing` | PASS |
| | `test_empty_api_keys_means_open` | PASS |
| | `test_lru_cache_returns_same_instance` | PASS |
| `TestSettingsEnvFile` | `test_reads_from_dotenv` | PASS |

#### Shared / DB (`tests/unit/test_shared_db.py`) — 6 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestMaskUri` | `test_masks_password` | PASS |
| | `test_no_password_unchanged` | PASS |
| | `test_invalid_uri_returns_original` | PASS |
| `TestGetClientForUri` | `test_registers_new_client` | PASS |
| | `test_returns_cached_client` | PASS |
| `TestGetDbForTopic` | `test_fallback_to_global_defaults` | PASS |
| | `test_custom_storage_requires_all_fields` | PASS |
| | `test_custom_storage_when_all_set` | PASS |
| `TestCloseAll` | `test_closes_all_clients` | PASS |

#### Shared / Dependencies (`tests/unit/test_shared_dependencies.py`) — 6 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestRequireApiKey` | `test_returns_open_when_no_api_keys_configured` | PASS |
| | `test_returns_key_when_valid` | PASS |
| | `test_raises_when_invalid` | PASS |
| `TestApiKeyGuard` | `test_returns_key_when_valid` | PASS |
| | `test_raises_when_invalid` | PASS |
| `TestGetMongoClient` | `test_creates_client_once` | PASS |

#### Shared / Email (`tests/unit/test_shared_email.py`) — 11 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestRenderTemplate` | `test_simple_substitution` | PASS |
| | `test_missing_variable_keeps_placeholder` | PASS |
| | `test_no_variables` | PASS |
| `TestSmtpConfig` | `test_resolve_uses_global_defaults_when_all_none` | PASS |
| | `test_resolve_returns_self_when_all_set` | PASS |
| | `test_resolve_raises_on_partial_config` | PASS |
| `TestSendEmail` | `test_skips_when_no_smtp_user` | PASS |
| | `test_skips_when_no_recipients` | PASS |
| | `test_sends_email_successfully` | PASS |
| | `test_returns_empty_on_smtp_error` | PASS |
| `TestSendTopicEmail` | `test_returns_empty_when_no_template` | PASS |
| | `test_returns_empty_when_no_recipients` | PASS |
| | `test_renders_and_sends` | PASS |

#### Shared / Errors (`tests/unit/test_shared_errors.py`) — 7 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestNotFoundError` | `test_status_code_and_detail_string` | PASS |
| | `test_status_code_and_detail_int` | PASS |
| `TestConflictError` | `test_status_code_and_detail` | PASS |
| `TestValidationError` | `test_status_code_and_detail` | PASS |
| `TestExternalServiceError` | `test_status_code_and_detail` | PASS |
| `TestUnauthorizedError` | `test_default_detail` | PASS |
| | `test_custom_detail` | PASS |

#### Shared / Redis (`tests/unit/test_shared_redis.py`) — 4 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestPublishWsEvent` | `test_publishes_json_message` | PASS |
| `TestRunWsSubscriber` | `test_subscribes_and_dispatches` | PASS |
| `TestCloseRedis` | `test_closes_and_clears` | PASS |
| | `test_noop_when_no_client` | PASS |

#### Shared / WebSocket (`tests/unit/test_shared_websocket.py`) — 7 tests

| Test Class | Tests | Status |
|------------|-------|--------|
| `TestWebSocketManager` | `test_connect_accepts_and_stores` | PASS |
| | `test_disconnect_removes_socket` | PASS |
| | `test_multiple_connections_per_client` | PASS |
| | `test_send_to_client_delivers` | PASS |
| | `test_send_to_client_returns_false_when_not_connected` | PASS |
| | `test_send_to_client_removes_dead_sockets` | PASS |
| | `test_broadcast_to_clients` | PASS |
| | `test_connected_client_ids` | PASS |

---

## Warnings

| Warning | Source | Notes |
|---------|--------|-------|
| `PendingDeprecationWarning: Please use import python_multipart instead` | `starlette/formparsers.py:12` | External dependency warning. Starlette internally imports `multipart` which will be deprecated in favor of `python_multipart`. Will be resolved when Starlette updates. Does not affect functionality. |

---

## Environment Configuration

Test environment variables set via `tests/conftest.py`:

| Variable | Test Value |
|----------|-----------|
| `APP_NAME` | `Notification Server Test` |
| `APP_VERSION` | `3.0.0-test` |
| `MONGODB_URI` | `mongodb://localhost:27017` |
| `MONGODB_DB` | `notification_server_test` |
| `API_KEYS` | `["test-api-key"]` |
| `SECRET_KEY` | `test-secret-32chars-long!!` |
| `SQLITE_PATH` | `test_admin.db` |
| `REDIS_URL` | *(empty — disabled)* |
| `SMTP_USER` | *(empty — disabled)* |

---

## How to Run

```bash
# All tests
python -m pytest tests/ -v

# Unit tests only
python -m pytest tests/unit/ -v

# E2E tests only
python -m pytest tests/e2e/ -v

# With coverage (requires pytest-cov)
python -m pytest tests/ -v --cov=src --cov-report=term-missing
```

---

*Report generated automatically from pytest output.*
