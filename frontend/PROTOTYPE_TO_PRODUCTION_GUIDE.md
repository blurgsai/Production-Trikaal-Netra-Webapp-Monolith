# Building Production-Ready Prototypes: Learnings from the Buyers Feature Refactor

## Overview

This document captures key learnings from refactoring the `buyers` feature to demonstrate how to build a prototype that can seamlessly transition to production. The focus is on architectural decisions that make the codebase maintainable, testable, and ready for real backend integration.

---

## Core Architectural Principle

**"Think as if we really have a backend"**

Even when building prototypes with mock data, structure the code as if it will eventually connect to a real backend. This eliminates massive refactoring when transitioning to production.

---

## Layer Separation

### 1. API Layer (`api/`)

**Purpose**: All data fetching, business logic that belongs on the server, and data transformations.

**Key Principles**:
- API functions should simulate real backend behavior
- Accept parameters that would be sent to a real endpoint (filters, sorting, pagination)
- Apply filtering/sorting server-side before returning data
- Use mock data from JSON files in `public/` folder as the "database"
- Simulate network delays to test loading states
- Keep API functions focused on data fetching and simple transformations
- Move complex business logic to service layer when appropriate

**Example**:
```typescript
// api/buyersApi.ts
export interface FetchBuyersParams {
  filters?: FilterState;
  port?: string;
  catchItems?: Array<{ fishType: string; pricePerKg: number }>;
}

export async function fetchBuyers(params?: FetchBuyersParams) {
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
  const response = await fetch('/buyers.json'); // Database
  
  let data = await response.json();
  
  // Server-side filtering (simulating backend logic)
  if (params?.port) {
    data = data.filter(b => b.location === params.port);
  }
  
  if (params?.filters) {
    data = data.filter(/* server-side filter logic */);
    data = sort(/* server-side sort logic */);
  }
  
  // Server-side business logic
  if (params?.catchItems) {
    data = data.map(/* price override logic */);
  }
  
  return data;
}
```

**Why This Matters**:
- When you add a real backend, you only replace the `fetch('/buyers.json')` with `fetch('/api/buyers')`
- The parameter structure matches what real APIs expect
- Server-side logic is already in the right place

---

### 1.5 Service Layer (`api/*ApiService.ts`)

**Purpose**: Business logic that would typically be computed by the backend but needs to be available in the frontend for prototyping.

**Key Principles**:
- Service layer sits between API and hooks
- Contains pure functions that transform or aggregate data
- Used for metrics calculations, data enrichment, and complex aggregations
- Functions should be pure (same input → same output, no side effects)
- Testable in isolation without mocking fetch

**When to Use Service Layer**:
- **Metrics aggregation**: Computing summary statistics (counts, totals, averages) from raw data
- **Data enrichment**: Adding computed fields that would come from backend in production
- **Complex transformations**: Multi-step data processing that doesn't belong in API fetching
- **Cross-entity calculations**: Computing values that span multiple data sources

**Example**:
```typescript
// api/previousBuyersApiService.ts
export interface PastTransactionsMetrics {
  completedCount: number;
  totalRevenue: number;
  avgRating: string;
  repeatBuyers: number;
}

export function calculatePastTransactionsMetrics(data: PastTransactionApiResponse[]): PastTransactionsMetrics {
  const completedCount = data.filter((t) => t.status === 'completed').length;
  const totalRevenue = data
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.totalValue, 0);
  const avgRating =
    data.length > 0
      ? (data.reduce((sum, t) => sum + t.buyerRating, 0) / data.length).toFixed(1)
      : '0';
  const counts = new Map<string, number>();
  data.forEach((t) => counts.set(t.buyerName, (counts.get(t.buyerName) || 0) + 1));
  const repeatBuyers = Array.from(counts.values()).filter((c) => c > 1).length;

  return { completedCount, totalRevenue, avgRating, repeatBuyers };
}

export function getUniqueFishTypes(data: PastTransactionApiResponse[]): string[] {
  const set = new Set(data.map((t) => t.fishType));
  return Array.from(set).sort();
}
```

**Usage in Hooks**:
```typescript
// hooks/usePreviousBuyersList.ts
import { calculatePastTransactionsMetrics, getUniqueFishTypes } from '../api/previousBuyersApiService';

export function usePreviousBuyersList() {
  const { transactions, loading, error } = usePastTransactions();

  // Convert to API response type for service layer
  const apiData = useMemo(() => 
    transactions.map(t => ({ ...t } as PastTransactionApiResponse)),
    [transactions]
  );

  // Use service layer for metrics
  const metrics = useMemo(() => 
    calculatePastTransactionsMetrics(apiData),
    [apiData]
  );

  // Use service layer for derived data
  const fishTypes = useMemo(() => 
    getUniqueFishTypes(apiData),
    [apiData]
  );

  return { transactions, metrics, fishTypes, loading, error };
}
```

**Why Service Layer Matters**:
- In production, metrics would be computed by the backend and returned in the API response
- Service layer simulates this backend behavior during prototyping
- Keeps business logic testable and reusable
- Makes it easy to replace with real backend metrics later
- Separates concerns: API fetches data, service transforms it

**Testing Service Layer**:
```typescript
// api/previousBuyersApiService.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePastTransactionsMetrics } from './previousBuyersApiService';

describe('previousBuyersApiService', () => {
  it('calculates metrics correctly', () => {
    const mockData: PastTransactionApiResponse[] = [
      { id: '1', status: 'completed', totalValue: 10000, buyerRating: 4.5, buyerName: 'Buyer A', /* ... */ },
      { id: '2', status: 'completed', totalValue: 5000, buyerRating: 3.5, buyerName: 'Buyer A', /* ... */ },
      { id: '3', status: 'cancelled', totalValue: 8000, buyerRating: 4.0, buyerName: 'Buyer B', /* ... */ },
    ];

    const metrics = calculatePastTransactionsMetrics(mockData);

    expect(metrics.completedCount).toBe(2);
    expect(metrics.totalRevenue).toBe(15000);
    expect(metrics.avgRating).toBe('4.0');
    expect(metrics.repeatBuyers).toBe(1); // Buyer A appears twice
  });
});
```

---

### 2. Hooks Layer (`hooks/`)

**Purpose**: State management only. No business logic, no computations.

**Key Principles**:
- Hooks orchestrate data fetching and manage component state
- Delegate all data transformations to the API layer
- Use `useMemo` to create stable parameter objects to prevent infinite refetch loops
- Keep hooks focused on one concern

**Example**:
```typescript
// hooks/useBuyers.ts
export function useBuyers(params?: FetchBuyersParams) {
  const [buyers, setBuyers] = useState<BuyerRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchBuyers(params) // Pass params to API
      .then(raw => setBuyers(raw.map(mapBuyerRequirementFromApi)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params]); // Refetch when params change

  return { buyers, loading, error };
}

// hooks/useBuyersList.ts
export function useBuyersList() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [dialogOpen, setDialogOpen] = useState(false);
  // ... other UI state

  // Stable params to prevent infinite refetch
  const fetchParams = useMemo(() => ({
    filters,
    port: defaultPort,
    catchItems,
  }), [filters, defaultPort, catchItems]);

  const { buyers, loading, error } = useBuyers(fetchParams);
  
  // Client-side: UI-specific transformations only
  const enrichedBuyers = useMemo(() => enrichBuyerViewModel(buyers), [buyers]);
  
  return { buyers: enrichedBuyers, loading, error, filters, setFilters, ... };
}
```

**Common Pitfall - Infinite Refetch Loop**:
```typescript
// ❌ BAD - New object on every render
const { buyers } = useBuyers({ filters, port });

// ✅ GOOD - Stable reference
const fetchParams = useMemo(() => ({ filters, port }), [filters, port]);
const { buyers } = useBuyers(fetchParams);
```

---

### 3. Model Layer (`model/`)

**Purpose**: Domain types, mappers, and pure data structures. No logic.

**Key Principles**:
- Define domain types that represent your business entities
- Include optional computed fields for UI view model
- Mappers convert API responses to domain types
- Keep types separate from API types

**Example**:
```typescript
// model/types.ts
export interface BuyerRequirement {
  id: string;
  buyerName: string;
  companyName: string;
  // ... domain fields
  
  // Optional computed fields (pre-computed by API/hook)
  totalValue?: number;
  daysLeft?: number;
  initials?: string;
}

// model/mappers.ts
export function mapBuyerRequirementFromApi(raw: BuyerRequirementApiResponse): BuyerRequirement {
  return {
    id: raw.id,
    buyerName: raw.buyerName,
    // ... mapping logic
  };
}
```

---

### 4. UI Layer (`ui/`)

**Purpose**: Pure presentational components. No state, no business logic, no computations.

**Key Principles**:
- Components receive all data as props
- No `useState` for data (only for UI interactions like dialogs)
- No `useMemo` for computations (done in hooks/API)
- Use `memo` to prevent unnecessary re-renders
- Split large components to isolate loading states

**Example**:
```typescript
// ui/BuyerRequirementCard.tsx
export default function BuyerRequirementCard({ buyer, isLocked, onLockBuyer }: Props) {
  // ❌ BAD - Computation in component
  const totalValue = buyer.quantityKg * buyer.pricePerKg;
  
  // ✅ GOOD - Read pre-computed value
  const totalValue = buyer.totalValue!;
  
  return <Card>...</Card>;
}

// ui/BuyersList.tsx
const BuyersFilterSection = memo(function BuyersFilterSection({ filters, setFilters, metrics, resultCount }) {
  // Header, metrics, filter bar - stays static during data fetch
  return <Box>...</Box>;
});

const BuyersGrid = memo(function BuyersGrid({ buyers, loading, error }) {
  // Cards grid - shows loading state independently
  if (loading) return <CircularProgress />;
  return <Grid>{buyers.map(...)}</Grid>;
});
```

**Performance Pattern - Isolate Loading States**:
When you have server-side filtering, split your component so only the data-dependent part reloads:

```typescript
// ❌ BAD - Entire component reloads on filter change
export default function BuyersList() {
  const { buyers, loading, filters, setFilters } = useBuyersList();
  
  if (loading) return <CircularProgress />; // Header disappears!
  
  return (
    <Box>
      <Header />
      <Filters filters={filters} onChange={setFilters} />
      <Grid>{buyers.map(...)}</Grid>
    </Box>
  );
}

// ✅ GOOD - Only grid reloads, filters stay static
export default function BuyersList() {
  const { buyers, loading, filters, setFilters } = useBuyersList();
  
  return (
    <Box>
      <BuyersFilterSection filters={filters} onChange={setFilters} /> {/* Static */}
      <BuyersGrid buyers={buyers} loading={loading} /> {/* Reloads */}
    </Box>
  );
}
```

---

## Database Strategy

### For Prototypes

**Read Operations (GET)**: Use JSON files in the `public/` folder as your database:

```
public/
  buyers.json
  config.json
  detection-feed.json
  catch.json
```

**Write Operations (POST/PUT/DELETE)**: Use `localStorage` for mutations:

```typescript
// api/buyersApi.ts
export async function updateBuyer(id: string, updates: Partial<Buyer>): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 700));
  // For prototype: persist to localStorage
  const saved = localStorage.getItem('buyers_data');
  const data = saved ? JSON.parse(saved) : [];
  const updated = data.map((b: Buyer) => b.id === id ? { ...b, ...updates } : b);
  localStorage.setItem('buyers_data', JSON.stringify(updated));
  // In production: await fetch(`/api/buyers/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}
```

**Why this hybrid approach**:
- JSON files in `public/` provide initial data and are easy to edit/version control
- `localStorage` allows runtime mutations without requiring write access to public/
- Served directly by the dev server for reads
- Simulates real API behavior (read from DB, write to DB)
- Can be replaced with real API calls later (replace fetch + localStorage logic)

### For Production

Replace `fetch('/buyers.json')` with `fetch('/api/buyers')`:

```typescript
// api/buyersApi.ts
export async function fetchBuyers(params?: FetchBuyersParams) {
  // Prototype
  // const response = await fetch('/buyers.json');
  
  // Production
  const response = await fetch('/api/buyers', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  
  // Rest of the code stays the same
}
```

---

## Testing Strategy

### Overview

Testing in a prototype with mock backend requires a layered approach. Since we don't have a real backend, we test each layer in isolation with appropriate mocking. This ensures each component works correctly and makes the codebase maintainable.

### Testing Philosophy

**Test in isolation, mock dependencies**: Each layer should be tested independently by mocking its dependencies. This makes tests fast, reliable, and focused on specific functionality.

**Test behavior, not implementation**: Focus on what the code should do (inputs → outputs) rather than how it does it. This makes tests resilient to refactoring.

**Arrange-Act-Assert pattern**: Structure every test with three clear sections:
1. **Arrange**: Set up the test data and mocks
2. **Act**: Call the function/hook/component being tested
3. **Assert**: Verify the expected outcome

---

### 1. Testing API Layer

**Purpose**: Verify that API functions correctly fetch data, apply filtering/sorting, and handle errors.

**Setup**: Mock `global.fetch` to simulate network responses.

**Best Practices**:
- Use `vi.fn()` to create mock functions
- Use `vi.mocked()` for type-safe mock access
- Test both success and error cases
- Test filtering/sorting logic with realistic data
- Use `beforeEach` to reset mocks between tests

**Example**:
```typescript
// api/previousBuyersApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPastTransactions } from './previousBuyersApi';
import type { PastTransactionApiResponse } from './types';

describe('previousBuyersApi', () => {
  beforeEach(() => {
    global.fetch = vi.fn(); // Reset fetch before each test
  });

  describe('fetchPastTransactions', () => {
    it('fetches past transactions from JSON file', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [
          { id: '1', buyerName: 'Test Buyer', fishType: 'Mackerel', /* ... */ },
        ],
      } as Response);

      // Act
      const result = await fetchPastTransactions();

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalledWith('/past-transactions.json');
    });

    it('throws error when fetch fails', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
      } as Response);

      // Act & Assert
      await expect(fetchPastTransactions()).rejects.toThrow('Failed to load past transactions');
    });

    it('filters by status', async () => {
      // Arrange
      const mockData: PastTransactionApiResponse[] = [
        { id: '1', status: 'completed', /* ... */ },
        { id: '2', status: 'cancelled', /* ... */ },
      ];
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      } as Response);

      // Act
      const result = await fetchPastTransactions({ status: 'completed' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });

    it('sorts by value high to low', async () => {
      // Arrange
      const mockData: PastTransactionApiResponse[] = [
        { id: '1', totalValue: 10000, /* ... */ },
        { id: '2', totalValue: 20000, /* ... */ },
      ];
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      } as Response);

      // Act
      const result = await fetchPastTransactions({ sortBy: 'valueHigh' });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].totalValue).toBeGreaterThan(result[1].totalValue);
    });
  });
});
```

**Common Pitfalls**:
- ❌ Forgetting to reset mocks in `beforeEach` - causes test pollution
- ❌ Not testing error cases - leaves gaps in coverage
- ❌ Using `global.fetch` without `vi.fn()` - doesn't work in Vitest
- ❌ Testing implementation details (e.g., exact array order when not relevant)

---

### 2. Testing Service Layer

**Purpose**: Verify that pure functions correctly transform and aggregate data.

**Setup**: No mocking needed - service functions are pure.

**Best Practices**:
- Test with realistic edge cases (empty arrays, single items, duplicates)
- Test boundary conditions (zero values, negative numbers, null values)
- Use descriptive test names that explain what's being tested
- Test multiple scenarios in one test with `it.each` when appropriate

**Example**:
```typescript
// api/previousBuyersApiService.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePastTransactionsMetrics, getUniqueFishTypes } from './previousBuyersApiService';
import type { PastTransactionApiResponse } from './types';

describe('previousBuyersApiService', () => {
  describe('calculatePastTransactionsMetrics', () => {
    it('calculates metrics correctly with mixed statuses', () => {
      // Arrange
      const mockData: PastTransactionApiResponse[] = [
        { id: '1', status: 'completed', totalValue: 10000, buyerRating: 4.5, buyerName: 'Buyer A', /* ... */ },
        { id: '2', status: 'completed', totalValue: 5000, buyerRating: 3.5, buyerName: 'Buyer A', /* ... */ },
        { id: '3', status: 'cancelled', totalValue: 8000, buyerRating: 4.0, buyerName: 'Buyer B', /* ... */ },
      ];

      // Act
      const metrics = calculatePastTransactionsMetrics(mockData);

      // Assert
      expect(metrics.completedCount).toBe(2);
      expect(metrics.totalRevenue).toBe(15000);
      expect(metrics.avgRating).toBe('4.0');
      expect(metrics.repeatBuyers).toBe(1); // Buyer A appears twice
    });

    it('handles empty array', () => {
      // Arrange
      const mockData: PastTransactionApiResponse[] = [];

      // Act
      const metrics = calculatePastTransactionsMetrics(mockData);

      // Assert
      expect(metrics.completedCount).toBe(0);
      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.avgRating).toBe('0');
      expect(metrics.repeatBuyers).toBe(0);
    });

    it('calculates average rating correctly', () => {
      // Arrange
      const mockData: PastTransactionApiResponse[] = [
        { id: '1', buyerRating: 4.0, /* ... */ },
        { id: '2', buyerRating: 5.0, /* ... */ },
      ];

      // Act
      const metrics = calculatePastTransactionsMetrics(mockData);

      // Assert
      expect(metrics.avgRating).toBe('4.5');
    });
  });

  describe('getUniqueFishTypes', () => {
    it('returns sorted unique fish types', () => {
      // Arrange
      const mockData: PastTransactionApiResponse[] = [
        { id: '1', fishType: 'Tuna', /* ... */ },
        { id: '2', fishType: 'Mackerel', /* ... */ },
        { id: '3', fishType: 'Tuna', /* ... */ }, // Duplicate
      ];

      // Act
      const result = getUniqueFishTypes(mockData);

      // Assert
      expect(result).toEqual(['Mackerel', 'Tuna']);
    });

    it('returns empty array for empty input', () => {
      // Arrange
      const mockData: PastTransactionApiResponse[] = [];

      // Act
      const result = getUniqueFishTypes(mockData);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
```

**Common Pitfalls**:
- ❌ Not testing edge cases (empty arrays, null values)
- ❌ Testing implementation details instead of behavior
- ❌ Using hardcoded expected values without explaining why they're expected

---

### 3. Testing Hooks Layer

**Purpose**: Verify that hooks correctly manage state, call API functions, and handle loading/error states.

**Setup**: Mock API functions, use `renderHook` from React Testing Library.

**Best Practices**:
- Mock API functions at the module level with `vi.mock()`
- Use `waitFor` to wait for async operations to complete
- Test loading, success, and error states
- Test that hooks pass correct params to API functions
- Test that hooks refetch when params change

**Example**:
```typescript
// hooks/usePastTransactions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePastTransactions } from './usePastTransactions';

// Mock at module level
vi.mock('../api/previousBuyersApi', () => ({
  fetchPastTransactions: vi.fn(),
}));

import { fetchPastTransactions } from '../api/previousBuyersApi';

describe('usePastTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear mock calls between tests
  });

  it('returns loading initially', () => {
    // Arrange
    vi.mocked(fetchPastTransactions).mockReturnValue(new Promise(() => {}));

    // Act
    const { result } = renderHook(() => usePastTransactions());

    // Assert
    expect(result.current.loading).toBe(true);
  });

  it('returns transactions on success', async () => {
    // Arrange
    vi.mocked(fetchPastTransactions).mockResolvedValue([{ id: 't1', buyerName: 'Raju' }] as any);

    // Act
    const { result } = renderHook(() => usePastTransactions());

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.transactions.length).toBeGreaterThan(0);
  });

  it('returns error on failure', async () => {
    // Arrange
    vi.mocked(fetchPastTransactions).mockRejectedValue(new Error('Failed'));

    // Act
    const { result } = renderHook(() => usePastTransactions());

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed');
  });

  it('passes params to API', async () => {
    // Arrange
    vi.mocked(fetchPastTransactions).mockResolvedValue([{ id: 't1', buyerName: 'Raju' }] as any);

    // Act
    const { result } = renderHook(() => usePastTransactions({ status: 'completed', sortBy: 'recent' }));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchPastTransactions).toHaveBeenCalledWith({ status: 'completed', sortBy: 'recent' });
  });

  it('refetches when params change', async () => {
    // Arrange
    vi.mocked(fetchPastTransactions)
      .mockResolvedValueOnce([{ id: 't1' }] as any)
      .mockResolvedValueOnce([{ id: 't2' }] as any);

    // Act
    const { result, rerender } = renderHook(
      ({ params }) => usePastTransactions(params),
      { initialProps: { params: { status: 'completed' } } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchPastTransactions).toHaveBeenCalledTimes(1);

    rerender({ params: { status: 'cancelled' } });

    // Assert
    await waitFor(() => expect(fetchPastTransactions).toHaveBeenCalledTimes(2));
  });
});
```

**Common Pitfalls**:
- ❌ Not using `waitFor` for async operations - tests fail before data loads
- ❌ Not clearing mocks in `beforeEach` - tests interfere with each other
- ❌ Not testing refetch behavior - infinite refetch loops go undetected
- ❌ Testing implementation details (internal state) instead of behavior

---

### 4. Testing UI Components

**Purpose**: Verify that components render correctly, handle user interactions, and display data properly.

**Setup**: Mock hooks, use `render` from React Testing Library.

**Best Practices**:
- Mock hooks to return controlled test data
- Test user interactions with `fireEvent` or `userEvent`
- Query elements by role, label, or text (not by class or test ID)
- Test loading, error, and empty states
- Test that components call callbacks correctly
- Use `screen` queries, avoid storing element references

**Example**:
```typescript
// ui/PreviousBuyersList.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PreviousBuyersList from './PreviousBuyersList';
import * as transactionsHook from '../hooks/usePreviousBuyersList';

// Mock the hook
vi.mock('../hooks/usePreviousBuyersList');

describe('PreviousBuyersList', () => {
  it('shows loading state', () => {
    // Arrange
    vi.mocked(transactionsHook.usePreviousBuyersList).mockReturnValue({
      transactions: [],
      filtered: [],
      fishTypes: [],
      filters: { search: '', status: '', fishType: '', sortBy: 'recent' },
      setFilters: vi.fn(),
      metrics: { completedCount: 0, totalRevenue: 0, avgRating: '0', repeatBuyers: 0 },
      loading: true,
      error: '',
    });

    // Act
    render(<PreviousBuyersList />);

    // Assert
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error state', () => {
    // Arrange
    vi.mocked(transactionsHook.usePreviousBuyersList).mockReturnValue({
      transactions: [],
      filtered: [],
      fishTypes: [],
      filters: { search: '', status: '', fishType: '', sortBy: 'recent' },
      setFilters: vi.fn(),
      metrics: { completedCount: 0, totalRevenue: 0, avgRating: '0', repeatBuyers: 0 },
      loading: false,
      error: 'Failed to load',
    });

    // Act
    render(<PreviousBuyersList />);

    // Assert
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('renders transactions table', async () => {
    // Arrange
    const mockTransactions = [
      {
        id: 't1',
        buyerName: 'Raju Exports',
        companyName: 'Raju Seafood',
        fishType: 'Mackerel',
        quantityKg: 400,
        pricePerKg: 115,
        totalValue: 46000,
        status: 'completed',
        buyerRating: 4.5,
        /* ... other fields */
      },
    ];

    vi.mocked(transactionsHook.usePreviousBuyersList).mockReturnValue({
      transactions: mockTransactions,
      filtered: mockTransactions,
      fishTypes: ['Mackerel'],
      filters: { search: '', status: '', fishType: '', sortBy: 'recent' },
      setFilters: vi.fn(),
      metrics: { completedCount: 1, totalRevenue: 46000, avgRating: '4.5', repeatBuyers: 0 },
      loading: false,
      error: '',
    });

    // Act
    render(<PreviousBuyersList />);

    // Assert
    expect(screen.getByText('Raju Exports')).toBeInTheDocument();
    expect(screen.getByText('Mackerel')).toBeInTheDocument();
    expect(screen.getByText('Rs. 46,000')).toBeInTheDocument();
  });

  it('calls setFilters when search input changes', async () => {
    // Arrange
    const setFiltersMock = vi.fn();
    vi.mocked(transactionsHook.usePreviousBuyersList).mockReturnValue({
      transactions: [],
      filtered: [],
      fishTypes: [],
      filters: { search: '', status: '', fishType: '', sortBy: 'recent' },
      setFilters: setFiltersMock,
      metrics: { completedCount: 0, totalRevenue: 0, avgRating: '0', repeatBuyers: 0 },
      loading: false,
      error: '',
    });

    // Act
    render(<PreviousBuyersList />);
    const searchInput = screen.getByPlaceholderText('Search buyer or fish type...');
    // Use fireEvent or userEvent to simulate typing
    // fireEvent.change(searchInput, { target: { value: 'Raju' } });

    // Assert
    // expect(setFiltersMock).toHaveBeenCalledWith(expect.objectContaining({ search: 'Raju' }));
  });
});
```

**Common Pitfalls**:
- ❌ Querying by class names or test IDs - fragile to CSS changes
- ❌ Not testing all states (loading, error, empty, success)
- ❌ Testing implementation details (internal component state)
- ❌ Not mocking all hook return values - causes runtime errors
- ❌ Using `toBeInTheDocument` without proper setup - type errors

---

## Testing Best Practices

### 1. Test Naming

Use descriptive names that explain what's being tested:

```typescript
// ❌ BAD
it('works', () => {});
it('test1', () => {});

// ✅ GOOD
it('filters by status when status param provided', () => {});
it('returns error message when API call fails', () => {});
it('calculates total revenue from completed transactions only', () => {});
```

### 2. Test Data

Use realistic, minimal test data:

```typescript
// ❌ BAD - Too much irrelevant data
const mockData = {
  id: '1',
  buyerName: 'Test',
  // ... 20 more fields
  irrelevantField: 'value',
};

// ✅ GOOD - Only relevant fields
const mockData = {
  id: '1',
  status: 'completed',
  totalValue: 10000,
  // Only fields needed for this test
};
```

### 3. Test Isolation

Each test should be independent:

```typescript
describe('Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Reset mocks
    // Reset any shared state
  });

  it('test 1', () => {});
  it('test 2', () => {}); // Doesn't depend on test 1
});
```

### 4. Avoid Test Pollution

Don't let tests affect each other:

```typescript
// ❌ BAD - Tests share state
let sharedData;
it('test 1', () => { sharedData = 'value'; });
it('test 2', () => { expect(sharedData).toBe('value'); });

// ✅ GOOD - Each test is independent
it('test 1', () => { const data = 'value'; expect(data).toBe('value'); });
it('test 2', () => { const data = 'other'; expect(data).toBe('other'); });
```

### 5. Use Appropriate Assertions

Be specific about what you're testing:

```typescript
// ❌ BAD - Too vague
expect(result).toBeTruthy();
expect(array).toBeDefined();

// ✅ GOOD - Specific assertions
expect(result.status).toBe('completed');
expect(array).toHaveLength(3);
expect(array[0].id).toBe('123');
```

### 6. Test Edge Cases

Don't just test the happy path:

```typescript
describe('calculateMetrics', () => {
  it('works with normal data', () => {});
  it('handles empty array', () => {}); // Edge case
  it('handles single item', () => {}); // Edge case
  it('handles null values', () => {}); // Edge case
  it('handles zero values', () => {}); // Edge case
});
```

### 7. Mock Only What's Necessary

Over-mocking makes tests brittle:

```typescript
// ❌ BAD - Mocking too much
vi.mock('../api', () => ({
  fetchA: vi.fn(),
  fetchB: vi.fn(),
  fetchC: vi.fn(),
  // ... 10 more mocks
}));

// ✅ GOOD - Only mock what the test uses
vi.mock('../api/fetchA');
```

### 8. Test Behavior, Not Implementation

Focus on what the code does, not how:

```typescript
// ❌ BAD - Testing implementation
it('uses filter method', () => {
  expect(spy).toHaveBeenCalledWith('filter');
});

// ✅ GOOD - Testing behavior
it('returns only completed transactions', () => {
  expect(result.every(t => t.status === 'completed')).toBe(true);
});
```

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests Once (No Watch Mode)
```bash
npm test -- --run
```

### Run Specific Feature Tests
```bash
npm test -- src/features/buyers
npm test -- src/features/fishingZones
npm test -- src/features/previousBuyers
```

### Run Specific Test File
```bash
npm test -- src/features/buyers/api/buyersApi.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --grep "filters by status"
```

### Generate Coverage Report
```bash
npm test -- --coverage
```

---

## Common Testing Issues and Solutions

### Issue: "vi.mocked is not a function"
**Cause**: Not using Vitest's `vi.mocked` helper correctly.
**Solution**: Ensure you're using Vitest and mock at module level:
```typescript
vi.mock('../api/fetchA');
import { fetchA } from '../api/fetchA';
vi.mocked(fetchA).mockResolvedValue(...);
```

### Issue: Tests timeout waiting for async operations
**Cause**: Not using `waitFor` for async operations.
**Solution**: Use `waitFor` to wait for state changes:
```typescript
await waitFor(() => expect(result.current.loading).toBe(false));
```

### Issue: "Property 'toBeInTheDocument' does not exist"
**Cause**: Missing `@testing-library/jest-dom` setup.
**Solution**: Ensure `src/test/setup.ts` imports the library:
```typescript
import '@testing-library/jest-dom/vitest';
```

### Issue: Tests pass individually but fail when run together
**Cause**: Test pollution - tests sharing state.
**Solution**: Use `beforeEach` to reset mocks and state:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  // Reset any shared state
});
```

### Issue: Mock not being called
**Cause**: Mock not set up correctly or import order issue.
**Solution**: Mock at module level, import after mocking:
```typescript
vi.mock('../api/fetchA');
import { fetchA } from '../api/fetchA';
```

---

## Testing Checklist

Before considering a feature "tested", ensure:

- [ ] API layer tests cover all filtering/sorting logic
- [ ] API layer tests cover error cases
- [ ] Service layer tests cover edge cases (empty, null, single item)
- [ ] Hook tests cover loading, success, and error states
- [ ] Hook tests verify correct params passed to API
- [ ] Hook tests verify refetch behavior
- [ ] UI tests cover all states (loading, error, empty, success)
- [ ] UI tests use accessible queries (role, label, text)
- [ ] All tests are isolated (no pollution between tests)
- [ ] Test names are descriptive
- [ ] Test data is minimal and realistic

---

## Common Pitfalls and Solutions

### Pitfall 1: Business Logic in UI Components

**Problem**: Computing values in components makes them hard to test and re-use.

**Solution**: Move computations to API layer or hooks.

```typescript
// ❌ BAD
const Card = ({ buyer }) => {
  const totalValue = buyer.quantityKg * buyer.pricePerKg;
  return <div>{totalValue}</div>;
};

// ✅ GOOD
const Card = ({ buyer }) => {
  return <div>{buyer.totalValue}</div>;
};
```

### Pitfall 2: Client-Side Filtering That Should Be Server-Side

**Problem**: Filtering 1000 items on the client is slow and doesn't match real backend behavior.

**Solution**: Pass filter params to API, filter server-side.

```typescript
// ❌ BAD
const filtered = buyers.filter(b => b.urgency === 'high');

// ✅ GOOD
const { buyers } = useBuyers({ filters: { urgency: 'high' } });
```

### Pitfall 3: Infinite Refetch Loops

**Problem**: New object references on every render cause endless API calls.

**Solution**: Use `useMemo` for parameter objects.

```typescript
// ❌ BAD
useBuyers({ filters, port });

// ✅ GOOD
const params = useMemo(() => ({ filters, port }), [filters, port]);
useBuyers(params);
```

### Pitfall 4: Tight Coupling Between Features

**Problem**: Hooks directly importing from other features (e.g., `useBuyers` importing `useCatch`).

**Solution**: Pass data as parameters instead of importing hooks.

```typescript
// ❌ BAD
export function useBuyers() {
  const { catchItems } = useCatch(); // Cross-feature import
  // ...
}

// ✅ GOOD
export function useBuyers(params?: { catchItems?: CatchItem[] }) {
  // Use params.catchItems instead
}
```

---

## Transition Checklist: Prototype → Production

When moving from prototype to production:

1. **Replace Data Source**
   - Change `fetch('/buyers.json')` to `fetch('/api/buyers')`
   - Update fetch method (GET vs POST) as needed
   - Add authentication headers

2. **Remove Mock Delays**
   - Remove `setTimeout` calls that simulate network delay
   - Keep error handling (it will be real now)

3. **Add Real Error Handling**
   - Implement retry logic for failed requests
   - Add proper error logging
   - Handle network timeouts

4. **Update Environment Configuration**
   - Add API base URL to config
   - Differentiate dev/staging/prod endpoints

5. **Performance Optimization**
   - Add request caching
   - Implement pagination for large datasets
   - Add debouncing for search/filter inputs

6. **Add Monitoring**
   - Track API response times
   - Monitor error rates
   - Log user interactions

---

## Summary

The key to building production-ready prototypes is to **structure your code as if the backend already exists**:

1. **API Layer**: Simulate real backend behavior with proper parameter passing
2. **Service Layer**: Pure functions for metrics aggregation and data enrichment (simulates backend computations)
3. **Hooks Layer**: State management only, delegate transformations to API/service layers
4. **Model Layer**: Pure types and mappers
5. **UI Layer**: Pure presentational components, memoized for performance

By following these principles, transitioning from prototype to production becomes a matter of swapping data sources rather than rewriting architecture.
