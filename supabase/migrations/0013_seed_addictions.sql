-- addictionsテーブルの初期データ確認と投入
-- まず現在のデータ確認: SELECT * FROM addictions;
-- データが0件の場合、以下を実行してください

INSERT INTO addictions (name, short_name) VALUES
  ('アルコール', 'アルコール'),
  ('ニコチン（喫煙）', '喫煙'),
  ('ギャンブル', 'ギャンブル'),
  ('ゲーム・インターネット', 'ゲーム'),
  ('薬物', '薬物'),
  ('買い物・浪費', '買い物'),
  ('食べ物', '食べ物')
ON CONFLICT DO NOTHING;
