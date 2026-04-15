-- MODOO001 모두의 창업 아이디어 심사 신청서 모듈
-- Supabase SQL Editor에서 실행

INSERT INTO modules (id, name, description, category, icon, tags, mode, output_mode, ai_model, max_tokens, temperature, system_prompt, user_prompt_template, additional_inputs, chat_questions, output_formats, default_format, expected_pages, tone, language, required_sections, min_section_length, credit_cost, price_krw, status, uses)
VALUES (
'MODOO001',
'모두의 창업 신청서',
'중소벤처기업부 모두의 창업 아이디어 심사 온라인 신청서 3문항 AI 작성',
'사업계획서',
'🚀',
ARRAY['모두의창업','창업지원','아이디어심사','신청서','중소벤처기업부'],
'bizplan',
'generate',
'claude-sonnet-4-6',
8192,
0.3,

-- system_prompt
'당신은 창업 지원 신청서 작성 전문가입니다. 모두의 창업 아이디어 심사 온라인 신청서 Q2~Q4 답변을 작성합니다.

[모두의 창업 심사 기준]
1. 진정성 — 지원자가 직접 겪은 경험에서 나온 아이디어인가
2. 문제 명확성 — 누가 어떤 고통을 겪는지 구체적으로 정의했는가
3. 차별성 — 기존 해결책과 무엇이 다른가
4. 실현 의지 — 구체적이고 실행 가능한 계획이 있는가

[기존 사업계획서가 제공된 경우]
기존 계획서의 기업명, 아이디어, 수치, 팀 정보를 최대한 활용해서 작성하세요.

[출력 구조 — 반드시 Q2/Q3/Q4 문답 형식으로만 출력. 표나 목록 금지]

## Q2. 아이디어를 떠올린 배경 이야기를 들려주세요.

500~700자. 직접 겪은 불편함/문제 상황 → 기존 방법으로 해결 안 됐던 순간 → 아이디어를 떠올린 계기. 진정성 있는 1인칭 스토리텔링. 자연스러운 문단으로만 작성.

## Q3. 아이디어는 누구의 어떤 문제를 해결해주나요?

500~700자. 타겟 고객 + 그들의 고통 + 기존 해결책의 한계 + 우리 차별점. 자연스러운 문단으로만 작성.

## Q4. 아이디어를 어떻게 실현하고 싶으신가요?

500~700자. 모두의 창업 프로그램 활용 계획 + 지원금/멘토링 활용 방안 + 멘토에게 듣고 싶은 조언 + 최종 목표. 자연스러운 문단으로만 작성.

[작성 원칙]
1. 딱딱한 비즈니스 문체 X — 진정성 있는 1인칭 서술체 ("~했어요", "~하더라고요")
2. 표, ◦/-, 번호 목록 절대 사용 금지 — 문단 형식으로만
3. 각 질문 500~700자 내외
4. 한국어로 작성',

-- user_prompt_template
'[내 정보]
이름: {{representative}}
서비스/아이디어명: {{business_name}}
분야: {{sector}}
한 줄 설명: {{service_desc}}
타겟 고객: {{target_customer}}

[아이디어를 떠올린 배경 경험 — Q2용]
{{idea_background}}

[아이디어 상세 설명 — Q3용]
{{idea}}

[타겟 고객과 해결하는 문제 — Q3용]
{{target_problem}}

[기존 해결책 대비 차별점 — Q3용]
{{differentiator}}

[실현 계획 — Q4용]
{{plan}}

[멘토에게 듣고 싶은 조언 — Q4용]
{{mentor_request}}

위 정보를 바탕으로 모두의 창업 아이디어 심사 신청서 Q2~Q4 답변을 작성해주세요.
- 각 질문 500~700자 내외
- 심사위원이 공감할 수 있는 진정성 있는 내용으로
- 정보가 부족한 부분은 아이디어에 맞게 자연스럽게 보완하되 [확인 필요] 표시',

-- additional_inputs
'[
  {"key":"idea_background","label":"아이디어 배경 경험","type":"textarea","placeholder":"직접 겪은 불편함이나 문제 상황을 구체적으로 써주세요. 언제, 어디서, 어떤 상황이었는지","required":true},
  {"key":"idea","label":"아이디어 설명","type":"textarea","placeholder":"어떤 제품/서비스인지, 어떻게 작동하는지 설명해주세요","required":true},
  {"key":"target_problem","label":"타겟 고객과 해결하는 문제","type":"textarea","placeholder":"누가 대상인지, 그들이 겪는 어떤 문제를 해결하는지","required":true},
  {"key":"differentiator","label":"기존 대비 차별점","type":"textarea","placeholder":"기존 해결책의 한계와 우리 아이디어가 어떻게 다른지","required":false},
  {"key":"plan","label":"실현 계획","type":"textarea","placeholder":"이 프로그램을 통해 어떻게 실현할 것인지 단계별 계획","required":false},
  {"key":"mentor_request","label":"멘토에게 듣고 싶은 조언","type":"text","placeholder":"예: 기술 구현 방법, 시장 진입 전략, 팀 구성 등","required":false}
]',
'[]',
ARRAY['pdf','docx','txt'], 'pdf', '3', '친근한 경어', 'ko',
'["Q2. 아이디어 배경","Q3. 문제 해결","Q4. 실현 계획"]',
500,
0,
4900,
'active',
0
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  user_prompt_template = EXCLUDED.user_prompt_template,
  additional_inputs = EXCLUDED.additional_inputs,
  price_krw = EXCLUDED.price_krw,
  mode = EXCLUDED.mode,
  status = EXCLUDED.status,
  updated_at = NOW();
