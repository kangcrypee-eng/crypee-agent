-- BlogPilot 스키마
-- blog_posts: 생성된 블로그 글
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  business_type text NOT NULL,
  topic text NOT NULL,
  brief_content text NOT NULL,
  generated_title text,
  generated_body_html text,
  generated_hashtags text[],
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'done', 'failed')),
  credits_used integer DEFAULT 0,
  is_free boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- blog_photos: 업로드된 사진 메타데이터
CREATE TABLE IF NOT EXISTS blog_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  original_filename text,
  cdn_url text,
  alt_text text,
  vision_description text,
  display_order integer DEFAULT 0,
  width integer,
  height integer,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own blog posts" ON blog_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert blog posts" ON blog_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own blog posts" ON blog_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins full access blog posts" ON blog_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users read own blog photos" ON blog_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert blog photos" ON blog_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins full access blog photos" ON blog_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 인덱스
CREATE INDEX idx_blog_posts_user ON blog_posts(user_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_photos_post ON blog_photos(post_id);

-- Supabase Storage: 대시보드에서 'blog-photos' 버킷을 public으로 생성해주세요
