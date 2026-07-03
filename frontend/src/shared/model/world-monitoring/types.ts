export interface Location {
  name: string;
  lat?: number;
  lng?: number;
  role?: string;
}

export interface StructuredField {
  key: string;
  label: string;
  value: string;
}

export interface ArticlePreview {
  id: string;
  title: string;
  summary?: string;
  published?: string;

  imageUrl?: string;

  source?: string;
  sourceType?: string;
  author?: string;

  processedContent?: string;
  rawContent?: string;

  tags?: string[];

  locations?: Location[];
}

export interface EventDetail {
  id: string;

  title: string;
  summary: string;

  threatLevel: string;
  eventType: string;

  enrichedAt?: string;

  reasoning?: string;

  relevanceScore?: number;

  primaryLocation?: Location;

  locations?: Location[];

  structuredFields?: StructuredField[];

  linkedArticlePreview?: ArticlePreview;
}

export interface EventDetailDialogProps {
  open: boolean;
  loading: boolean;

  eventDetail: EventDetail | null;

  articleDetail?: ArticlePreview | null;

  onClose: () => void;

  onOpenArticle?: (articleId: string) => void;
  variant?: "dialog" | "inline";
}

