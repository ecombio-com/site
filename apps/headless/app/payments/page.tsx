import type { Metadata } from "next";

import { PaymentsHandoff } from "@/components/payments/payments-handoff";

export const metadata: Metadata = {
  title: "Processing order",
  robots: { index: false, follow: false },
};

export default function PaymentsPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <PaymentsHandoff />
    </main>
  );
}