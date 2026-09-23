-- カウンセラープロフィール項目追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- 所属内ID番号（所属チームごとの連番）
ALTER TABLE counselors ADD COLUMN IF NOT EXISTS member_number integer;
