"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { requestLoginCode, verifyLoginCode } from "@/lib/auth/actions";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await requestLoginCode(email);
      if (res.ok) {
        setStep("code");
        setNotice(`We sent a 6-digit code to ${email}.`);
      } else {
        setError(res.error);
      }
    });
  }

  function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await verifyLoginCode(email, code);
      if (res.ok) {
        router.replace(next);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const input = "w-full rounded border border-neutral-300 px-3 py-2 text-base";
  const button = "w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50";

  return step === "email" ? (
    <form onSubmit={sendCode} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Sending…" : "Email me a code"}
      </button>
    </form>
  ) : (
    <form onSubmit={submitCode} className="flex flex-col gap-4">
      {notice && <p className="text-sm text-neutral-600">{notice}</p>}
      <label className="flex flex-col gap-1 text-sm">
        6-digit code
        <input
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={`${input} tracking-widest`}
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending || code.length !== 6} className={button}>
        {pending ? "Verifying…" : "Sign in"}
      </button>
      <div className="flex justify-between text-sm">
        <button type="button" disabled={pending} onClick={() => sendCode()} className="underline">
          Resend code
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
            setNotice(null);
          }}
          className="underline"
        >
          Use a different email
        </button>
      </div>
    </form>
  );
}
