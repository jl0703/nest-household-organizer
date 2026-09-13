"use client";

import { useState, type FormEvent } from "react";
import type { NotificationPreference } from "@/lib/types";

interface NotificationPreferencesPanelProps {
  householdId: string;
  initialPreference: NotificationPreference;
}

export function NotificationPreferencesPanel({
  householdId,
  initialPreference,
}: NotificationPreferencesPanelProps) {
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(initialPreference.dailyDigestEnabled);
  const [eventRemindersEnabled, setEventRemindersEnabled] = useState(initialPreference.eventRemindersEnabled);
  const [choreRemindersEnabled, setChoreRemindersEnabled] = useState(initialPreference.choreRemindersEnabled);
  const [digestTime, setDigestTime] = useState(initialPreference.digestTime.slice(0, 5));
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/households/${householdId}/notification-preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyDigestEnabled,
          eventRemindersEnabled,
          choreRemindersEnabled,
          digestTime,
        }),
      });
      if (!response.ok) {
        setError(
          response.status === 401
            ? "Your session has expired. Please sign in again."
            : "We couldn't save your notification preferences. Please try again.",
        );
        return;
      }
      const saved = (await response.json()) as NotificationPreference;
      setDailyDigestEnabled(saved.dailyDigestEnabled);
      setEventRemindersEnabled(saved.eventRemindersEnabled);
      setChoreRemindersEnabled(saved.choreRemindersEnabled);
      setDigestTime(saved.digestTime.slice(0, 5));
      setSuccess("Notification preferences saved.");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className="panel" aria-labelledby="notification-preferences-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">YOUR REMINDERS</p>
          <h2 id="notification-preferences-heading">Notifications</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="notification-preferences-form">
        <label className="preference-toggle">
          <input
            type="checkbox"
            checked={dailyDigestEnabled}
            onChange={(event) => setDailyDigestEnabled(event.target.checked)}
          />
          <span>Daily digest</span>
        </label>
        <label className="preference-toggle">
          <input
            type="checkbox"
            checked={eventRemindersEnabled}
            onChange={(event) => setEventRemindersEnabled(event.target.checked)}
          />
          <span>Event reminders</span>
        </label>
        <label className="preference-toggle">
          <input
            type="checkbox"
            checked={choreRemindersEnabled}
            onChange={(event) => setChoreRemindersEnabled(event.target.checked)}
          />
          <span>Chore reminders</span>
        </label>
        <div className="field">
          <label htmlFor="digest-time">Daily digest time</label>
          <input
            id="digest-time"
            type="time"
            required
            value={digestTime}
            onChange={(event) => setDigestTime(event.target.value)}
          />
        </div>
        <p className="form-help">Chore reminders also use this time on their due date.</p>
        {error && <p className="status-banner error" role="alert">{error}</p>}
        {success && <p className="status-banner success" role="status">{success}</p>}
        <button type="submit" className="primary" disabled={status === "submitting"}>
          {status === "submitting" ? "Saving…" : "Save notification preferences"}
        </button>
      </form>
    </section>
  );
}
