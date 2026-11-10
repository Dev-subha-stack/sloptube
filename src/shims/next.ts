// Types the ported SEO helpers still use. Converted to route head() tags by
// metadataToHead() in src/lib/seo/head.ts.
export type Metadata = {
  title?: string | null | { absolute?: string; default?: string };
  description?: string | null;
  alternates?: { canonical?: string | null } | null;
  robots?: { index?: boolean; follow?: boolean } | string | null;
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    siteName?: string;
    type?: string;
    images?: Array<{ url: string; width?: number; height?: number; alt?: string }> | string;
    videos?: Array<{ url: string; width?: number; height?: number; type?: string; secureUrl?: string }>;
    [key: string]: unknown;
  } | null;
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    images?: string[] | string;
    players?: Array<{ playerUrl: string; streamUrl?: string; width: number; height: number }>;
    [key: string]: unknown;
  } | null;
  other?: Record<string, string | number | Array<string | number>>;
  [key: string]: unknown;
};

export type Viewport = Record<string, unknown>;
