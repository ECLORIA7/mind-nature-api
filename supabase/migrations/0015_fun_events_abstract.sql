-- カウンセリングプログラム開始日管理
CREATE TABLE IF NOT EXISTS counseling_programs (
  patient_id UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 良かったことの簡単書き出し（50話）
CREATE TABLE IF NOT EXISTS fun_events_abstract (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  entry_num INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, entry_num)
);
