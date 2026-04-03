CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  grade INT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  last_active DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO users (name, grade) VALUES ('أحمد', 8), ('محمود', 6);

CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_sessions_created_at ON study_sessions(created_at DESC);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice','short_answer')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_questions_session_id ON questions(session_id);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN,
  score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_answers_session_id ON answers(session_id);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL UNIQUE REFERENCES study_sessions(id) ON DELETE CASCADE,
  total_score INT NOT NULL,
  feedback TEXT NOT NULL,
  mistakes JSONB,
  suggestions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE weekly_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  summary TEXT NOT NULL,
  strengths JSONB,
  weaknesses JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 0;

-- Daily prayer tracking (5 Islamic prayers per day)
CREATE TABLE IF NOT EXISTS prayer_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prayer_date DATE NOT NULL,
  fajr BOOLEAN NOT NULL DEFAULT FALSE,
  dhuhr BOOLEAN NOT NULL DEFAULT FALSE,
  asr BOOLEAN NOT NULL DEFAULT FALSE,
  maghrib BOOLEAN NOT NULL DEFAULT FALSE,
  isha BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, prayer_date)
);
CREATE INDEX IF NOT EXISTS idx_prayer_logs_user_date ON prayer_logs(user_id, prayer_date DESC);

-- Weekly study schedule (which subjects on which days)
CREATE TABLE IF NOT EXISTS study_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun … 6=Sat
  subject TEXT NOT NULL,
  order_index SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (user_id, day_of_week, subject)
);
CREATE INDEX IF NOT EXISTS idx_study_schedule_user ON study_schedule(user_id, day_of_week);

-- Storage: create bucket and open RLS policies (app uses custom auth, not Supabase Auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-images', 'study-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public upload study-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'study-images');

CREATE POLICY "public read study-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'study-images');

CREATE POLICY "public delete study-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'study-images');

-- Persist full Q&A review with per-question AI explanations for revisiting past sessions
ALTER TABLE reports ADD COLUMN IF NOT EXISTS all_answers_review JSONB;

-- Save help page AI explanations so students can revisit them
CREATE TABLE IF NOT EXISTS help_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_help_sessions_user_id ON help_sessions(user_id, created_at DESC);
