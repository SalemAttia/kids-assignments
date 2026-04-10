-- AI model settings (singleton row for global config)
CREATE TABLE IF NOT EXISTS ai_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  reasoning_model TEXT NOT NULL DEFAULT 'gpt-4.1',
  fast_model TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ai_settings (id, reasoning_model, fast_model)
VALUES ('global', 'gpt-4.1', 'gpt-4.1-mini')
ON CONFLICT (id) DO NOTHING;
