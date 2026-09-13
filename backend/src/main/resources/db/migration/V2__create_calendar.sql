-- V2: calendar events and single-occurrence overrides

-- ---------------------------------------------------------------
-- calendar_events
-- ---------------------------------------------------------------
CREATE TABLE calendar_events (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id          UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    title                 TEXT NOT NULL,
    description           TEXT,
    all_day               BOOLEAN NOT NULL DEFAULT FALSE,
    starts_at             TIMESTAMPTZ NOT NULL,
    ends_at               TIMESTAMPTZ NOT NULL,
    recurrence_frequency  TEXT NOT NULL DEFAULT 'none' CHECK (recurrence_frequency IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    recurrence_interval   INT NOT NULL DEFAULT 1 CHECK (recurrence_interval > 0),
    recurrence_end_date   DATE,
    created_by            UUID NOT NULL REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_household ON calendar_events (household_id);

-- ---------------------------------------------------------------
-- event_occurrence_overrides
-- ---------------------------------------------------------------
CREATE TABLE event_occurrence_overrides (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    occurrence_date     DATE NOT NULL,
    status              TEXT NOT NULL CHECK (status IN ('skipped', 'modified')),
    override_starts_at  TIMESTAMPTZ,
    override_ends_at    TIMESTAMPTZ,
    override_title      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, occurrence_date)
);

CREATE INDEX idx_event_overrides_event ON event_occurrence_overrides (event_id);
