-- 行動記録テーブル（断酒ステータス）
create table if not exists behavior_daily (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  addiction_id integer not null,
  record_date date not null,
  abstained boolean not null default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(patient_id, addiction_id, record_date)
);

-- 飲酒詳細記録テーブル（時間帯別エントリー）
create table if not exists alcohol_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  addiction_id integer not null,
  record_date date not null,
  start_time time not null,
  end_time time,
  location text,
  companions text,
  mood text,
  drinks jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- カスタム選択肢テーブル（ユーザーが入力した選択肢を保存）
create table if not exists behavior_custom_options (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  addiction_id integer not null,
  field_name text not null,
  value text not null,
  use_count integer default 1,
  created_at timestamptz default now(),
  unique(patient_id, addiction_id, field_name, value)
);

-- RLS有効化
alter table behavior_daily enable row level security;
alter table alcohol_entries enable row level security;
alter table behavior_custom_options enable row level security;
