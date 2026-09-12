-- V1: users, households, members, invitations, child profiles

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------
-- users
-- ---------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_uid    TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    email           TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_supabase_uid ON users (supabase_uid);

-- ---------------------------------------------------------------
-- households
-- ---------------------------------------------------------------
CREATE TABLE households (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    timezone    TEXT NOT NULL DEFAULT 'UTC',
    owner_id    UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- household_members
-- ---------------------------------------------------------------
CREATE TABLE household_members (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id),
    role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (household_id, user_id)
);

CREATE INDEX idx_members_household ON household_members (household_id);
CREATE INDEX idx_members_user      ON household_members (user_id);

-- ---------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------
CREATE TABLE invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    invited_by_id   UUID NOT NULL REFERENCES users(id),
    recipient_email TEXT NOT NULL,
    token           TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_invitations_token     ON invitations (token);
CREATE INDEX idx_invitations_household ON invitations (household_id);

-- ---------------------------------------------------------------
-- child_profiles
-- ---------------------------------------------------------------
CREATE TABLE child_profiles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    created_by   UUID NOT NULL REFERENCES users(id),
    display_name TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_child_profiles_household ON child_profiles (household_id);

-- ---------------------------------------------------------------
-- audit_events
-- ---------------------------------------------------------------
CREATE TABLE audit_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type   TEXT NOT NULL,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_household ON audit_events (household_id, created_at DESC);
