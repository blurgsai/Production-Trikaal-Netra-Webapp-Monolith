import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useWorldMonitoringUrlParams } from "../useWorldMonitoringUrlParams";

function createWrapper(initialSearch: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[`/world-monitoring?${initialSearch}`]}>
        {children}
      </MemoryRouter>
    );
  };
}

function renderHookWithSearch<T>(search: string, hook: () => T) {
  return renderHook(hook, { wrapper: createWrapper(search) });
}

describe("useWorldMonitoringUrlParams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Empty / no params ────────────────────────────────────────────────

  describe("no params", () => {
    it("returns all defaults and hasParams=false when URL has no params", () => {
      const { result } = renderHookWithSearch("", () => useWorldMonitoringUrlParams());
      expect(result.current.tab).toBeUndefined();
      expect(result.current.event).toBeUndefined();
      expect(result.current.article).toBeUndefined();
      expect(result.current.keyword).toBeUndefined();
      expect(result.current.sort).toBeUndefined();
      expect(result.current.hasParams).toBe(false);
    });
  });

  // ── tab ──────────────────────────────────────────────────────────────

  describe("tab", () => {
    it("parses valid tab=threats", () => {
      const { result } = renderHookWithSearch("tab=threats", () => useWorldMonitoringUrlParams());
      expect(result.current.tab).toBe("threats");
      expect(result.current.hasParams).toBe(true);
    });

    it("parses valid tab=dashboard", () => {
      const { result } = renderHookWithSearch("tab=dashboard", () => useWorldMonitoringUrlParams());
      expect(result.current.tab).toBe("dashboard");
    });

    it("parses valid tab=articles", () => {
      const { result } = renderHookWithSearch("tab=articles", () => useWorldMonitoringUrlParams());
      expect(result.current.tab).toBe("articles");
    });

    it("returns undefined for invalid tab", () => {
      const { result } = renderHookWithSearch("tab=invalid", () => useWorldMonitoringUrlParams());
      expect(result.current.tab).toBeUndefined();
    });
  });

  // ── event / article ──────────────────────────────────────────────────

  describe("event", () => {
    it("parses event ID", () => {
      const { result } = renderHookWithSearch("event=evt-123", () => useWorldMonitoringUrlParams());
      expect(result.current.event).toBe("evt-123");
      expect(result.current.hasParams).toBe(true);
    });

    it("returns undefined when event is absent", () => {
      const { result } = renderHookWithSearch("", () => useWorldMonitoringUrlParams());
      expect(result.current.event).toBeUndefined();
    });
  });

  describe("article", () => {
    it("parses article ID", () => {
      const { result } = renderHookWithSearch("article=art-456", () => useWorldMonitoringUrlParams());
      expect(result.current.article).toBe("art-456");
      expect(result.current.hasParams).toBe(true);
    });
  });

  // ── keyword ──────────────────────────────────────────────────────────

  describe("keyword", () => {
    it("parses keyword", () => {
      const { result } = renderHookWithSearch("keyword=piracy", () => useWorldMonitoringUrlParams());
      expect(result.current.keyword).toBe("piracy");
      expect(result.current.threatFilters.keyword).toBe("piracy");
      expect(result.current.articleFilters.search).toBe("piracy");
      expect(result.current.hasParams).toBe(true);
    });

    it("returns undefined when keyword is absent", () => {
      const { result } = renderHookWithSearch("", () => useWorldMonitoringUrlParams());
      expect(result.current.keyword).toBeUndefined();
    });
  });

  // ── sort ─────────────────────────────────────────────────────────────

  describe("sort", () => {
    it("parses valid sort=latest", () => {
      const { result } = renderHookWithSearch("sort=latest", () => useWorldMonitoringUrlParams());
      expect(result.current.sort).toBe("latest");
      expect(result.current.threatFilters.sort).toBe("latest");
      expect(result.current.articleFilters.sort).toBe("latest");
    });

    it("parses valid sort=oldest", () => {
      const { result } = renderHookWithSearch("sort=oldest", () => useWorldMonitoringUrlParams());
      expect(result.current.sort).toBe("oldest");
    });

    it("parses valid sort=relevance", () => {
      const { result } = renderHookWithSearch("sort=relevance", () => useWorldMonitoringUrlParams());
      expect(result.current.sort).toBe("relevance");
    });

    it("parses valid sort=severity", () => {
      const { result } = renderHookWithSearch("sort=severity", () => useWorldMonitoringUrlParams());
      expect(result.current.sort).toBe("severity");
    });

    it("returns undefined for invalid sort", () => {
      const { result } = renderHookWithSearch("sort=random", () => useWorldMonitoringUrlParams());
      expect(result.current.sort).toBeUndefined();
    });
  });

  // ── threat filters ───────────────────────────────────────────────────

  describe("threat filters", () => {
    it("parses event_type (repeatable)", () => {
      const { result } = renderHookWithSearch(
        "event_type=conflict&event_type=piracy",
        () => useWorldMonitoringUrlParams(),
      );
      expect(result.current.threatFilters.eventTypes).toEqual(["conflict", "piracy"]);
      expect(result.current.threatProgressiveFilters).toHaveLength(2);
      expect(result.current.threatProgressiveFilters[0]).toEqual({
        field: "event_type", operator: "=", value: "conflict", combinator: "AND",
      });
    });

    it("parses threat_level (repeatable)", () => {
      const { result } = renderHookWithSearch(
        "threat_level=HIGH&threat_level=CRITICAL",
        () => useWorldMonitoringUrlParams(),
      );
      expect(result.current.threatFilters.threatLevels).toEqual(["HIGH", "CRITICAL"]);
      expect(result.current.threatProgressiveFilters).toHaveLength(2);
    });

    it("parses source (repeatable)", () => {
      const { result } = renderHookWithSearch(
        "source=OSINT&source=HUMINT",
        () => useWorldMonitoringUrlParams(),
      );
      expect(result.current.threatFilters.sources).toEqual(["OSINT", "HUMINT"]);
    });

    it("parses date_from and date_to", () => {
      const { result } = renderHookWithSearch(
        "date_from=2025-01-01&date_to=2025-12-31",
        () => useWorldMonitoringUrlParams(),
      );
      expect(result.current.threatFilters.dateFrom).toBe("2025-01-01");
      expect(result.current.threatFilters.dateTo).toBe("2025-12-31");
      expect(result.current.threatProgressiveFilters).toHaveLength(2);
      expect(result.current.threatProgressiveFilters[0].field).toBe("enriched_at");
      expect(result.current.threatProgressiveFilters[0].operator).toBe(">=");
      expect(result.current.threatProgressiveFilters[1].operator).toBe("<=");
    });

    it("parses relevance_min and relevance_max", () => {
      const { result } = renderHookWithSearch(
        "relevance_min=0.5&relevance_max=0.9",
        () => useWorldMonitoringUrlParams(),
      );
      expect(result.current.threatFilters.relevanceScoreFrom).toBe(0.5);
      expect(result.current.threatFilters.relevanceScoreTo).toBe(0.9);
      expect(result.current.threatProgressiveFilters).toHaveLength(2);
    });

    it("handles NaN relevance_min gracefully", () => {
      const { result } = renderHookWithSearch("relevance_min=abc", () => useWorldMonitoringUrlParams());
      expect(result.current.threatFilters.relevanceScoreFrom).toBeUndefined();
    });

    it("parses has_article=true", () => {
      const { result } = renderHookWithSearch("has_article=true", () => useWorldMonitoringUrlParams());
      expect(result.current.threatFilters.hasLinkedArticle).toBe(true);
      expect(result.current.threatProgressiveFilters).toHaveLength(1);
      expect(result.current.threatProgressiveFilters[0].field).toBe("has_linked_article");
    });

    it("parses has_article=1", () => {
      const { result } = renderHookWithSearch("has_article=1", () => useWorldMonitoringUrlParams());
      expect(result.current.threatFilters.hasLinkedArticle).toBe(true);
    });

    it("does not set hasLinkedArticle for has_article=false", () => {
      const { result } = renderHookWithSearch("has_article=false", () => useWorldMonitoringUrlParams());
      expect(result.current.threatFilters.hasLinkedArticle).toBeUndefined();
    });

    it("parses location", () => {
      const { result } = renderHookWithSearch("location=Red Sea", () => useWorldMonitoringUrlParams());
      expect(result.current.threatFilters.locationName).toBe("Red Sea");
      expect(result.current.threatProgressiveFilters).toHaveLength(1);
      expect(result.current.threatProgressiveFilters[0].field).toBe("location.name");
    });

    it("filters out empty event_type values", () => {
      const { result } = renderHookWithSearch("event_type=", () => useWorldMonitoringUrlParams());
      expect(result.current.threatFilters.eventTypes).toEqual([]);
    });
  });

  // ── article filters ──────────────────────────────────────────────────

  describe("article filters", () => {
    it("parses source for articles", () => {
      const { result } = renderHookWithSearch("source=Reuters", () => useWorldMonitoringUrlParams());
      expect(result.current.articleFilters.source).toBe("Reuters");
    });

    it("parses source_type", () => {
      const { result } = renderHookWithSearch("source_type=news", () => useWorldMonitoringUrlParams());
      expect(result.current.articleFilters.sourceType).toBe("news");
    });

    it("parses status (processing_status)", () => {
      const { result } = renderHookWithSearch("status=processed", () => useWorldMonitoringUrlParams());
      expect(result.current.articleFilters.processingStatus).toBe("processed");
    });

    it("parses title", () => {
      const { result } = renderHookWithSearch("title=South China Sea", () => useWorldMonitoringUrlParams());
      expect(result.current.articleFilters.title).toBe("South China Sea");
    });

    it("parses author", () => {
      const { result } = renderHookWithSearch("author=Jane Doe", () => useWorldMonitoringUrlParams());
      expect(result.current.articleFilters.author).toBe("Jane Doe");
    });

    it("parses published_from and published_to", () => {
      const { result } = renderHookWithSearch(
        "published_from=2025-01-01&published_to=2025-06-30",
        () => useWorldMonitoringUrlParams(),
      );
      expect(result.current.articleFilters.publishedFrom).toBe("2025-01-01");
      expect(result.current.articleFilters.publishedTo).toBe("2025-06-30");
    });

    it("parses ingested_from and ingested_to", () => {
      const { result } = renderHookWithSearch(
        "ingested_from=2025-01-01&ingested_to=2025-06-30",
        () => useWorldMonitoringUrlParams(),
      );
      expect(result.current.articleFilters.ingestedFrom).toBe("2025-01-01");
      expect(result.current.articleFilters.ingestedTo).toBe("2025-06-30");
    });

    it("parses updated_from and updated_to", () => {
      const { result } = renderHookWithSearch(
        "updated_from=2025-01-01&updated_to=2025-06-30",
        () => useWorldMonitoringUrlParams(),
      );
      expect(result.current.articleFilters.updatedFrom).toBe("2025-01-01");
      expect(result.current.articleFilters.updatedTo).toBe("2025-06-30");
    });

    it("parses tags", () => {
      const { result } = renderHookWithSearch("tags=piracy", () => useWorldMonitoringUrlParams());
      expect(result.current.articleFilters.tags).toBe("piracy");
    });

    it("parses location for articles", () => {
      const { result } = renderHookWithSearch("location=Gulf of Aden", () => useWorldMonitoringUrlParams());
      expect(result.current.articleFilters.locationName).toBe("Gulf of Aden");
    });
  });

  // ── hasParams ────────────────────────────────────────────────────────

  describe("hasParams", () => {
    it("is false when no params present", () => {
      const { result } = renderHookWithSearch("", () => useWorldMonitoringUrlParams());
      expect(result.current.hasParams).toBe(false);
    });

    it("is true when only tab is present", () => {
      const { result } = renderHookWithSearch("tab=threats", () => useWorldMonitoringUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only event is present", () => {
      const { result } = renderHookWithSearch("event=123", () => useWorldMonitoringUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only keyword is present", () => {
      const { result } = renderHookWithSearch("keyword=test", () => useWorldMonitoringUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only sort is present", () => {
      const { result } = renderHookWithSearch("sort=latest", () => useWorldMonitoringUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only event_type is present", () => {
      const { result } = renderHookWithSearch("event_type=conflict", () => useWorldMonitoringUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only threat_level is present", () => {
      const { result } = renderHookWithSearch("threat_level=HIGH", () => useWorldMonitoringUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only date_from is present", () => {
      const { result } = renderHookWithSearch("date_from=2025-01-01", () => useWorldMonitoringUrlParams());
      expect(result.current.hasParams).toBe(true);
    });

    it("is true when only tags is present", () => {
      const { result } = renderHookWithSearch("tags=piracy", () => useWorldMonitoringUrlParams());
      expect(result.current.hasParams).toBe(true);
    });
  });

  // ── Combined / integration ───────────────────────────────────────────

  describe("combined params", () => {
    it("parses all params together", () => {
      const { result } = renderHookWithSearch(
        "tab=threats&event=evt-1&keyword=piracy&sort=relevance" +
        "&event_type=conflict&threat_level=HIGH&source=OSINT" +
        "&date_from=2025-01-01&date_to=2025-12-31&relevance_min=0.5" +
        "&has_article=true&location=Red Sea",
        () => useWorldMonitoringUrlParams(),
      );
      expect(result.current.tab).toBe("threats");
      expect(result.current.event).toBe("evt-1");
      expect(result.current.keyword).toBe("piracy");
      expect(result.current.sort).toBe("relevance");
      expect(result.current.threatFilters.eventTypes).toEqual(["conflict"]);
      expect(result.current.threatFilters.threatLevels).toEqual(["HIGH"]);
      expect(result.current.threatFilters.sources).toEqual(["OSINT"]);
      expect(result.current.threatFilters.dateFrom).toBe("2025-01-01");
      expect(result.current.threatFilters.dateTo).toBe("2025-12-31");
      expect(result.current.threatFilters.relevanceScoreFrom).toBe(0.5);
      expect(result.current.threatFilters.hasLinkedArticle).toBe(true);
      expect(result.current.threatFilters.locationName).toBe("Red Sea");
      expect(result.current.hasParams).toBe(true);
    });

    it("does not mutate the URL (one-way: read-only)", () => {
      const search = "tab=threats&keyword=test";
      const { result } = renderHookWithSearch(search, () => useWorldMonitoringUrlParams());
      expect(result.current.tab).toBe("threats");
      expect(result.current.keyword).toBe("test");
    });
  });

  // ── Progressive filter structure ─────────────────────────────────────

  describe("progressive filter structure", () => {
    it("builds progressive filters in correct order", () => {
      const { result } = renderHookWithSearch(
        "keyword=test&event_type=conflict&threat_level=HIGH",
        () => useWorldMonitoringUrlParams(),
      );
      expect(result.current.threatProgressiveFilters).toHaveLength(3);
      expect(result.current.threatProgressiveFilters[0].field).toBe("keyword");
      expect(result.current.threatProgressiveFilters[1].field).toBe("event_type");
      expect(result.current.threatProgressiveFilters[2].field).toBe("threat_level");
    });

    it("always sets combinator to AND", () => {
      const { result } = renderHookWithSearch(
        "keyword=a&event_type=b&threat_level=c",
        () => useWorldMonitoringUrlParams(),
      );
      expect(
        result.current.threatProgressiveFilters.every((f) => f.combinator === "AND"),
      ).toBe(true);
    });
  });
});
