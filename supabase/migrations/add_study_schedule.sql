-- Run this in your Supabase SQL editor
CREATE TABLE IF NOT EXISTS study_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  subject TEXT NOT NULL,
  order_index SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (user_id, day_of_week, subject)
);
CREATE INDEX IF NOT EXISTS idx_study_schedule_user ON study_schedule(user_id, day_of_week);
