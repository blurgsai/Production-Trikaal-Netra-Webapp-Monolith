import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  ThreatFilters,
  ThreatProgressiveFilter,
} from "../model/types";

const VALID_TABS = new Set(["dashboard", "threats", "articles"]);

const VALID_SORTS = new Set(["latest", "oldest", "relevance", "severity"]);

export interface WorldMonitoringUrlParams {
  tab: string | undefined;
  event: string | undefined;
  article: string | undefined;
  keyword: string | undefined;
  sort: string | undefined;
  threatFilters: Partial<ThreatFilters>;
  threatProgressiveFilters: ThreatProgressiveFilter[];
  articleFilters: {
    search?: string;
    source?: string;
    sourceType?: string;
    processingStatus?: string;
    title?: string;
    author?: string;
    publishedFrom?: string;
    publishedTo?: string;
    ingestedFrom?: string;
    ingestedTo?: string;
    updatedFrom?: string;
    updatedTo?: string;
    tags?: string;
    locationName?: string;
    sort?: string;
  };
  hasParams: boolean;
}

export function useWorldMonitoringUrlParams(): WorldMonitoringUrlParams {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const tab = searchParams.get("tab") ?? undefined;
    const validatedTab = tab && VALID_TABS.has(tab) ? tab : undefined;

    const event = searchParams.get("event") ?? undefined;
    const article = searchParams.get("article") ?? undefined;

    const keyword = searchParams.get("keyword") ?? undefined;
    const sortStr = searchParams.get("sort") ?? undefined;
    const sort = sortStr && VALID_SORTS.has(sortStr) ? sortStr : undefined;

    // ── Threat filters ──────────────────────────────────────────────

    const eventTypes = searchParams.getAll("event_type").filter(Boolean);
    const threatLevels = searchParams.getAll("threat_level").filter(Boolean);
    const sources = searchParams.getAll("source").filter(Boolean);
    const dateFrom = searchParams.get("date_from") ?? undefined;
    const dateTo = searchParams.get("date_to") ?? undefined;
    const relevanceMin = searchParams.get("relevance_min");
    const relevanceMax = searchParams.get("relevance_max");
    const hasArticleParam = searchParams.get("has_article");
    const locationParam = searchParams.get("location") ?? undefined;

    const threatFilters: Partial<ThreatFilters> = {
      keyword: keyword ?? "",
      eventTypes,
      threatLevels,
      sources,
      dateFrom,
      dateTo,
      sort: sort ?? "latest",
    };

    if (relevanceMin) {
      const parsed = parseFloat(relevanceMin);
      if (!Number.isNaN(parsed)) threatFilters.relevanceScoreFrom = parsed;
    }
    if (relevanceMax) {
      const parsed = parseFloat(relevanceMax);
      if (!Number.isNaN(parsed)) threatFilters.relevanceScoreTo = parsed;
    }
    if (hasArticleParam === "true" || hasArticleParam === "1") {
      threatFilters.hasLinkedArticle = true;
    }
    if (locationParam) {
      threatFilters.locationName = locationParam;
    }

    // Build progressive filters for Threats UI
    const threatProgressiveFilters: ThreatProgressiveFilter[] = [];
    if (keyword) {
      threatProgressiveFilters.push({
        field: "keyword",
        operator: "contains",
        value: keyword,
        combinator: "AND",
      });
    }
    eventTypes.forEach((et) => {
      threatProgressiveFilters.push({
        field: "event_type",
        operator: "=",
        value: et,
        combinator: "AND",
      });
    });
    threatLevels.forEach((tl) => {
      threatProgressiveFilters.push({
        field: "threat_level",
        operator: "=",
        value: tl,
        combinator: "AND",
      });
    });
    sources.forEach((src) => {
      threatProgressiveFilters.push({
        field: "source",
        operator: "=",
        value: src,
        combinator: "AND",
      });
    });
    if (dateFrom) {
      threatProgressiveFilters.push({
        field: "enriched_at",
        operator: ">=",
        value: dateFrom,
        combinator: "AND",
      });
    }
    if (dateTo) {
      threatProgressiveFilters.push({
        field: "enriched_at",
        operator: "<=",
        value: dateTo,
        combinator: "AND",
      });
    }
    if (relevanceMin && !Number.isNaN(parseFloat(relevanceMin))) {
      threatProgressiveFilters.push({
        field: "relevance_score",
        operator: ">=",
        value: relevanceMin,
        combinator: "AND",
      });
    }
    if (relevanceMax && !Number.isNaN(parseFloat(relevanceMax))) {
      threatProgressiveFilters.push({
        field: "relevance_score",
        operator: "<=",
        value: relevanceMax,
        combinator: "AND",
      });
    }
    if (hasArticleParam === "true" || hasArticleParam === "1") {
      threatProgressiveFilters.push({
        field: "has_linked_article",
        operator: "=",
        value: "true",
        combinator: "AND",
      });
    }
    if (locationParam) {
      threatProgressiveFilters.push({
        field: "location.name",
        operator: "contains",
        value: locationParam,
        combinator: "AND",
      });
    }

    // ── Article filters ─────────────────────────────────────────────

    const articleFilters: WorldMonitoringUrlParams["articleFilters"] = {
      search: keyword ?? "",
      sort: sort ?? "latest",
    };

    const sourceParam = searchParams.get("source") ?? undefined;
    if (sourceParam) articleFilters.source = sourceParam;

    const sourceType = searchParams.get("source_type") ?? undefined;
    if (sourceType) articleFilters.sourceType = sourceType;

    const status = searchParams.get("status") ?? undefined;
    if (status) articleFilters.processingStatus = status;

    const title = searchParams.get("title") ?? undefined;
    if (title) articleFilters.title = title;

    const author = searchParams.get("author") ?? undefined;
    if (author) articleFilters.author = author;

    const publishedFrom = searchParams.get("published_from") ?? undefined;
    if (publishedFrom) articleFilters.publishedFrom = publishedFrom;

    const publishedTo = searchParams.get("published_to") ?? undefined;
    if (publishedTo) articleFilters.publishedTo = publishedTo;

    const ingestedFrom = searchParams.get("ingested_from") ?? undefined;
    if (ingestedFrom) articleFilters.ingestedFrom = ingestedFrom;

    const ingestedTo = searchParams.get("ingested_to") ?? undefined;
    if (ingestedTo) articleFilters.ingestedTo = ingestedTo;

    const updatedFrom = searchParams.get("updated_from") ?? undefined;
    if (updatedFrom) articleFilters.updatedFrom = updatedFrom;

    const updatedTo = searchParams.get("updated_to") ?? undefined;
    if (updatedTo) articleFilters.updatedTo = updatedTo;

    const tags = searchParams.get("tags") ?? undefined;
    if (tags) articleFilters.tags = tags;

    const articleLocation = searchParams.get("location") ?? undefined;
    if (articleLocation) articleFilters.locationName = articleLocation;

    // ── hasParams ───────────────────────────────────────────────────

    const hasParams =
      validatedTab != null ||
      event != null ||
      article != null ||
      keyword != null ||
      sort != null ||
      eventTypes.length > 0 ||
      threatLevels.length > 0 ||
      sources.length > 0 ||
      dateFrom != null ||
      dateTo != null ||
      relevanceMin != null ||
      relevanceMax != null ||
      (hasArticleParam != null && (hasArticleParam === "true" || hasArticleParam === "1")) ||
      locationParam != null ||
      sourceType != null ||
      status != null ||
      title != null ||
      author != null ||
      publishedFrom != null ||
      publishedTo != null ||
      ingestedFrom != null ||
      ingestedTo != null ||
      updatedFrom != null ||
      updatedTo != null ||
      tags != null;

    return {
      tab: validatedTab,
      event,
      article,
      keyword,
      sort,
      threatFilters,
      threatProgressiveFilters,
      articleFilters,
      hasParams,
    };
  }, [searchParams]);
}
