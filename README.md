# crypee Agent

## 설치
npm install
cp .env.local.example .env.local (키 입력)
npm run dev

## Supabase
1. SQL Editor에서 lib/schema.sql 실행
2. SQL Editor에서 lib/seed_modules.sql 실행
3. Authentication > Providers > Email > Confirm email = OFF

## 어드민
1. 회원가입 후 Supabase Table Editor > profiles > role을 admin으로 변경
2. 새로고침
