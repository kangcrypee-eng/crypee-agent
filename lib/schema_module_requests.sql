-- 모듈 문의/요청 테이블
CREATE TABLE IF NOT EXISTS module_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  email text,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'planned', 'completed', 'declined')),
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE module_requests ENABLE ROW LEVEL SECURITY;

-- 누구나 요청 가능 (비로그인도 가능)
CREATE POLICY "Anyone can insert requests" ON module_requests FOR INSERT WITH CHECK (true);
-- 로그인 유저는 자기 요청 볼 수 있음
CREATE POLICY "Users can view own requests" ON module_requests FOR SELECT USING (auth.uid() = user_id);
-- 어드민은 전체 관리
CREATE POLICY "Admins full access" ON module_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE INDEX idx_module_requests_status ON module_requests(status);
