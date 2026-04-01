-- BlogPilot Pro (모듈 B) 스키마

-- 구독 정보
CREATE TABLE blogpilot_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  business_type text NOT NULL,
  shop_name text NOT NULL,
  shop_phone text,
  shop_address text,
  shop_link text,
  tone text DEFAULT 'friendly',
  delivery_method text DEFAULT 'email' CHECK (delivery_method IN ('email', 'auto_publish')),
  delivery_email text,
  schedule_days integer[] DEFAULT ARRAY[2,4,6],
  plan_type text NOT NULL CHECK (plan_type IN ('monthly', 'semi_annual', 'annual')),
  plan_amount integer NOT NULL,
  billing_key text,
  card_company text,
  card_number text,
  billing_status text DEFAULT 'none' CHECK (billing_status IN ('none','active','failed','cancelled','expired')),
  next_billing_at timestamptz,
  subscription_start_at timestamptz DEFAULT now(),
  subscription_end_at timestamptz,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 사진 풀
CREATE TABLE blogpilot_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES blogpilot_subscriptions(id) ON DELETE CASCADE,
  cdn_url text NOT NULL,
  original_filename text,
  category text NOT NULL DEFAULT 'unclassified',
  category_confirmed boolean DEFAULT false,
  vision_description text,
  last_used_at timestamptz,
  use_count integer DEFAULT 0,
  is_available boolean DEFAULT true,
  width integer,
  height integer,
  created_at timestamptz DEFAULT now()
);

-- 예약 발행 글
CREATE TABLE blogpilot_scheduled_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES blogpilot_subscriptions(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  topic text,
  trend_keyword text,
  angle text,
  generated_title text,
  generated_body_html text,
  generated_hashtags text[],
  photo_ids uuid[],
  status text DEFAULT 'pending' CHECK (status IN ('pending','generating','done','sent','failed')),
  delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','failed')),
  delivered_at timestamptz,
  generation_error text,
  created_at timestamptz DEFAULT now()
);

-- 중복 방지 로그
CREATE TABLE blogpilot_generation_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  main_keyword text,
  angle text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE blogpilot_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogpilot_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogpilot_scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogpilot_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscription" ON blogpilot_subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own photos" ON blogpilot_photos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own posts" ON blogpilot_scheduled_posts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own log" ON blogpilot_generation_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins full blogpilot_subscriptions" ON blogpilot_subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins full blogpilot_photos" ON blogpilot_photos FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins full blogpilot_scheduled_posts" ON blogpilot_scheduled_posts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins full blogpilot_generation_log" ON blogpilot_generation_log FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 인덱스
CREATE INDEX idx_bp_sub_user ON blogpilot_subscriptions(user_id);
CREATE INDEX idx_bp_photos_sub ON blogpilot_photos(subscription_id);
CREATE INDEX idx_bp_photos_category ON blogpilot_photos(category);
CREATE INDEX idx_bp_posts_sub ON blogpilot_scheduled_posts(subscription_id);
CREATE INDEX idx_bp_posts_date ON blogpilot_scheduled_posts(scheduled_date);
CREATE INDEX idx_bp_posts_status ON blogpilot_scheduled_posts(status);
CREATE INDEX idx_bp_log_user ON blogpilot_generation_log(user_id);
