-- 組織とチームを名前で紐づける
UPDATE organizations o
SET hospital_id = h.id
FROM hospitals h
WHERE o.name = h.name;
