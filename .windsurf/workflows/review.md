---
auto_execution_mode: 3
description: Review code changes for bugs, security issues, and improvements
---
You are a senior software engineer performing a thorough code review to identify potential bugs.

## Code Review Checklist

### 1. Unnecessary Caching & Memoization
- Identify cached values that are never reused or have improper invalidation strategies
- Check for stale cache entries in FastAPI dependencies, Redis, or in-memory caches
- Look for redundant memoization (`useMemo`/`useCallback` with unstable or frequently changing dependencies)
- Flag caching of trivial computations where the overhead exceeds the benefit
- Check for missing cache invalidation cascades on MongoDB/ClickHouse data mutations
- Identify cache key collisions or overly broad cache scopes
- Look for missing TTL configurations leading to unbounded cache growth

### 2. Code Duplication & Reusability
- Identify repeated code blocks (>3 lines) that should be extracted into shared utilities
- Look for copy-pasted logic across React components, FastAPI routers, or service layers
- Check for similar API calls that could leverage a common HTTP client abstraction
- Flag hardcoded configuration values that should be centralized in Pydantic Settings or Infisical
- Identify opportunities for reusable Pydantic models, TypeScript interfaces, or custom React hooks
- Look for repeated validation logic that should be consolidated into decorators or middleware
- Check for duplicated error handling patterns that warrant a centralized error boundary

### 3. Error Handling & Resilience
- Check for unhandled promise rejections (missing `.catch()`, try/catch, or error boundaries)
- Identify FastAPI endpoints without proper HTTPException handling or status code mapping
- Look for missing null/undefined/None checks leading to runtime exceptions
- Flag MongoDB/ClickHouse operations that fail silently without structured logging
- Check for missing Pydantic validation on all request bodies and query parameters
- Identify async operations without timeout handling (httpx, motor, aiohttp)
- Look for missing cleanup in error scenarios (partial writes, orphaned resources, connection leaks)
- Check for missing retry logic with exponential backoff for transient failures
- Identify missing circuit breaker patterns for external service dependencies

### 4. Security Vulnerabilities
- Check for NoSQL injection in MongoDB queries (unsanitized user input in `$where`, `$regex`)
- Check for SQL injection in ClickHouse raw queries or string interpolation
- Identify exposed sensitive data (API keys, tokens, PII in frontend bundles, logs, or responses)
- **Enforce Infisical for all secrets management—no `.env` files, hardcoded keys, or `os.getenv()`/`process.env` for secrets**
- Flag any secrets not sourced from Infisical SDK with proper environment separation
- Look for missing input sanitization and validation using Pydantic validators
- Flag insecure direct object references (IDOR) in FastAPI routes without ownership verification
- Check for missing or misconfigured OAuth2/JWT authentication dependencies
- Identify XSS risks in React (`dangerouslySetInnerHTML`, unescaped user content)
- Check for CSRF vulnerabilities in state-changing endpoints
- Look for missing rate limiting on authentication and sensitive endpoints
- Verify proper CORS configuration (no wildcard origins in production)

### 5. Performance & Scalability
- Identify N+1 query problems in MongoDB aggregations and ORM-like patterns
- Check for unoptimized ClickHouse queries (missing indexes, full table scans, unbounded results)
- Look for unnecessary React re-renders (missing memoization, unstable props, context overuse)
- Flag large Vite bundle sizes, missing code splitting, or tree-shaking failures
- Identify memory leaks (event listeners, subscriptions, timers not cleaned up in `useEffect`)
- Check for blocking synchronous operations in FastAPI async endpoints
- Look for missing MongoDB indexes on frequently queried or filtered fields
- Identify unbounded data fetching (missing pagination, no result limits)
- Check for inefficient serialization/deserialization patterns
- Look for connection pool exhaustion risks in database clients

### 6. Type Safety & Contract Enforcement
- Identify `any` types in TypeScript that compromise type safety
- Look for missing Pydantic model definitions for API request/response contracts
- Check for type assertions (`as`, `!`) that bypass TypeScript's type checking
- Flag inconsistent type definitions between frontend and backend (consider shared schemas)
- Identify missing `Optional` annotations and default values in Pydantic models
- Check for runtime type mismatches not caught by static analysis
- Look for missing discriminated unions for polymorphic data structures

### 7. Code Clarity & Maintainability
- Identify overly complex FastAPI dependencies, React hooks, or service methods (cyclomatic complexity > 10)
- Look for misleading, ambiguous, or inconsistent naming conventions
- Check for magic numbers, strings, or implicit business rules without documentation
- Flag deeply nested conditionals, callbacks, or promise chains (>3 levels)
- Identify missing, outdated, or misleading docstrings/JSDoc comments
- Check for violation of single responsibility principle in functions/classes
- Look for tight coupling between layers that should be abstracted
- Identify missing or inconsistent logging for observability

### 8. API Design & Data Handling
- Check for missing loading, error, and empty states in React Query/SWR implementations
- Identify race conditions in concurrent FastAPI requests or React state updates
- Look for missing Pydantic validation on MongoDB document responses (defensive deserialization)
- Flag inconsistent error response schemas between frontend expectations and backend responses
- Check for missing ClickHouse query result validation and type coercion
- Identify missing API versioning strategy for breaking changes
- Look for missing request/response logging for debugging and audit trails
- Check for proper handling of partial failures in batch operations

### 9. Secrets Management
- Verify all API keys, database credentials, tokens, and sensitive configs are fetched from Infisical
- Flag any direct use of `os.getenv()`, `process.env`, or `.env` files for sensitive values
- Check that Infisical SDK is properly initialized with error handling in both backend and frontend
- Ensure secrets are never logged, serialized, or exposed in error messages/stack traces
- Verify proper Infisical environment separation and access controls (dev/staging/prod)
- Check for secrets rotation strategy and handling of expired credentials
- Identify any secrets committed to version control (even in history)

### 10. Testing & Quality Assurance
- Identify critical paths lacking unit test coverage
- Check for missing integration tests on API endpoints and database operations
- Look for flaky tests due to timing issues, shared state, or external dependencies
- Flag missing edge case coverage (boundary conditions, error paths, empty states)
- Check for proper test isolation and cleanup between test runs
- Identify missing mocks for external services in unit tests