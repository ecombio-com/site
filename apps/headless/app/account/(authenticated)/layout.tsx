import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";

import { AccountMobileTabs } from "@/components/account/mobile-tabs";
import { AccountSidebar } from "@/components/account/sidebar";
import { SignOutButton } from "@/components/account/sign-out-button";
import { Container } from "@/components/ui/container";
import { Page } from "@/components/ui/page";
import { Sections } from "@/components/ui/sections";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { getCustomerById } from "@/lib/shopify/customers";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Account",
    robots: { index: false, follow: false },
  };
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <Page className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col gap-6 md:flex-row md:gap-10">
        <aside className="hidden w-52 shrink-0 md:block">
          <div className="sticky top-24 flex flex-col gap-6">
            <Suspense fallback={<AccountLabelSkeleton />}>
              <AccountLabel />
            </Suspense>
            <Suspense fallback={<SidebarSkeleton />}>
              <AccountSidebar />
            </Suspense>
            <SignOutButton />
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <Suspense fallback={<AccountLabelSkeleton />}>
              <AccountLabel />
            </Suspense>
            <SignOutButton />
          </div>
          <Suspense>
            <AccountMobileTabs />
          </Suspense>
          <Sections className="gap-5 pt-6 md:pt-0">
            <Suspense>
              <AccountGate>{children}</AccountGate>
            </Suspense>
          </Sections>
        </div>
      </Container>
    </Page>
  );
}

async function AccountGate({ children }: { children: ReactNode }) {
  await requireSession("/account");
  return <>{children}</>;
}

async function AccountLabel() {
  const session = await requireSession("/account");
  const profile = await getCustomerById(session.customerId);
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  return (
    <div>
      <p className="text-sm font-medium">{name || session.email}</p>
      <p className="text-xs text-muted-foreground">{session.email}</p>
    </div>
  );
}

function AccountLabelSkeleton() {
  return (
    <div className="grid gap-1.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}
