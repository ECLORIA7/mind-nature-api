-- addictionsテーブルにbehavior_typeを追加（症状→行動記録モードの自動マッピング）
ALTER TABLE addictions ADD COLUMN IF NOT EXISTS behavior_type text DEFAULT 'other'
  CHECK (behavior_type IN ('alcohol', 'smoking', 'gambling', 'other'));

-- 既存データにbehavior_typeを設定
UPDATE addictions SET behavior_type = 'alcohol'  WHERE name LIKE '%アルコール%';
UPDATE addictions SET behavior_type = 'smoking'  WHERE name LIKE '%タバコ%' OR name LIKE '%ニコチン%' OR name LIKE '%喫煙%';
UPDATE addictions SET behavior_type = 'gambling' WHERE name LIKE '%ギャンブル%';

-- patient_addictionsの既存レコードをaddictionsのbehavior_typeで上書き修正
UPDATE patient_addictions pa
SET behavior_type = a.behavior_type
FROM addictions a
WHERE pa.addiction_id = a.id;
