-- test3 Q11「疑似ステージでのおまじない（制御刺激）は一日に何回するべきでしょう。」
-- 正解: ５回程度でよい (choice_order=1)
-- 誤: ２０回以上 (choice_order=2) → 正: ５回程度でよい (choice_order=1)
UPDATE test_choices SET is_correct = (choice_order = 1)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 3 AND question_order = 11);
