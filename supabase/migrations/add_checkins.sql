-- Daily student check-ins: subjective signal about how the kid feels,
-- what they studied, what was hard, and whether anything is bothering them.
-- One row per (user_id, checkin_date).

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,

  -- Section 1: feelings
  mood TEXT CHECK (mood IN ('great','good','okay','tired','sad')),
  energy TEXT CHECK (energy IN ('high','medium','low')),
  sleep TEXT CHECK (sleep IN ('good','okay','bad')),

  -- Section 2: subjects studied today
  -- Shape: [{ subject, difficulty: 'easy'|'medium'|'hard',
  --           confidence: 1..5, enjoyment: 'like'|'meh'|'dislike' }]
  subjects_studied JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Section 3: what was hardest (free text + optional photo)
  hardest_thing TEXT,
  struggle_image_url TEXT,

  -- Section 4: positive anchor + wellbeing safety valve
  best_thing TEXT,
  bothered BOOLEAN NOT NULL DEFAULT FALSE,
  bothered_note TEXT,

  -- AI analysis, populated async after insert
  -- Shape: { summary, red_flags: [...], themes: [...] }
  ai_flags JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, checkin_date DESC);
