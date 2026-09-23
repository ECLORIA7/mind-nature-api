-- test3 Q9「擬似の後の制御刺激（おまじない）について正しいのはどれでしょう。」
-- 正解: 制御刺激をしてもよい (choice_order=2)
-- 誤: 必ず、制御刺激をする (choice_order=0) → 正: してもよい (choice_order=2)
UPDATE test_choices SET is_correct = (choice_order = 2)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 3 AND question_order = 9);
