-- crypee Agent: 크레딧 → 원화 직접결제 마이그레이션
-- Supabase SQL Editor에서 실행

-- 1. modules에 price_krw 추가
ALTER TABLE modules ADD COLUMN IF NOT EXISTS price_krw INTEGER DEFAULT 0;

-- 기존 credit_cost 기반 가격 매핑
UPDATE modules SET price_krw = credit_cost * 990 WHERE price_krw = 0 OR price_krw IS NULL;

-- mode 제약조건 확장 (alert 추가)
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_mode_check;
ALTER TABLE modules ADD CONSTRAINT modules_mode_check CHECK (mode IN ('oneclick', 'form', 'chat', 'alert', 'bizplan'));

-- output_mode 제약조건 확장 (automation 추가)
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_output_mode_check;
ALTER TABLE modules ADD CONSTRAINT modules_output_mode_check CHECK (output_mode IN ('generate', 'template', 'automation'));

-- 2. payments 테이블 생성
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES modules(id),
  generation_id UUID,
  order_id TEXT UNIQUE NOT NULL,
  payment_key TEXT,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'failed')),
  refund_amount INTEGER DEFAULT 0,
  refund_reason TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON payments FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- 3. 공고 알림 테이블
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_type TEXT DEFAULT 'gov_support',
  filters JSONB NOT NULL DEFAULT '{}',
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly')),
  schedule_hour INTEGER NOT NULL DEFAULT 9,
  schedule_day INTEGER,
  phone TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  matched_count INTEGER DEFAULT 0,
  matched_items JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'no_match'))
);

ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own alert subs" ON alert_subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own alert logs" ON alert_logs FOR ALL USING (auth.uid() = user_id);

-- 4. 기존 컬럼
ALTER TABLE modules ADD COLUMN IF NOT EXISTS sample_output TEXT;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS regen_count INTEGER DEFAULT 0;

-- 4.5. 정기결제 컬럼 추가 (alert_subscriptions)
ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS billing_key TEXT;
ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS card_company TEXT;
ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS card_number TEXT;
ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ;
ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'none' CHECK (billing_status IN ('none', 'active', 'failed', 'cancelled'));

-- 5. 정부지원사업 공고 알림 모듈 등록
INSERT INTO modules (id, name, description, category, icon, tags, mode, output_mode, ai_model, max_tokens, temperature, system_prompt, user_prompt_template, credit_cost, price_krw, status, uses)
VALUES (
  'M100',
  '정부지원사업 공고 알림',
  '조건에 맞는 공고가 올라오면 카카오톡으로 알림',
  '운영/관리',
  '🔔',
  ARRAY['정부지원','공고','알림','자동화'],
  'alert',
  'automation',
  'claude-haiku-4-5',
  1024,
  0.0,
  '정부지원사업 공고 자동 알림 모듈',
  '알림 설정 페이지에서 필터를 설정하세요.',
  0,
  990,
  'active',
  0
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  mode = EXCLUDED.mode,
  output_mode = EXCLUDED.output_mode,
  price_krw = EXCLUDED.price_krw,
  status = EXCLUDED.status,
  updated_at = NOW();
