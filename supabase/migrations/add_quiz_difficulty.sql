-- Run this in your Supabase SQL editor
-- Adds admin-controlled quiz difficulty per student
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quiz_difficulty TEXT NOT NULL DEFAULT 'easy'
  CHECK (quiz_difficulty IN ('easy','medium','hard'));
