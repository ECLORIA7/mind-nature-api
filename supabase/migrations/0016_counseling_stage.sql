-- カウンセリングプログラムにステージ管理を追加
ALTER TABLE counseling_programs
  ADD COLUMN IF NOT EXISTS stage VARCHAR NOT NULL DEFAULT '制御';
