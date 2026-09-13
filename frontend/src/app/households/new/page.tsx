"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Household } from "@/lib/types";
import { guessTimezone, listTimezones } from "@/lib/timezones";

export default function NewHouseholdPage() {
  const router = useRouter();
  const timezones = useMemo(() => listTimezones(), []);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState(guessTimezone);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Household name is required.");
      return;
    }

    setError(null);
    setStatus("submitting");

    try {
      const response = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, timezone }),
      });

      if (!response.ok) {
        const message =
          response.status === 401
            ? "Your session has expired. Please sign in again."
            : "We couldn't create your household. Please try again.";
        setError(message);
        setStatus("idle");
        return;
      }

      const household = (await response.json()) as Household;
      router.push(`/households/${household.id}`);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setStatus("idle");
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">START A NEW HOME</p>
        <h1>Create your household</h1>
        <p className="auth-lede">
          You&apos;ll be the owner and can invite other adults once it&apos;s set up.
        </p>

        {error && (
          <p className="status-banner error" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="household-name">Household name</label>
            <input
              id="household-name"
              name="name"
              type="text"
              required
              maxLength={120}
              placeholder="The Hollow Way House"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="household-timezone">Timezone</label>
            <select
              id="household-timezone"
              name="timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="primary full-width" disabled={status === "submitting"}>
            {status === "submitting" ? "Creating…" : "Create household"}
          </button>
        </form>
      </div>
    </main>
  );
}
