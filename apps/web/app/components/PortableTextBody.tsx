import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import type { SanityLink, SanityRef } from "~/lib/sanity";

export function hrefForRef(ref: SanityRef | undefined): string | null {
  if (!ref) return null;
  switch (ref._type) {
    case "home":
      return "/";
    case "page":
      return ref.slug ? `/${ref.slug}` : null;
    case "product":
      return ref.handle ? `/products/${ref.handle}` : null;
    case "collection":
      return ref.handle ? `/collections/${ref.handle}` : null;
    default:
      return null;
  }
}

export function hrefForLink(link: SanityLink | undefined): string | null {
  if (!link) return null;
  return link._type === "linkInternal" ? hrefForRef(link.ref) : (link.url ?? null);
}

export function SmartLink({
  href,
  newWindow,
  className,
  children,
}: {
  href: string;
  newWindow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (href.startsWith("/")) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={className}
      {...(newWindow ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

const linkClass = "underline underline-offset-2 hover:opacity-70";

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => <h2 className="type-heading-xl mt-8 mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-6 mb-2 text-lg font-medium">{children}</h3>,
    normal: ({ children }) => <p className="my-4">{children}</p>,
  },
  list: {
    bullet: ({ children }) => <ul className="my-4 list-disc ps-6">{children}</ul>,
    number: ({ children }) => <ol className="my-4 list-decimal ps-6">{children}</ol>,
  },
  marks: {
    linkInternal: ({ value, children }) => {
      const href = hrefForRef(value?.ref);
      return href ? (
        <SmartLink href={href} className={linkClass}>
          {children}
        </SmartLink>
      ) : (
        <>{children}</>
      );
    },
    linkExternal: ({ value, children }) =>
      value?.url ? (
        <SmartLink href={value.url} newWindow={value.newWindow} className={linkClass}>
          {children}
        </SmartLink>
      ) : (
        <>{children}</>
      ),
    linkEmail: ({ value, children }) =>
      value?.email ? (
        <a href={`mailto:${value.email}`} className={linkClass}>
          {children}
        </a>
      ) : (
        <>{children}</>
      ),
    // Product links need Shopify product data; plain text for now.
    linkProduct: ({ children }) => <>{children}</>,
  },
  types: {
    callout: ({ value }) => {
      const href = hrefForLink(value?.link?.[0]);
      return (
        <aside className="border-border my-6 rounded border p-4">
          <p>{value?.text}</p>
          {href ? (
            <SmartLink
              href={href}
              newWindow={value.link[0].newWindow}
              className={`${linkClass} mt-2 inline-block text-sm`}
            >
              Learn more
            </SmartLink>
          ) : null}
        </aside>
      );
    },
    accordion: ({ value }) => (
      <div className="my-6">
        {(value?.groups ?? []).map((group: any) => (
          <details key={group._key} className="border-border border-b py-3">
            <summary className="cursor-pointer font-medium">{group.title}</summary>
            <div className="pt-2">
              <PortableText value={group.body ?? []} components={components} />
            </div>
          </details>
        ))}
      </div>
    ),
  },
  unknownType: ({ value }) => {
    if (import.meta.env.DEV) {
      console.warn(`PortableTextBody: no renderer for "${(value as any)?._type}" yet`);
    }
    return null;
  },
};

export function PortableTextBody({ value }: { value: any[] }) {
  return <PortableText value={value} components={components} />;
}