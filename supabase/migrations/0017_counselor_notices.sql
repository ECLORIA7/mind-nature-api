-- カウンセラーからの掲示メッセージ
CREATE TABLE IF NOT EXISTS counselor_notices (
  patient_id UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
