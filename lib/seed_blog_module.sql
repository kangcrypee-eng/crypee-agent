-- BlogPilot 모듈 등록 (비활성)
-- 모듈 A: 블로그 1편 생성기
INSERT INTO modules (id, name, description, category, icon, tags, mode, output_mode, ai_model, max_tokens, temperature, system_prompt, user_prompt_template, additional_inputs, chat_questions, output_formats, default_format, expected_pages, tone, language, required_sections, min_section_length, credit_cost, estimated_input_tokens, estimated_output_tokens, chain_next, status, uses) VALUES
('BLOG01', '블로그 1편 생성기 (BlogPilot)', '주제와 사진만 올리면 SEO 최적화 블로그 글이 완성됩니다. 티스토리에 바로 붙여넣기.', '마케팅', '✍️', ARRAY['블로그','SEO','티스토리','마케팅','포스팅'], 'blog', 'generate', 'gpt-4o-mini', 4096, 0.7,
'BlogPilot 1회성 블로그 글 생성 모듈. /blog/write 페이지에서 독립 실행.',
'BlogPilot 전용 페이지에서 처리',
'[]', '[]',
ARRAY['html'], 'html', '1', '업종별 자동 선택', 'ko',
'["제목","본문","해시태그"]',
100, 1, 2000, 3000, ARRAY['BLOG02'], 'inactive', 0);

-- 모듈 B: 블로그 정기 포스팅
INSERT INTO modules (id, name, description, category, icon, tags, mode, output_mode, ai_model, max_tokens, temperature, system_prompt, user_prompt_template, additional_inputs, chat_questions, output_formats, default_format, expected_pages, tone, language, required_sections, min_section_length, credit_cost, estimated_input_tokens, estimated_output_tokens, chain_next, status, uses) VALUES
('BLOG02', '블로그 정기 포스팅 (BlogPilot Pro)', '주 3회 자동 블로그 생성 + 티스토리 자동 발행. 사진만 올려두면 AI가 알아서 씁니다.', '마케팅', '🚀', ARRAY['블로그','자동화','SEO','티스토리','정기발행','구독'], 'blog', 'generate', 'gpt-4o-mini', 4096, 0.7,
'BlogPilot Pro 정기 포스팅 모듈. 온보딩 → 사진 대량 업로드 → AI 분류 → 자동 생성 → 자동 발행/메일.',
'BlogPilot Pro 전용 페이지에서 처리',
'[]', '[]',
ARRAY['html'], 'html', '1', '업종별 자동 선택', 'ko',
'["제목","본문","해시태그"]',
100, 0, 2000, 3000, '{}', 'inactive', 0);
