-- Run this in your Supabase SQL editor
-- Adds preschool (KG) mode flag for very young kids (~4yr olds)
-- When true, the app routes the user through /preschool/* with simpler
-- AI-generated questions and no textbook/description flow.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_preschool BOOLEAN NOT NULL DEFAULT FALSE;
