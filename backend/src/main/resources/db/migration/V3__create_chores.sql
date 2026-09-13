-- V3: chores and chore occurrences

-- ---------------------------------------------------------------
-- chores
-- ---------------------------------------------------------------
CREATE TABLE chores (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id          UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    title                 TEXT NOT NULL,
    assignee_type         TEXT NOT NULL CHECK (assignee_type IN ('adult', 'child')),
    assignee_user_id      UUID REFERENCES users(id),
    assignee_child_id     UUID REFERENCES child_profiles(id),
    recurrence_frequency  TEXT NOT NULL DEFAULT 'none' CHECK (recurrence_frequency IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    recurrence_interval   INT NOT NULL DEFAULT 1 CHECK (recurrence_interval > 0),
    recurrence_end_date   DATE,
    created_by            UUID NOT NULL REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_chores_single_assignee CHECK (
        (assignee_type = 'adult' AND assignee_user_id IS NOT NULL AND assignee_child_id IS NULL)
        OR
        (assignee_type = 'child' AND assignee_child_id IS NOT NULL AND assignee_user_id IS NULL)
    )
);

CREATE INDEX idx_chores_household ON chores (household_id);

-- ---------------------------------------------------------------
-- chore_occurrences
-- ---------------------------------------------------------------
CREATE TABLE chore_occurrences (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id      UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    due_date      DATE NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    completed_at  TIMESTAMPTZ,
    completed_by  UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (chore_id, due_date)
);

CREATE INDEX idx_chore_occurrences_chore ON chore_occurrences (chore_id);
