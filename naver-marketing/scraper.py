"""네이버 플레이스 매장 수집 - JSON 파싱 방식"""

import json
import re
import time
import random

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

from db import get_db, db_exists, insert_shop

BUSINESS_TYPES = ['미용실', '카페', '음식점', '네일샵', '필라테스', '병원', '학원', '부동산']

# 전국 주요 시/구/군
REGIONS = [
    # 서울
    '강남구', '서초구', '마포구', '성동구', '송파구', '영등포구',
    '강서구', '양천구', '구로구', '관악구', '동작구', '용산구',
    '중구', '종로구', '성북구', '강북구', '도봉구', '노원구',
    '중랑구', '광진구', '동대문구', '서대문구', '은평구', '금천구',
    # 경기
    '수원시', '성남시', '고양시', '용인시', '부천시', '안산시',
    '안양시', '남양주시', '화성시', '평택시', '의정부시', '시흥시',
    '파주시', '광명시', '김포시', '군포시', '광주시', '이천시',
    '양주시', '오산시', '구리시', '안성시', '포천시', '의왕시',
    '하남시', '여주시', '동두천시', '과천시',
    # 인천
    '인천 남동구', '인천 부평구', '인천 서구', '인천 연수구', '인천 중구', '인천 미추홀구',
    # 부산
    '부산 해운대구', '부산 부산진구', '부산 동래구', '부산 남구', '부산 사하구',
    '부산 북구', '부산 금정구', '부산 연제구', '부산 사상구', '부산 수영구',
    # 대구
    '대구 수성구', '대구 달서구', '대구 북구', '대구 중구', '대구 동구',
    # 대전
    '대전 유성구', '대전 서구', '대전 중구', '대전 대덕구', '대전 동구',
    # 광주
    '광주 서구', '광주 북구', '광주 남구', '광주 광산구', '광주 동구',
    # 울산
    '울산 남구', '울산 중구', '울산 북구', '울산 울주군',
    # 세종
    '세종시',
    # 강원
    '춘천시', '원주시', '강릉시', '속초시',
    # 충북
    '청주시', '충주시', '제천시',
    # 충남
    '천안시', '아산시', '서산시', '당진시',
    # 전북
    '전주시', '익산시', '군산시',
    # 전남
    '여수시', '순천시', '목포시', '광양시',
    # 경북
    '포항시', '구미시', '경주시', '안동시', '김천시',
    # 경남
    '창원시', '김해시', '진주시', '양산시', '거제시', '통영시',
    # 제주
    '제주시', '서귀포시',
]


def create_driver(profile_dir=None):
    """Chrome WebDriver 생성"""
    options = Options()
    if profile_dir:
        options.add_argument(f"--user-data-dir={profile_dir}")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    })
    return driver


def parse_shops_from_html(html, region, business_type):
    """HTML 페이지 소스에서 JSON 데이터를 파싱하여 매장 정보 추출"""
    shops = []
    seen_ids = set()

    # Apollo cache 형태: "id":"숫자","apolloCacheId":...,"name":"매장명" 블록 기준으로 분할
    # 각 블록에서 개별 필드 추출
    blocks = re.split(r'"id":"(\d{6,})"', html)

    # blocks: [앞부분, id1, 내용1, id2, 내용2, ...]
    for i in range(1, len(blocks) - 1, 2):
        place_id = blocks[i]
        block = blocks[i + 1]

        # 블록이 너무 길면 다음 id 전까지만 (최대 3000자)
        block = block[:3000]

        if place_id in seen_ids:
            continue

        # name 추출
        name_match = re.search(r'"name":"([^"]+)"', block)
        if not name_match:
            continue
        name = name_match.group(1)

        # apolloCacheId 확인 - 매장 데이터인지 검증
        if '"apolloCacheId"' not in block:
            continue

        seen_ids.add(place_id)

        # phone 추출
        phone = None
        phone_match = re.search(r'"phone":"([^"]*)"', block)
        if phone_match:
            phone = phone_match.group(1)
        else:
            vphone_match = re.search(r'"virtualPhone":"([^"]*)"', block)
            if vphone_match:
                phone = vphone_match.group(1)

        # talktalkUrl 추출
        talktalk_url = None
        talk_match = re.search(r'"talktalkUrl":"([^"]*)"', block)
        if talk_match:
            talktalk_url = talk_match.group(1).replace('\\u002F', '/')

        shops.append({
            'place_id': place_id,
            'name': name,
            'region': region,
            'business_type': business_type,
            'phone': phone,
            'talktalk_url': talktalk_url,
            'place_url': f"https://map.naver.com/p/entry/place/{place_id}",
        })

    return shops


def scroll_and_load(driver, scroll_count=5):
    """검색 결과 스크롤하여 더 많은 매장 로드"""
    for i in range(scroll_count):
        driver.execute_script(
            "window.scrollTo(0, document.body.scrollHeight)"
        )
        time.sleep(random.uniform(1.5, 2.5))

    # 페이지 넘기기 시도 (2페이지, 3페이지...)
    for page in range(2, 6):
        try:
            next_btn = driver.find_element(
                By.CSS_SELECTOR, f'a[data-page="{page}"], button[data-page="{page}"]'
            )
            if next_btn:
                next_btn.click()
                time.sleep(random.uniform(2, 4))
                for _ in range(3):
                    driver.execute_script(
                        "window.scrollTo(0, document.body.scrollHeight)"
                    )
                    time.sleep(random.uniform(1, 2))
        except Exception:
            break


def search_places(driver, region, business_type, db):
    """네이버 플레이스에서 매장 검색 + 수집"""
    query = f"{region} {business_type}"
    url = f"https://map.naver.com/p/search/{query}"
    driver.get(url)
    time.sleep(5)

    # searchIframe으로 전환 시도
    switched = False
    try:
        # 이름 없는 iframe (place list iframe) 찾기
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        for iframe in iframes:
            src = iframe.get_attribute("src") or ""
            if "place/list" in src or "search" in src.lower():
                driver.switch_to.frame(iframe)
                switched = True
                break

        if not switched:
            # searchIframe 이름으로 시도
            try:
                WebDriverWait(driver, 5).until(
                    EC.frame_to_be_available_and_switch_to_it("searchIframe")
                )
                switched = True
            except Exception:
                pass
    except Exception:
        pass

    if not switched:
        print(f"  iframe 전환 실패, 메인 페이지에서 시도: {query}")

    # 스크롤하여 더 로드
    try:
        scroll_and_load(driver)
    except Exception:
        pass

    # HTML에서 JSON 파싱
    html = driver.page_source
    shops = parse_shops_from_html(html, region, business_type)

    if switched:
        driver.switch_to.default_content()

    # 중복 제거
    new_shops = [s for s in shops if not db_exists(db, s['place_id'])]
    return new_shops


def is_region_collected(db, region, business_type):
    """해당 지역+업종이 이미 수집되었는지 확인"""
    row = db.execute(
        "SELECT COUNT(*) as cnt FROM shops WHERE region = ? AND business_type = ?",
        (region, business_type)
    ).fetchone()
    return row['cnt'] > 0


def search_and_collect(region, business_type, skip_existing=True):
    """매장 수집 전체 파이프라인"""
    db = get_db()

    if skip_existing and is_region_collected(db, region, business_type):
        count = db.execute(
            "SELECT COUNT(*) as cnt FROM shops WHERE region = ? AND business_type = ?",
            (region, business_type)
        ).fetchone()['cnt']
        print(f"\n[SKIP] {region} {business_type} - 이미 {count}개 수집됨")
        db.close()
        return

    print(f"\n{'='*50}")
    print(f"수집 시작: {region} {business_type}")
    print(f"{'='*50}")

    driver = create_driver()

    try:
        shops = search_places(driver, region, business_type, db)
        print(f"\n검색 결과: {len(shops)}개 신규 매장 발견")

        collected = 0
        talktalk_count = 0
        for shop in shops:
            if insert_shop(db, shop):
                collected += 1
                has_talktalk = "톡톡 O" if shop.get('talktalk_url') else "톡톡 X"
                if shop.get('talktalk_url'):
                    talktalk_count += 1
                print(f"  [{collected}] {shop['name']} ({has_talktalk})")

        print(f"\n수집 완료: {collected}개 저장 (톡톡 가능: {talktalk_count}개)")

    finally:
        driver.quit()
        db.close()
