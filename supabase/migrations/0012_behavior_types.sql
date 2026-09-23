-- patient_addictions にカテゴリー列を追加
ALTER TABLE patient_addictions
  ADD COLUMN IF NOT EXISTS behavior_type text DEFAULT 'other'
  CHECK (behavior_type IN ('alcohol', 'smoking', 'gambling', 'other'));

-- 禁煙記録テーブル（1本ずつ記録）
CREATE TABLE IF NOT EXISTS smoking_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addiction_id integer NOT NULL,
  record_date date NOT NULL,
  smoked_at time NOT NULL,
  location text,
  trigger text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ギャンブル記録テーブル（セッションごと）
CREATE TABLE IF NOT EXISTS gambling_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addiction_id integer NOT NULL,
  record_date date NOT NULL,
  session_time time,
  location text,
  trigger text,
  amount_spent integer DEFAULT 0,
  amount_lost integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
