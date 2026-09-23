-- ===== テスト正解データ修正 =====
-- PHPの元ファイル（test1-5.txt）と照合して誤りを修正

-- test1 Q14「条件反射制御法（CRCT）が働きかける神経活動は次のどれでしょう（複数）」
-- 正解: 先天的反射連鎖(choice_order=0) + 後天的反射連鎖(choice_order=1)
-- 誤: 後天的反射連鎖+第二信号系反射網 → 正: 先天的反射連鎖+後天的反射連鎖
UPDATE test_choices SET is_correct = (choice_order IN (0, 1))
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 1 AND question_order = 14);

-- test1 Q15「CRCTと反復する問題行動の関係で正しいものは」
-- 正解: CRCTは欲求を抑制するので...完治する (choice_order=0)
-- 誤: 「治癒はない」(choice_order=2) → 正: 「完治する」(choice_order=0)
UPDATE test_choices SET is_correct = (choice_order = 0)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 1 AND question_order = 15);

-- test2 Q7「制御刺激を行なって数分後に誘われたらどうしますか」
-- 正解: 制御刺激の動作はしない、〇〇がやれないことを確認する (choice_order=1)
UPDATE test_choices SET is_correct = (choice_order = 1)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 2 AND question_order = 7);

-- test3 Q8「擬似と次の擬似の時間間隔についての注意事項」
-- 正解: 時間間隔は取らなくてよい (choice_order=0)
-- ※疑似は1日20回以上のため間隔不要
UPDATE test_choices SET is_correct = (choice_order = 0)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 3 AND question_order = 8);

-- test4 Q10「想像と次の想像の時間間隔についての注意事項」
-- 正解: 時間間隔は取らなくて良い (choice_order=0)
UPDATE test_choices SET is_correct = (choice_order = 0)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 4 AND question_order = 10);

-- test4 Q13「想像ステージでの制御刺激は一日何回すべきでしょう」
-- 正解: ５回程度で良い (choice_order=1)
UPDATE test_choices SET is_correct = (choice_order = 1)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 4 AND question_order = 13);

-- test4 Q16「想像ステージで擬似は一日何回するべきでしょう」
-- 正解: 2回程度でよい (choice_order=0)
UPDATE test_choices SET is_correct = (choice_order = 0)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 4 AND question_order = 16);

-- test5 Q4「この先の維持作業について」
-- 正解: 全員が毎日行う (choice_order=1)
UPDATE test_choices SET is_correct = (choice_order = 1)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 5 AND question_order = 4);

-- test5 Q6「擬似はどのくらいの頻度で行うべきでしょうか」（維持ステージ）
-- 正解: 毎日2回以上 (choice_order=0)
UPDATE test_choices SET is_correct = (choice_order = 0)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 5 AND question_order = 6);

-- test5 Q7「想像はどのくらいの頻度で行うべきでしょうか」（維持ステージ）
-- 正解: 毎日2回以上 (choice_order=0)
UPDATE test_choices SET is_correct = (choice_order = 0)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 5 AND question_order = 7);

-- test5 Q9「現在、おまじない（制御刺激）はどのように働くでしょう」
-- PHPファイルでは選択肢は3つ、正解は「強く動かす」(choice_order=1)
-- SQLで余分な4つ目の選択肢が追加されていたため削除し正解を修正
DELETE FROM test_choices
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 5 AND question_order = 9)
  AND choice_order = 3;
UPDATE test_choices SET is_correct = (choice_order = 1)
WHERE question_id = (SELECT id FROM test_questions WHERE test_id = 5 AND question_order = 9);
