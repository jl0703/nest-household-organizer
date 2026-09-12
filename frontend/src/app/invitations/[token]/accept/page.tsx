"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HouseholdMember } from "@/lib/types";

type AcceptState =
  | { status: "pending" }
  | { status: "accepting" }
  | { status: "success"; member: HouseholdMember }
  | { status: "error"; message: string };

export default function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [state, setState] = useState<AcceptState>({ status: "pending" });

  const accept = useCallback(async () => {
    setState({ status: "accepting" });
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, { method: "POST" });
      if (!response.ok) {
        const message =
          response.status === 401
            ? "Your session has expired. Please sign in again."
            : response.status === 404
              ? "This invitation link is invalid."
              : "This invitation has expired or was already used.";
        setState({ status: "error", message });
        return;
      }
      const member = (await response.json()) as HouseholdMember;
      setState({ status: "success", member });
      const timer = setTimeout(() => {
        router.push(`/households/${member.householdId}`);
      }, 1500);
      return () => clearTimeout(timer);
    } catch {
      setState({
        status: "error",
        message: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }, [token, router]);

  useEffect(() => {
    // Deferred so the initial acceptance call isn't a synchronous setState
    // inside the effect body itself.
    const timer = setTimeout(accept, 0);
    return () => clearTimeout(timer);
    // Only run once on mount; `accept` is stable enough for this one-shot flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">JOINING A HOUSEHOLD</p>
        <h1>Accepting your invitation</h1>

        {(state.status === "pending" || state.status === "accepting") && (
          <p className="status-banner" role="status" aria-live="polite">
            Confirming your invitation…
          </p>
        )}

        {state.status === "success" && (
          <>
            <p className="status-banner success" role="status">
              You&apos;re in! Taking you to your household…
            </p>
            <p className="auth-switch">
              <Link href={`/households/${state.member.householdId}`}>
                Continue to household
              </Link>
            </p>
          </>
        )}

        {state.status === "error" && (
          <>
            <p className="status-banner error" role="alert">
              {state.message}
            </p>
            <button type="button" className="primary full-width" onClick={accept}>
              Try again
            </button>
          </>
        )}
      </div>
    </main>
  );
}
