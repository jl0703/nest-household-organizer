CREATE TABLE notification_preferences (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id             UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id                  UUID NOT NULL REFERENCES users(id),
    daily_digest_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    event_reminders_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    chore_reminders_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    digest_time              TIME NOT NULL DEFAULT '08:00',
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (household_id, user_id),
    FOREIGN KEY (household_id, user_id) REFERENCES household_members(household_id, user_id) ON DELETE CASCADE
);

CREATE TABLE notification_jobs (
    id                 UUID PRIMARY KEY,
    household_id       UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    recipient_user_id  UUID NOT NULL REFERENCES users(id),
    type               TEXT NOT NULL CHECK (type IN ('daily_digest', 'event_due', 'chore_due')),
    source_type        TEXT NOT NULL CHECK (source_type IN ('household', 'calendar_event', 'chore')),
    source_id          UUID NOT NULL,
    occurrence_key     TEXT NOT NULL,
    scheduled_for      TIMESTAMPTZ NOT NULL,
    status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed')),
    attempt_count      INT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (recipient_user_id, type, source_type, source_id, occurrence_key, scheduled_for),
    FOREIGN KEY (household_id, recipient_user_id) REFERENCES household_members(household_id, user_id) ON DELETE CASCADE
);

CREATE TABLE notification_scheduler_state (
    id               TEXT PRIMARY KEY,
    last_scanned_at  TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_preferences_household ON notification_preferences (household_id);
CREATE INDEX idx_notification_jobs_pending ON notification_jobs (status, scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_calendar_events_notification_window ON calendar_events (household_id, starts_at);
CREATE INDEX idx_event_overrides_notification_window ON event_occurrence_overrides (event_id, override_starts_at)
    WHERE status = 'modified';
CREATE INDEX idx_chore_occurrences_notification_window ON chore_occurrences (due_date, chore_id)
    WHERE status = 'pending';
