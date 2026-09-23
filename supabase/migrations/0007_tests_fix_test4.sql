-- test4 Q2「反復する問題行動の想像の目的」
-- 正解: 多彩なパターンで多くの刺激を網羅する (choice_order=1)
UPDATE test_choices SET is_correct = (choice_order = 1)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 4 AND question_order = 2);

-- test4 Q11「想像をした後の制御刺激について」
-- 正解: 制御刺激をしてもよい (choice_order=2)
UPDATE test_choices SET is_correct = (choice_order = 2)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 4 AND question_order = 11);

-- test4 Q17「想像をする場所や人数」を削除（16問構成にする）
DELETE FROM test_choices
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 4 AND question_order = 17);

DELETE FROM test_questions
WHERE test_id = 4 AND question_order = 17;
