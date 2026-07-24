# FastAPI Architecture: Layered Design with Anti-Corruption Layer

## Layer 1 – Client & Raw Schemas (features/users/clients/)
Job: Fetch data from external sources and define schemas that match their response shape exactly.

```python
# clients/__init__.py
from pydantic import BaseModel

class AddressApiSchema(BaseModel):
    street: str
    suite: str
    city: str
    zipcode: str
    geo: GeoApiSchema

class GeoApiSchema(BaseModel):
    lat: str
    lng: str

class CompanyApiSchema(BaseModel):
    name: str
    catchPhrase: str
    bs: str

class UserApiSchema(BaseModel):
    id: int
    name: str  # backend calls it "name"
    username: str
    email: str
    address: AddressApiSchema  # deeply nested
    company: CompanyApiSchema

async def fetch_users(
    client: httpx.AsyncClient, base_url: str
) -> list[UserApiSchema]:
    response = await client.get(f"{base_url}/users")
    response.raise_for_status()
    return [UserApiSchema.model_validate(u) for u in response.json()]
```

**Rules:**
- Schemas here match the external response exactly – field names, nesting, types
- Never use these schemas as response models in routers
- If the external schema changes, this file changes

## Layer 2 – Model & Mapper (features/users/models/)
Job: Define YOUR stable domain models and translate raw data into them. This is the anti-corruption layer.

```python
# models/__init__.py -- YOUR types, YOUR naming, YOUR shape

class User(BaseModel):
    id: int
    display_name: str  # you chose this name
    username: str
    email: str
    phone: str
    website: str
    location: str  # flat string, not nested object
    company: str  # just the name, not the whole object
    coordinates: Coordinates  # parsed to floats

# --- Mapper (the ONLY function that touches both worlds) ---
def map_user_from_api(raw: UserApiSchema) -> User:
    return User(
        id=raw.id,
        display_name=raw.name,  # rename
        username=raw.username,
        email=raw.email,
        phone=raw.phone,
        website=raw.website,
        location=f"{raw.address.city}, {raw.address.street}",  # flatten
        company=raw.company.name,  # simplify
        coordinates=Coordinates(
            lat=float(raw.address.geo.lat),  # type convert
            lng=float(raw.address.geo.lng),
        ),
    )
```

**Rules:**
- Domain models are designed for YOUR API consumers, not the external service's shape
- The mapper is the only place that imports both raw schemas and domain models
- When an external schema changes, update the mapper – nothing else needs to change

## Layer 3 – Service (features/users/services/)
Job: Business logic and orchestration. Calls clients, maps via the anti-corruption layer, handles errors.

```python
# services/__init__.py
async def get_all_users(client: httpx.AsyncClient) -> list[User]:
    settings = get_settings()
    try:
        raw = await fetch_users(client, settings.base_url)  # Layer 1
    except httpx.HTTPError as e:
        raise ExternalServiceError("JSONPlaceholder", str(e))
    return map_users_from_api(raw)  # Layer 2

async def get_user_by_id(
    client: httpx.AsyncClient, user_id: int
) -> User:
    settings = get_settings()
    try:
        raw = await fetch_user_by_id(client, settings.base_url, user_id)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise NotFoundError("User", user_id)
        raise ExternalServiceError("JSONPlaceholder", str(e))
    return map_user_from_api(raw)
```

**Rules:**
- Services return domain models, never raw schemas
- Error handling and business rules live here
- Services are independent of FastAPI (no Request/Response objects)

## Layer 4 – Router (features/users/router/)
Job: Define HTTP endpoints. Has zero knowledge of external schemas.

```python
# router/__init__.py
router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=list[User])
async def list_users(
    client: httpx.AsyncClient = Depends(get_http_client),
):
    return await get_all_users(client)

@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    client: httpx.AsyncClient = Depends(get_http_client),
):
    return await get_user_by_id(client, user_id)
```

**Rules:**
- Routers only import domain models for response_model
- They delegate all logic to the service layer
- They use FastAPI's dependency injection for shared resources (HTTP client, DB sessions)

## The Anti-Corruption Layer in Action

### Example: External API renames company.name -> company.title

**Without this pattern:**
- clients/ - Update schema
- services/ - Update references
- router/ - Update response model
- Tests - Update everywhere
- **Total: 5-10 files**

**With this pattern:**
- clients/ - Update schema
- models/ mapper - One line: raw.company.name -> raw.company.title
- **Total: 2 files**

The mapper absorbs the difference. The domain model User still has company: str. Services, routers, tests – nothing downstream changes.

### Example: Switching from external API to database
You replace clients/__init__.py with a new implementation that queries a database instead of calling an HTTP API. The raw schema changes from UserApiSchema to your ORM model. You update the mapper to translate the ORM model into the same User domain model. Services and routers don't change at all.

## Dependency Rules

| From | Can import from |
|------|------------------|
| router/ | services/, models/ (domain models), shared/ |
| services/ | clients/, models/, shared/ |
| models/ (mapper) | clients/ (raw schemas), shared/ |
| clients/ | shared/ only |
| Any feature | shared/ only (Never another feature's internals) |

## Shared Layer
The shared/ directory contains cross-cutting concerns:

```python
# shared/config/__init__.py -- App settings
class Settings(BaseModel):
    app_name: str = "My App"
    database_url: str = "postgresql://..."
    external_api_base_url: str = "https://..."

# shared/dependencies/__init__.py -- FastAPI DI
async def get_http_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        yield client

async def get_db() -> AsyncGenerator[Session, None]:
    async with async_session() as session:
        yield session

# shared/errors/__init__.py -- Reusable exceptions
class ExternalServiceError(HTTPException):
    def __init__(self, service: str, detail: str):
        super().__init__(status_code=502, detail=f"'{service}' error: {detail}")

class NotFoundError(HTTPException):
    def __init__(self, resource: str, resource_id: int | str):
        super().__init__(status_code=404, detail=f"{resource} '{resource_id}' not found")
```

## Adding a New Feature (Checklist)
When adding a new feature (e.g., products):

1. Create the folder structure:
   ```
   src/features/products/
   __init__.py
   clients/__init__.py
   models/__init__.py
   services/__init__.py
   router/__init__.py
   ```

2. Define raw schemas in clients/ – match the external source exactly
3. Define domain models in models/ – design for your API consumers
4. Write the mapper in models/ – translate raw -> domain
5. Write client functions in clients/ – fetch/query raw data
6. Write services in services/ – business logic, error handling, returns domain models
7. Write router in router/ – HTTP endpoints using response_model=DomainModel
8. Register the router in main.py:
   ```python
   from .features.products.router import router as products_router
   app.include_router(products_router, prefix="/api")
   ```

## Quick Reference – Where Does Each Change Go?

| What changed? | Files to touch |
|---------------|---------------|
| External API renamed a field | clients/ + models/ mapper |
| External API restructured an object | clients/ + models/ mapper |
| New external endpoint/table | New clients/ function + mapper + service + router |
| New business rule / validation | services/ only |
| New query parameter on endpoint | router/ only |
| Change response shape for consumers | models/ domain model + router/ |
| Switch from API to database | clients/ + models/ mapper |
| New shared dependency (cache, auth) | shared/dependencies/ |

## Comparison: React vs FastAPI Layers

| Concern | React Layer | FastAPI Layer |
|---------|-------------|---------------|
| External data fetching | api/ | clients/ |
| Schema translation | model/mappers.ts | models/ mapper functions |
| Domain types | model/types.ts | models/ Pydantic BaseModel |
| Data orchestration | hooks/ (TanStack Query) | services/ |
| Presentation / Endpoints | ui/ (React components) | router/ (FastAPI endpoints) |
| Feature boundary | index.ts (barrel export) | Python package __init__.py |
| Cross-cutting concerns | shared/ | shared/ |

The same architectural principles apply to both frontend and backend. Changes stay local. Features are self-contained. Layers have one job.

## Tech Stack (Reference Implementation)

| Tool | Purpose |
|------|---------|
| FastAPI | Web framework |
| Pydantic v2 | Data validation and domain models |
| httpx | Async HTTP client for external APIs |
| uvicorn | ASGI server |

## APIs Used (No Keys Required)
- JSONPlaceholder (https://jsonplaceholder.typicode.com/) – Users, Posts, Comments
- Open-Meteo (https://open-meteo.com/) – Weather forecast

Reference implementation available in the fastapi-architecture-demo repository.
