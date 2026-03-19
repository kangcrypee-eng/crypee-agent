-- crypee Agent v2 Database Schema
-- Run in Supabase SQL Editor

-- 1. 사용자 프로필 (사업자등록증 기반, 전항목 선택)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  business_name TEXT,
  representative TEXT,
  business_number TEXT,
  business_type TEXT,
  opening_date DATE,
  address TEXT,
  sector TEXT,
  item TEXT,
  service_desc TEXT,
  target_customer TEXT,
  track_record TEXT,
  email TEXT,
  phone TEXT,
  credits INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 모듈 정의
CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  icon TEXT DEFAULT '📄',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  mode TEXT NOT NULL CHECK (mode IN ('oneclick', 'form', 'chat')),
  output_mode TEXT DEFAULT 'generate' CHECK (output_mode IN ('generate', 'template')),
  
  -- AI 설정
  ai_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  max_tokens INTEGER DEFAULT 4096,
  temperature NUMERIC(3,2) DEFAULT 0.3,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  
  -- 입력 설정
  additional_inputs JSONB DEFAULT '[]',
  chat_questions JSONB DEFAULT '[]',
  
  -- 출력 설정
  output_formats TEXT[] DEFAULT ARRAY['pdf'],
  default_format TEXT DEFAULT 'pdf',
  output_style TEXT DEFAULT 'formal',
  expected_pages TEXT DEFAULT '1~3',
  tone TEXT DEFAULT 'business',
  language TEXT DEFAULT 'ko',
  
  -- 품질 설정
  required_sections JSONB DEFAULT '[]',
  min_section_length INTEGER DEFAULT 200,
  forbidden_expressions TEXT[] DEFAULT ARRAY[]::TEXT[],
  required_expressions TEXT[] DEFAULT ARRAY[]::TEXT[],
  reference_instruction TEXT,
  
  -- 가격
  credit_cost INTEGER DEFAULT 1,
  estimated_input_tokens INTEGER DEFAULT 1000,
  estimated_output_tokens INTEGER DEFAULT 2000,
  estimated_cost_krw NUMERIC(10,2) DEFAULT 0,
  
  -- 체이닝
  chain_next TEXT[] DEFAULT ARRAY[]::TEXT[],
  chain_labels JSONB DEFAULT '{}',
  
  -- 메타
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
  uses INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  avg_actual_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 모듈 버전 히스토리
CREATE TABLE module_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id TEXT REFERENCES modules(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  ai_model TEXT,
  max_tokens INTEGER,
  temperature NUMERIC(3,2),
  change_note TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 레퍼런스 파일
CREATE TABLE module_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id TEXT REFERENCES modules(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  usage_type TEXT CHECK (usage_type IN ('style', 'structure', 'template')),
  instruction TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 생성 기록
CREATE TABLE generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES modules(id),
  input_data JSONB,
  output_text TEXT,
  output_format TEXT DEFAULT 'pdf',
  credits_used INTEGER DEFAULT 1,
  input_tokens INTEGER,
  output_tokens INTEGER,
  actual_cost_krw NUMERIC(10,2),
  ai_model TEXT,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 크레딧 거래
CREATE TABLE credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'use', 'refund', 'bonus', 'free_regen')),
  description TEXT,
  module_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 사용자 피드백
CREATE TABLE feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  generation_id UUID REFERENCES generations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES modules(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  issue_type TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Rate limiting
CREATE TABLE rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  count INTEGER DEFAULT 1
);

-- 9. 결과물 캐시
CREATE TABLE generation_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id TEXT REFERENCES modules(id),
  input_hash TEXT NOT NULL,
  output_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_cache ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Modules: anyone can read active
CREATE POLICY "Read active modules" ON modules FOR SELECT USING (status = 'active' OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin manages modules" ON modules FOR ALL USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Module versions: admin only
CREATE POLICY "Admin reads versions" ON module_versions FOR SELECT USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin writes versions" ON module_versions FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- References: admin only
CREATE POLICY "Admin manages refs" ON module_references FOR ALL USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Generations: own only
CREATE POLICY "Users read own gens" ON generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert gens" ON generations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credits: own only
CREATE POLICY "Users read own credits" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert credits" ON credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Feedback: own only
CREATE POLICY "Users manage own feedback" ON feedbacks FOR ALL USING (auth.uid() = user_id);

-- Rate limits
CREATE POLICY "Users own rate limits" ON rate_limits FOR ALL USING (auth.uid() = user_id);

-- Cache: read all (module-level cache)
CREATE POLICY "Read cache" ON generation_cache FOR SELECT USING (true);
CREATE POLICY "Insert cache" ON generation_cache FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_gen_user ON generations(user_id);
CREATE INDEX idx_gen_module ON generations(module_id);
CREATE INDEX idx_modules_cat ON modules(category);
CREATE INDEX idx_modules_status ON modules(status);
CREATE INDEX idx_cache_hash ON generation_cache(module_id, input_hash);
CREATE INDEX idx_rate_user ON rate_limits(user_id, action, window_start);
CREATE INDEX idx_feedback_module ON feedbacks(module_id);
CREATE INDEX idx_versions_module ON module_versions(module_id);

-- Storage bucket for references (run separately in Supabase dashboard)
-- Create bucket: module-references (private)
