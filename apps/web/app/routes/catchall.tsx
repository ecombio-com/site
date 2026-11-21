import { PortableTextBody, SmartLink, hrefForLink } from "~/components/PortableTextBody";
import { envContext } from "~/lib/env";
import { PAGE_QUERY, createSanityClient, type PageData } from "~/lib/sanity";
import { formatPageTitle, getShopNameFromRootMatch } from "~/lib/storefront-shop";

import type { Route } from "./+types/catchall";

export function meta({ data, matches }: Route.MetaArgs) {
  if (!data) return [];
  const shopName = getShopNameFromRootMatch(matches[0]);
  const { page } = data;
  const tags: Array<Record<string, string>> = [
    { title: formatPageTitle(page.seo?.title || page.title, shopName) },
  ];
  if (page.seo?.description) {
    tags.push({ name: "description", content: page.seo.description });
  }
  return tags;
}

export async function loader({ context, params }: Route.LoaderArgs) {
  const slug = (params["*"] ?? "").replace(/^\/+|\/+$/g, "");
  if (!slug) throw new Response("Not Found", { status: 404 });

  let page: PageData | null = null;
  try {
    page = await createSanityClient(context.get(envContext)).fetch<PageData | null>(PAGE_QUERY, {
      slug,
    });
  } catch (error) {
    console.error(error);
  }

  if (!page) throw new Response("Not Found", { status: 404 });
  return { page };
}

export default function CatchAllRoute({ loaderData }: Route.ComponentProps) {
  const { page } = loaderData;
  const hero = page.showHero ? page.hero : null;
  const heroLink = hero?.link?.[0];
  const heroHref = hrefForLink(heroLink);

  return (
    <main className="max-w-page px-margin mx-auto w-full flex-1 py-12" id="main-content" tabIndex={-1}>
      <h1 className="type-display text-on-surface">{hero?.title || page.title}</h1>
      {hero?.description ? (
        <p className="text-on-surface-secondary mt-4">{hero.description}</p>
      ) : null}
      {heroHref ? (
        <SmartLink
          href={heroHref}
          newWindow={heroLink?.newWindow}
          className="mt-4 inline-block underline underline-offset-2"
        >
          Learn more
        </SmartLink>
      ) : null}
      {page.body ? (
        <div className="mt-8 max-w-3xl">
          <PortableTextBody value={page.body} />
        </div>
      ) : null}
    </main>
  );
}