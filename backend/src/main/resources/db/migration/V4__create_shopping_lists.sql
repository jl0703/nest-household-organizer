-- V4: shopping lists and items

-- ---------------------------------------------------------------
-- shopping_lists
-- ---------------------------------------------------------------
CREATE TABLE shopping_lists (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    created_by    UUID NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_lists_household ON shopping_lists (household_id);

-- ---------------------------------------------------------------
-- shopping_items
-- ---------------------------------------------------------------
CREATE TABLE shopping_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id     UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    quantity    TEXT,
    category    TEXT,
    checked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_items_list ON shopping_items (list_id);
