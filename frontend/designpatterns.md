# React Frontend Architecture Guide

**Separation of Concerns & Schema Isolation**

---

## Project Structure

```text
src/
├── app
│   ├── Layout.tsx
│   ├── pages
│   │   ├── HomePage.tsx
│   │   ├── PostsPage.tsx
│   │   ├── UsersPage.tsx
│   │   └── WeatherPage.tsx
│   ├── providers.tsx
│   └── router.tsx
├── features
│   ├── posts
│   │   ├── api
│   │   │   ├── postsApi.ts
│   │   │   └── types.ts
│   │   ├── hooks
│   │   │   └── usePosts.ts
│   │   ├── index.ts
│   │   ├── model
│   │   │   ├── mappers.ts
│   │   │   └── types.ts
│   │   └── ui
│   │       ├── PostCard.tsx
│   │       ├── PostDetail.tsx
│   │       └── PostList.tsx
│   ├── users
│   │   ├── api
│   │   │   ├── types.ts
│   │   │   └── usersApi.ts
│   │   ├── hooks
│   │   │   └── useUsers.ts
│   │   ├── index.ts
│   │   ├── model
│   │   │   ├── mappers.ts
│   │   │   └── types.ts
│   │   └── ui
│   │       ├── UserCard.tsx
│   │       ├── UserDetail.tsx
│   │       └── UserList.tsx
│   └── weather
│       ├── api
│       │   ├── types.ts
│       │   └── weatherApi.ts
│       ├── hooks
│       │   └── useWeather.ts
│       ├── index.ts
│       ├── model
│       │   ├── mappers.ts
│       │   └── types.ts
│       └── ui
│           ├── CurrentWeatherCard.tsx
│           └── ForecastList.tsx
├── main.tsx
└── shared
    ├── styles
    │   └── global.css
    ├── types
    ├── ui
    │   ├── Card.tsx
    │   ├── ErrorMessage.tsx
    │   ├── LoadingSpinner.tsx
    │   └── index.ts
    └── utils
```

**23 directories, 39 files**

---

## 1. The Problem

In typical React codebases:

- Raw API response types leak directly into UI components
- When a backend schema changes (field renamed, object restructured, type changed), you end up modifying **5–10+ files** across the repo
- Features become tangled — changing one can break another
- There’s no enforcement of boundaries, so architecture erodes over time

**Goal:** Structure code so that any single type of change (API schema, UI design, business logic) stays **local** — touching only the files responsible for that concern.

---

## 2. Architecture Overview

We use **feature-sliced architecture** with an **anti-corruption layer**.

---

## 3. Folder Structure

```
src/
├── features/
│   ├── users/
│   │   ├── api/       ← Raw API types + fetch functions
│   │   ├── model/     ← Domain types + mappers (anti-corruption layer)
│   │   ├── hooks/     ← Data-fetching hooks (TanStack Query)
│   │   ├── ui/        ← Presentational components
│   │   └── index.ts   ← Public API (barrel export)
│   ├── posts/
│   │   ├── api/
│   │   ├── model/
│   │   ├── hooks/
│   │   ├── ui/
│   │   └── index.ts
│   └── ...
├── shared/            ← Reusable UI components, utils, types
└── app/               ← Routes, providers, layout, page-level components
```

### Key Principles

1. **Code is organized by feature**, not by technical role (no top-level `/components`, `/hooks`, `/utils` folders)
2. **Each feature is self-contained** — it owns its API calls, domain logic, and UI
3. **UI components never see raw API types** — they only know about domain models
4. **Barrel exports enforce feature boundaries** — external code imports from `features/x/index.ts`, never from internal paths
5. **ESLint rules prevent boundary violations** at lint time

---

## 4. The Four Layers

Each feature has four layers. Each layer has **one job** and only talks to the layer next to it:

| Layer     | Responsibility                  |
|-----------|---------------------------------|
| **Layer 1: API**   | "Talk to the backend"          |
| **Layer 2: Model** | "Translate backend language → our language" (Anti-corruption layer) |
| **Layer 3: Hooks** | "Fetch + cache data"           |
| **Layer 4: UI**    | "Render things on screen"      |

**Data flows in one direction:**

```
API → Model (mapper) → Hook → UI Component
```

### Who Knows What

| Layer          | Knows about API schema? | Knows about domain model? | Knows about React/UI?     |
|----------------|-------------------------|---------------------------|---------------------------|
| `api/`         | Yes                     | No                        | No                        |
| `model/` (mapper) | Yes                  | Yes                       | No                        |
| `hooks/`       | No (calls mapper)       | Yes                       | Minimal (`useQuery`)      |
| `ui/`          | No                      | Yes                       | Yes                       |

Each layer has **one reason to change**. That is the separation of concerns.

---

## 5. Layer-by-Layer Walkthrough

### Layer 1 — API (`features/users/api/`)

**Job:** Define the raw backend types and fetch data. Knows nothing about UI.

```ts
// api/types.ts — mirrors the backend JSON schema exactly
interface UserApiResponse {
  id: number;
  name: string;
  address: {
    city: string;
    street: string;
    geo: { lat: string; lng: string }; // strings from the API
  };
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
}

// api/usersApi.ts — fetch functions
async function fetchUsers(): Promise<UserApiResponse[]> {
  const response = await fetch('https://api.example.com/users');
  if (!response.ok) throw new Error(`Failed: ${response.status}`);
  return response.json();
}
```

**Rules:**
- Types here match the backend response **exactly** — field names, nesting, types
- **Never** import these types in UI components
- If the backend adds/removes/renames a field, **this file changes**

---

### Layer 2 — Model & Mappers (`features/users/model/`)

**Job:** Define **YOUR** stable domain types and translate raw API data into them. This is the **anti-corruption layer** — the wall between “their world” and “your world.”

```ts
// model/types.ts — YOUR types, YOUR naming, YOUR shape
interface User {
  id: number;
  displayName: string;      // you chose this name
  location: string;         // flat string, not nested object
  company: string;          // just the name, not the whole object
  coordinates: {
    lat: number;            // numbers, not strings
    lng: number;
  };
}

// model/mappers.ts — the TRANSLATOR (only file that touches both worlds)
function mapUserFromApi(raw: UserApiResponse): User {
  return {
    id: raw.id,
    displayName: raw.name,                           // rename
    location: `${raw.address.city}, ${raw.address.street}`, // flatten
    company: raw.company.name,                       // simplify
    coordinates: {
      lat: parseFloat(raw.address.geo.lat),          // type convert
      lng: parseFloat(raw.address.geo.lng),
    },
  };
}
```

**Rules:**
- Domain types are designed for **YOUR UI needs**, not the backend’s shape
- The mapper is the **only file** that imports both raw API types and domain types
- When a schema changes, **update the mapper** — nothing else needs to change

---

### Layer 3 — Hooks (`features/users/hooks/`)

**Job:** Wire together fetching + mapping + caching. Returns domain types.

```ts
// hooks/useUsers.ts
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../api/usersApi';
import { mapUserFromApi } from '../model/mappers';
import type { User } from '../model/types';

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const raw = await fetchUsers();           // Layer 1
      return raw.map(mapUserFromApi);           // Layer 2 (map array)
    },
  });
}
```

**Rules:**
- Hooks call the API layer and pass results through the mapper
- They return **domain types** (`User[]`), **never** raw API types
- Caching, refetching, and error handling live here

---

### Layer 4 — UI (`features/users/ui/`)

**Job:** Render things on screen. Has **zero knowledge** of the API.

```tsx
// ui/UserCard.tsx
import type { User } from '../model/types';
import { Card } from '../../../shared/ui/Card';

interface UserCardProps {
  user: User;
}

export function UserCard({ user }: UserCardProps) {
  return (
    <Card>
      <h3>{user.displayName}</h3>
      <p>{user.location}</p>
      <p>{user.company}</p>
    </Card>
  );
}
```

**Rules:**
- UI components only accept **domain types** as props
- They **never import from `api/`** — only from `model/types.ts`
- They are pure presentational components: given data, render it

---

## 6. The Anti-Corruption Layer in Action

### Example: Backend renames `company.name` → `company.title`

**Without this pattern:**

| File            | Change needed                     |
|-----------------|-----------------------------------|
| `api/types.ts`  | Update interface                  |
| `UserCard.tsx`  | `raw.company.name` → `raw.company.title` |
| `UserDetail.tsx`| Same                              |
| `UserList.tsx`  | Same                              |
| `useUsers.ts`   | Maybe                             |
| Any util        | Same                              |
| **Total**       | **5–10 files**                    |

**With this pattern:**

| File                | Change needed                              |
|---------------------|--------------------------------------------|
| `api/types.ts`      | Update interface                           |
| `model/mappers.ts`  | One line: `raw.company.name` → `raw.company.title` |
| **Total**           | **2 files** — Done.                        |

The mapper absorbs the difference. The domain type `User` still has `company: string`. Hooks, UI, pages — nothing downstream changes.

### Example: Backend restructures the entire address object

**Backend changes:**

```json
// Before
{
  "address": {
    "city": "NYC",
    "street": "5th Ave",
    "geo": { "lat": "40.7", "lng": "-74.0" }
  }
}

// After
{
  "location": {
    "cityName": "NYC",
    "streetAddress": "5th Ave"
  },
  "coordinates": [40.7, -74.0]
}
```

**What you change:**

1. `api/types.ts` — update the interface to match new shape
2. `model/mappers.ts` — update the mapping logic

```ts
// Before
location: `${raw.address.city}, ${raw.address.street}`,
coordinates: { lat: parseFloat(raw.address.geo.lat), lng: parseFloat(raw.address.geo.lng) }

// After
location: `${raw.location.cityName}, ${raw.location.streetAddress}`,
coordinates: { lat: raw.coordinates[0], lng: raw.coordinates[1] }
```

**What stays the same:** The `User` domain type, all hooks, all UI components, all pages. **Zero changes.**

---

## 7. Feature Boundaries (Barrel Exports)

Each feature has an `index.ts` that controls what’s visible to the outside:

```ts
// features/users/index.ts — the PUBLIC API
export type { User } from './model/types';           // [YES] domain type
export { useUsers, useUser } from './hooks/useUsers'; // [YES] hooks
export { UserCard } from './ui/UserCard';            // [YES] components
export { UserList } from './ui/UserList';
export { UserDetail } from './ui/UserDetail';

// api/types.ts is NOT exported     // [NO] raw types stay internal
// model/mappers.ts is NOT exported // [NO] mappers stay internal
```

**External code can only import from the barrel:**

```ts
// ✅ CORRECT — import from barrel
import { useUsers, UserCard } from '../../features/users';

// ❌ BLOCKED by ESLint — importing internals
import { fetchUsers } from '../../features/users/api/usersApi';
import type { UserApiResponse } from '../../features/users/api/types';
```

---

## 8. Dependency Rules

```
app/          → features/ (barrel only) → shared/
```

| From                  | Can import from                              |
|-----------------------|----------------------------------------------|
| `app/` (pages, layout, router) | `features/` (barrel exports), `shared/`     |
| `features/` (barrel)  | Own internals, `shared/`                     |
| `features/` (internals) | Same feature’s internals, `shared/`        |
| `shared/`             | Only `shared/`                               |
| Any feature           | **Never** another feature’s internals        |

These rules are enforced automatically by `eslint-plugin-boundaries`. A developer who violates them gets a lint error in their IDE and in CI.

---

## 9. Adding a New Feature (Checklist)

When adding a new feature (e.g., `products`):

1. **Create the folder structure:**

   ```
   src/features/products/
   ├── api/
   │   ├── types.ts
   │   └── productsApi.ts
   ├── model/
   │   ├── types.ts
   │   └── mappers.ts
   ├── hooks/
   │   └── useProducts.ts
   ├── ui/
   │   ├── ProductCard.tsx
   │   └── ProductList.tsx
   └── index.ts
   ```

2. Define raw API types in `api/types.ts` — match the backend exactly
3. Define domain types in `model/types.ts` — design for your UI needs
4. Write the mapper in `model/mappers.ts` — translate raw → domain
5. Write fetch functions in `api/productsApi.ts`
6. Write hooks in `hooks/` — wire fetch + mapper + TanStack Query
7. Write UI components in `ui/` — import only from `model/types.ts`
8. Export the public API in `index.ts` — only domain types, hooks, and components
9. Add a page in `app/pages/` that uses the feature’s public API

---

## 10. Tooling Enforcement

### ESLint Boundaries Plugin

```bash
npm install -D eslint-plugin-boundaries
```

**Configuration (simplified):**

```js
// eslint.config.js
export default {
  settings: {
    "boundaries/elements": [
      { type: "feature", pattern: "src/features/*" },
      { type: "feature-internal", pattern: "src/features/*/**" },
      { type: "shared", pattern: "src/shared/**" },
      { type: "app", pattern: "src/app/**" },
    ],
  },
  rules: {
    "boundaries/element-types": ["error", {
      default: "disallow",
      rules: [
        { from: "app", allow: ["feature", "shared", "app"] },
        { from: "feature", allow: ["feature-internal", "shared"] },
        { from: "feature-internal", allow: ["feature-internal", "shared"] },
        { from: "shared", allow: ["shared"] },
      ],
    }],
  },
};
```

### API Type Codegen (Recommended)

If your backend has an OpenAPI spec or GraphQL schema, **auto-generate** the raw API types:

- **REST:** `openapi-typescript` generates types from OpenAPI specs
- **GraphQL:** `graphql-codegen` generates types from your schema

This means `api/types.ts` is **auto-generated** — you never hand-write it. When the backend schema changes, you regenerate and **only update the mapper**.

---

## 11. Tech Stack (Reference Implementation)

| Tool                    | Purpose                          |
|-------------------------|----------------------------------|
| React 19 + TypeScript   | UI framework + type safety       |
| Vite                    | Build tool                       |
| TanStack Query          | Data fetching + caching          |
| React Router v7         | Routing                          |
| eslint-plugin-boundaries| Architectural lint rules         |

---

## 12. Quick Reference — Where Does Each Change Go?

| What changed?                      | Files to touch                              |
|------------------------------------|---------------------------------------------|
| Backend renamed a field            | `api/types.ts` + `model/mappers.ts`         |
| Backend restructured an object     | `api/types.ts` + `model/mappers.ts`         |
| New backend endpoint               | New `api/` function + new mapper + new hook |
| UI redesign of a card              | `ui/` components only                       |
| New page using existing data       | `app/pages/` only                           |
| Add caching/refetch logic          | `hooks/` only                               |
| New shared button component        | `shared/ui/` only                           |

---

**Reference implementation available in the `react-architecture-demo` repository.**

---

*This guide promotes maintainable, scalable React applications through clear boundaries and an anti-corruption layer between backend schemas and frontend domain models.*
