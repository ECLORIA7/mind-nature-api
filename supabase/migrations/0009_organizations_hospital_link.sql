-- 組織とチーム（hospital）を紐付ける
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hospital_id integer REFERENCES hospitals(id) ON DELETE SET NULL;
