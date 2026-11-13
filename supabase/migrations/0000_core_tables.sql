-- ===== コアテーブル =====

-- 病院・クリニック
CREATE TABLE IF NOT EXISTS hospitals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

-- 組織（病院グループ）
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  hospital_id INTEGER REFERENCES hospitals(id)
);

-- ユーザープロフィール（auth.usersと1対1）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'counselor', 'admin')),
  full_name TEXT NOT NULL DEFAULT '',
  hospital_id INTEGER REFERENCES hospitals(id),
  birth_date DATE,
  phone TEXT
);

-- 患者
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  age INTEGER,
  sex INTEGER NOT NULL DEFAULT 0,
  furigana TEXT,
  nickname TEXT,
  full_name TEXT,
  address TEXT,
  daily_rhythm TEXT,
  interests TEXT,
  profession TEXT,
  work_history TEXT,
  personal_relations TEXT,
  harsh_childhood TEXT,
  criminal_record TEXT,
  other_traumas TEXT,
  supplement TEXT,
  goals TEXT,
  holiday TEXT,
  counselor_supplement TEXT,
  counselor_findings TEXT,
  counselor_history TEXT,
  profile_completed BOOLEAN NOT NULL DEFAULT FALSE
);

-- カウンセラー
CREATE TABLE IF NOT EXISTS counselors (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL DEFAULT 1,
  member_number INTEGER
);

-- 患者とカウンセラーの紐付け
CREATE TABLE IF NOT EXISTS patient_counselors (
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  PRIMARY KEY (patient_id, counselor_id)
);

-- 症状カテゴリー
CREATE TABLE IF NOT EXISTS addictions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  behavior_type TEXT NOT NULL DEFAULT 'other'
);

-- 患者の症状カテゴリー
CREATE TABLE IF NOT EXISTS patient_addictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  addiction_id INTEGER NOT NULL REFERENCES addictions(id),
  behavior_type TEXT NOT NULL DEFAULT 'other',
  UNIQUE(patient_id, addiction_id)
);

-- 患者の症状詳細
CREATE TABLE IF NOT EXISTS patient_symptom_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  addiction_id INTEGER NOT NULL REFERENCES addictions(id),
  details JSONB DEFAULT '{}'::JSONB,
  severity TEXT,
  start_date DATE,
  frequency TEXT,
  difficulties TEXT,
  trouble TEXT,
  methods TEXT,
  goal TEXT,
  supplement TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, addiction_id)
);

-- ToDo
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- カウンセラーとのチャット（掲示板）
CREATE TABLE IF NOT EXISTS bbs_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  poster_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addiction_id INTEGER REFERENCES addictions(id),
  content TEXT NOT NULL,
  sequence_num INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- グループ
CREATE TABLE IF NOT EXISTS client_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id INTEGER REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- グループメンバー
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, patient_id)
);

-- グループメッセージ
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ギャンブル記録
CREATE TABLE IF NOT EXISTS gambling_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  addiction_id INTEGER NOT NULL REFERENCES addictions(id),
  record_date DATE NOT NULL,
  session_time TIME,
  location TEXT,
  trigger TEXT,
  amount_spent INTEGER NOT NULL DEFAULT 0,
  amount_lost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 喫煙記録
CREATE TABLE IF NOT EXISTS smoking_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  addiction_id INTEGER NOT NULL REFERENCES addictions(id),
  record_date DATE NOT NULL,
  smoked_at TIME NOT NULL,
  location TEXT,
  trigger TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 病院を1件追加（MindNature）
INSERT INTO hospitals (id, name) VALUES (1, 'MindNature') ON CONFLICT DO NOTHING;
