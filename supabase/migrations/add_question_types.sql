-- Expand allowed question_type values to support harder, more varied question formats.
-- Previously only 'multiple_choice' and 'short_answer' were allowed.

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;

ALTER TABLE questions
  ADD CONSTRAINT questions_question_type_check
  CHECK (question_type IN (
    'multiple_choice',
    'multi_select',
    'true_false',
    'short_answer',
    'fill_blank',
    'ordering'
  ));
