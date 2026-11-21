import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/safe-next";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ next?: string }> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-sm flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <Suspense fallback={<div className="h-40" aria-hidden />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginContent({ searchParams }: Props) {
  const { next } = await searchParams;
  const destination = safeNext(next);
  if (await getSession()) redirect(destination);
  return <LoginForm next={destination} />;
}
