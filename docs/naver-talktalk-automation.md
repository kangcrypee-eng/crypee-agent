# 네이버 톡톡 자동 영업 시스템

## 개요
네이버 플레이스에서 업종별 매장 목록을 수집하고, 톡톡 메시지를 자동 발송하는 시스템.

---

## 아키텍처

```
[1. 매장 수집] Selenium → 네이버 플레이스 검색 → 매장명/톡톡ID 저장
[2. 메시지 발송] Selenium → 톡톡 채팅 → 메시지 자동 입력 → 전송
[3. 결과 관리] SQLite DB → 발송 이력/중복 방지/통계
```

---

## 1단계: 매장 목록 수집

### 수집 대상
- 네이버 플레이스 검색: `{지역} {업종}` (예: "강남구 미용실")
- 수집 항목: 매장명, 주소, 전화번호, 톡톡 링크, 플레이스 URL

### 코드 구조

```python
# scraper.py
from selenium import webdriver
from selenium.webdriver.common.by import By
import json, time, random, sqlite3

BUSINESS_TYPES = ['미용실', '카페', '음식점', '네일샵', '필라테스', '병원', '학원']
REGIONS = ['강남구', '서초구', '마포구', '성동구', '송파구', '영등포구']  # 확장 가능

def search_places(driver, region, business_type, db):
    """네이버 플레이스에서 매장 검색 + 수집"""
    query = f"{region} {business_type}"
    driver.get(f"https://map.naver.com/p/search/{query}")
    time.sleep(3)

    # 검색 결과 스크롤 + 매장 정보 추출
    # iframe 전환 필요: searchIframe
    driver.switch_to.frame("searchIframe")

    shops = []
    items = driver.find_elements(By.CSS_SELECTOR, '.CHC5F a.tzwk0')  # 매장 링크

    for item in items:
        name = item.text
        href = item.get_attribute('href')
        place_id = extract_place_id(href)  # URL에서 플레이스 ID 추출

        # 중복 체크
        if not db_exists(db, place_id):
            shops.append({
                'name': name,
                'place_id': place_id,
                'region': region,
                'business_type': business_type,
                'url': href,
            })

    driver.switch_to.default_content()
    return shops

def get_shop_detail(driver, place_url):
    """매장 상세 정보 (톡톡 링크, 전화번호 등)"""
    driver.get(place_url)
    time.sleep(2)

    detail = {}
    try:
        # 전화번호
        phone_el = driver.find_element(By.CSS_SELECTOR, '.xlx7Q')
        detail['phone'] = phone_el.text
    except: pass

    try:
        # 톡톡 채팅 버튼
        talktalk_btn = driver.find_element(By.CSS_SELECTOR, 'a[href*="talk.naver.com"]')
        detail['talktalk_url'] = talktalk_btn.get_attribute('href')
    except: pass

    return detail
```

### DB 스키마 (SQLite)

```sql
CREATE TABLE shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    place_id TEXT UNIQUE,
    name TEXT,
    region TEXT,
    business_type TEXT,
    phone TEXT,
    talktalk_url TEXT,
    place_url TEXT,
    collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER REFERENCES shops(id),
    account TEXT,          -- 발송 계정
    template_id INTEGER,   -- 사용된 템플릿
    status TEXT DEFAULT 'pending',  -- pending/sent/failed/blocked
    sent_at DATETIME,
    error TEXT
);

CREATE INDEX idx_shops_type ON shops(business_type);
CREATE INDEX idx_shops_region ON shops(region);
CREATE INDEX idx_messages_status ON messages(status);
```

---

## 2단계: 톡톡 메시지 발송

### 메시지 템플릿 (5종 랜덤)

```python
TEMPLATES = [
    {
        "id": 1,
        "text": "안녕하세요 사장님! 😊\n블로그 글을 AI로 자동 작성해주는 서비스를 소개드려요.\n사진만 올리면 SEO 최적화 블로그 글이 완성됩니다.\n첫 1편 무료 체험 가능해요!\n👉 https://crypee.biz/blog/write"
    },
    {
        "id": 2,
        "text": "사장님 안녕하세요~\n혹시 블로그 운영하고 계신가요?\n사진 몇 장만 올리면 AI가 블로그 글을 자동으로 써드리는 서비스가 있어요 ✨\n무료로 한번 체험해보세요!\n👉 https://crypee.biz/blog/write"
    },
    {
        "id": 3,
        "text": "안녕하세요! 😊\n{business_type} 사장님들을 위한 블로그 자동 작성 서비스를 안내드려요.\n주제와 사진만 올리면 2,500자 이상의 SEO 최적화 글이 완성됩니다.\n무료 체험 → https://crypee.biz/blog/write"
    },
    {
        "id": 4,
        "text": "사장님 안녕하세요~\n블로그 글 쓸 시간이 없으시죠? 😅\nAI가 {business_type} 맞춤 블로그 글을 자동으로 작성해드려요.\n첫 1편 무료! 한번 써보세요 ✨\n👉 https://crypee.biz/blog/write"
    },
    {
        "id": 5,
        "text": "안녕하세요 사장님!\n{name} 블로그 운영에 도움이 될 서비스를 소개드려요.\nAI가 사진을 분석해서 블로그 글을 자동으로 작성합니다.\n무료 체험 가능해요 😊\n👉 https://crypee.biz/blog/write"
    },
]
```

### 발송 로직

```python
# sender.py
import random, time

def send_talktalk(driver, shop, template, db):
    """톡톡 메시지 발송"""
    if not shop.get('talktalk_url'):
        return False

    try:
        driver.get(shop['talktalk_url'])
        time.sleep(random.uniform(2, 4))

        # 메시지 입력창 찾기
        input_area = driver.find_element(By.CSS_SELECTOR,
            'textarea, [contenteditable="true"], .input_area')

        # 메시지 변수 치환
        msg = template['text']
        msg = msg.replace('{business_type}', shop.get('business_type', ''))
        msg = msg.replace('{name}', shop.get('name', ''))

        # 입력
        input_area.click()
        time.sleep(0.5)
        input_area.send_keys(msg)
        time.sleep(random.uniform(0.5, 1))

        # 전송 버튼
        send_btn = driver.find_element(By.CSS_SELECTOR,
            'button[type="submit"], .btn_send, .send_button')
        send_btn.click()

        # DB 기록
        db.execute(
            "INSERT INTO messages (shop_id, account, template_id, status, sent_at) VALUES (?, ?, ?, 'sent', datetime('now'))",
            (shop['id'], driver.current_account, template['id'])
        )
        db.commit()

        return True
    except Exception as e:
        db.execute(
            "INSERT INTO messages (shop_id, account, template_id, status, error) VALUES (?, ?, ?, 'failed', ?)",
            (shop['id'], driver.current_account, template['id'], str(e))
        )
        db.commit()
        return False


def run_sender(accounts, daily_limit=50):
    """계정별 발송 실행"""
    db = sqlite3.connect('marketing.db')

    for account in accounts:
        driver = create_driver_with_profile(account['profile_dir'])
        driver.current_account = account['id']

        # 미발송 매장 조회
        shops = db.execute("""
            SELECT s.* FROM shops s
            WHERE s.talktalk_url IS NOT NULL
            AND s.id NOT IN (SELECT shop_id FROM messages WHERE status='sent')
            LIMIT ?
        """, (daily_limit,)).fetchall()

        sent = 0
        for shop in shops:
            template = random.choice(TEMPLATES)

            if send_talktalk(driver, shop, template, db):
                sent += 1
                print(f"[{account['id']}] ✅ {shop['name']} 발송 완료 ({sent}/{daily_limit})")
            else:
                print(f"[{account['id']}] ❌ {shop['name']} 발송 실패")

            # 랜덤 딜레이 (30초 ~ 2분)
            delay = random.uniform(30, 120)
            print(f"  ⏱️ {delay:.0f}초 대기...")
            time.sleep(delay)

            if sent >= daily_limit:
                break

        driver.quit()
        print(f"\n[{account['id']}] 총 {sent}건 발송 완료\n")

    db.close()
```

---

## 3단계: 리스크 관리

### 설정값

```python
CONFIG = {
    # 속도 제한
    'delay_min': 30,          # 최소 대기 (초)
    'delay_max': 120,         # 최대 대기 (초)
    'daily_limit': 50,        # 계정당 일일 한도

    # 계정 로테이션
    'accounts': [
        {'id': 'account1', 'profile_dir': '~/.chrome-profiles/account1'},
        {'id': 'account2', 'profile_dir': '~/.chrome-profiles/account2'},
        {'id': 'account3', 'profile_dir': '~/.chrome-profiles/account3'},
    ],

    # 발송 시간대 (영업시간만)
    'send_hours': (10, 18),

    # 메시지 변형
    'template_count': 5,

    # 중복 방지
    'resend_days': 90,        # 같은 매장 재발송 금지 기간
}
```

### Chrome 프로필 설정 (계정별)

```bash
# 각 계정별 Chrome 프로필 생성
mkdir -p ~/.chrome-profiles/account1
mkdir -p ~/.chrome-profiles/account2
mkdir -p ~/.chrome-profiles/account3

# 각 프로필에서 수동으로 네이버 로그인 (최초 1회)
# Chrome 닫고 → Selenium으로 해당 프로필 사용
```

---

## 4단계: 실행 스크립트

### 전체 파이프라인

```python
# main.py
import argparse
from scraper import search_and_collect
from sender import run_sender
from config import CONFIG

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=['scrape', 'send', 'stats'], required=True)
    parser.add_argument('--region', default='강남구')
    parser.add_argument('--type', default='미용실')
    args = parser.parse_args()

    if args.mode == 'scrape':
        # 매장 수집
        search_and_collect(args.region, args.type)

    elif args.mode == 'send':
        # 메시지 발송
        run_sender(CONFIG['accounts'], CONFIG['daily_limit'])

    elif args.mode == 'stats':
        # 통계
        show_stats()

if __name__ == '__main__':
    main()
```

### 실행 명령어

```bash
# 1. 매장 수집
python main.py --mode scrape --region 강남구 --type 미용실
python main.py --mode scrape --region 서초구 --type 카페

# 2. 메시지 발송 (일일 1회)
python main.py --mode send

# 3. 통계 확인
python main.py --mode stats
```

---

## 5단계: 통계/모니터링

```python
def show_stats():
    db = sqlite3.connect('marketing.db')

    print("=== 매장 수집 현황 ===")
    for row in db.execute("SELECT business_type, COUNT(*) FROM shops GROUP BY business_type"):
        print(f"  {row[0]}: {row[1]}개")

    print("\n=== 발송 현황 ===")
    for row in db.execute("SELECT status, COUNT(*) FROM messages GROUP BY status"):
        print(f"  {row[0]}: {row[1]}건")

    print("\n=== 계정별 현황 ===")
    for row in db.execute("SELECT account, COUNT(*) FROM messages WHERE status='sent' GROUP BY account"):
        print(f"  {row[0]}: {row[1]}건")

    print("\n=== 오늘 발송 ===")
    for row in db.execute("SELECT account, COUNT(*) FROM messages WHERE status='sent' AND date(sent_at)=date('now') GROUP BY account"):
        print(f"  {row[0]}: {row[1]}건")

    db.close()
```

---

## 파일 구조

```
naver-marketing/
├── main.py              # 실행 진입점
├── config.py            # 설정값
├── scraper.py           # 매장 수집
├── sender.py            # 톡톡 발송
├── templates.py         # 메시지 템플릿
├── db.py                # DB 초기화/유틸
├── stats.py             # 통계
├── marketing.db         # SQLite DB (자동 생성)
└── requirements.txt     # selenium, webdriver-manager
```

### requirements.txt
```
selenium>=4.40.0
webdriver-manager>=4.0.0
```

---

## 주의사항

1. **계정 정지 대응**: 정지되면 새 계정으로 교체. 핵심 계정은 사용하지 말 것
2. **일일 한도 엄수**: 계정당 50건 초과 금지
3. **영업시간만 발송**: 밤에 보내면 신고 확률 높아짐
4. **메시지 퀄리티**: 스팸처럼 보이면 안 됨. 진짜 도움이 되는 내용으로
5. **차단 모니터링**: 차단 비율이 10% 넘으면 메시지 수정
