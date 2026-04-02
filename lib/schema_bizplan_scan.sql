-- 창업 공고 스캔 테이블
CREATE TABLE IF NOT EXISTS bizplan_scans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pblanc_id text UNIQUE NOT NULL,
  title text,
  organization text,
  field text,
  deadline text,
  url text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'module_created', 'skipped')),
  module_id text,
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bizplan_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access bizplan_scans" ON bizplan_scans FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE INDEX idx_bizplan_scans_status ON bizplan_scans(status);
