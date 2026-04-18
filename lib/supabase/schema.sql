-- Events submitted by community members
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  location TEXT,
  description TEXT,
  rsvp_url TEXT,
  image_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  submitter_name TEXT,
  submitter_email TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT
);

-- Moderator allowlist — email must match Supabase auth user
CREATE TABLE moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL
);

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderators ENABLE ROW LEVEL SECURITY;

-- Public: read approved events only
CREATE POLICY "public_read_approved" ON events
  FOR SELECT USING (status = 'approved');

-- Anyone: submit new events (pending only)
CREATE POLICY "anyone_submit_event" ON events
  FOR INSERT WITH CHECK (status = 'pending');

-- Moderators: full access
CREATE POLICY "moderator_full_access" ON events
  FOR ALL USING (
    auth.email() IN (SELECT email FROM moderators)
  );

-- Moderators: read their own record
CREATE POLICY "moderator_read_self" ON moderators
  FOR SELECT USING (auth.email() = email);

-- Index for duplicate detection
CREATE INDEX events_rsvp_url_idx ON events (rsvp_url)
  WHERE rsvp_url IS NOT NULL;

-- Index for browse page (upcoming approved events)
CREATE INDEX events_status_start_idx ON events (status, start_at);
