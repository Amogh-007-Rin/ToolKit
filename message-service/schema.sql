CREATE TABLE IF NOT EXISTS rooms (
    id         TEXT PRIMARY KEY,
    kind       TEXT NOT NULL DEFAULT 'direct',
    name       TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_members (
    room_id      TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id      TEXT NOT NULL,
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id  TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at  TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages (room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members (user_id);
