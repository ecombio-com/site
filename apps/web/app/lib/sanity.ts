import { createClient } from "@sanity/client";

import type { Env } from "~/lib/env";

// Public values; they match apps/studio. Override with PUBLIC_SANITY_* if needed.
const DEFAULT_PROJECT_ID = "tkgeb9qc";
const DEFAULT_DATASET = "production";
const DEFAULT_API_VERSION = "2025-01-01";

export function createSanityClient(env: Env) {
  return createClient({
    projectId: env.PUBLIC_SANITY_PROJECT_ID || DEFAULT_PROJECT_ID,
    dataset: env.PUBLIC_SANITY_DATASET || DEFAULT_DATASET,
    apiVersion: env.PUBLIC_SANITY_API_VERSION || DEFAULT_API_VERSION,
    useCdn: true,
  });
}

export type SanityRef = {
  _type: string;
  slug?: string | null;
  handle?: string | null;
} | null;

export type SanityLink = {
  _key?: string;
  _type: "linkInternal" | "linkExternal";
  ref?: SanityRef;
  url?: string;
  newWindow?: boolean;
};

export type PageData = {
  title: string;
  slug: string;
  showHero: boolean | null;
  hero: { title?: string; description?: string; link?: SanityLink[] } | null;
  // Portable Text blocks and modules; PortableTextBody handles the shapes.
  body: any[] | null;
  seo: { title?: string; description?: string } | null;
};

const REF = `reference->{ _type, "slug": slug.current, "handle": store.slug.current }`;
const LINKS = `{ ..., "ref": ${REF} }`;
const MARKS = `markDefs[]{ ..., "ref": ${REF} }`;

export const PAGE_QUERY = `
  *[_type == "page" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    showHero,
    hero{ title, description, link[]${LINKS} },
    body[]{
      ...,
      ${MARKS},
      _type == "callout" => { link[]${LINKS} },
      _type == "accordion" => {
        groups[]{ _key, title, body[]{ ..., ${MARKS} } }
      }
    },
    seo{ title, description }
  }
`;