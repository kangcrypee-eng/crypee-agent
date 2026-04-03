"""톡톡 메시지 발송"""

import os
import random
import time
from datetime import datetime, timedelta

from selenium.webdriver.common.by import By

from config import CONFIG
from db import get_db
from scraper import create_driver
from templates import TEMPLATES


def is_send_hour():
    """현재 시간이 발송 가능 시간대인지 확인"""
    hour = datetime.now().hour
    start, end = CONFIG['send_hours']
    return start <= hour < end


def generate_random_schedule(count):
    """오늘 send_hours 범위 내에서 랜덤 발송 시각 생성 (정렬됨)"""
    start_hour, end_hour = CONFIG['send_hours']
    now = datetime.now()

    # 오늘의 발송 가능 시작/끝 시각
    day_start = now.replace(hour=start_hour, minute=0, second=0, microsecond=0)
    day_end = now.replace(hour=end_hour, minute=0, second=0, microsecond=0)

    # 현재 시각이 이미 시작 시각 이후면 now부터 시작
    if now > day_start:
        day_start = now

    if day_start >= day_end:
        return []

    # 범위 내 랜덤 시각 생성
    total_seconds = int((day_end - day_start).total_seconds())
    times = sorted([
        day_start + timedelta(seconds=random.randint(0, total_seconds))
        for _ in range(count)
    ])
    return times


def send_talktalk(driver, shop, template, db, account_id):
    """톡톡 메시지 발송"""
    talktalk_url = shop['talktalk_url']
    if not talktalk_url:
        return False

    try:
        driver.get(talktalk_url)
        time.sleep(random.uniform(2, 4))

        # 메시지 입력창 찾기 (여러 셀렉터 시도)
        input_area = None
        selectors = [
            'textarea',
            '[contenteditable="true"]',
            '.input_area',
            '#chatInput',
            'div[role="textbox"]',
        ]
        for selector in selectors:
            try:
                input_area = driver.find_element(By.CSS_SELECTOR, selector)
                if input_area.is_displayed():
                    break
            except Exception:
                continue

        if not input_area:
            raise Exception("메시지 입력창을 찾을 수 없음")

        # 메시지 변수 치환
        msg = template['text']
        msg = msg.replace('{business_type}', shop['business_type'] or '')
        msg = msg.replace('{name}', shop['name'] or '')

        # 입력
        input_area.click()
        time.sleep(0.5)
        input_area.send_keys(msg)
        time.sleep(random.uniform(0.5, 1))

        # 전송 버튼 (여러 셀렉터 시도)
        send_btn = None
        btn_selectors = [
            'button[type="submit"]',
            '.btn_send',
            '.send_button',
            'button.send',
            'button[class*="send"]',
        ]
        for selector in btn_selectors:
            try:
                send_btn = driver.find_element(By.CSS_SELECTOR, selector)
                if send_btn.is_displayed():
                    break
            except Exception:
                continue

        if not send_btn:
            raise Exception("전송 버튼을 찾을 수 없음")

        send_btn.click()
        time.sleep(1)

        # DB 기록 - 성공
        db.execute(
            "INSERT INTO messages (shop_id, account, template_id, status, sent_at) "
            "VALUES (?, ?, ?, 'sent', datetime('now'))",
            (shop['id'], account_id, template['id'])
        )
        db.commit()
        return True

    except Exception as e:
        # DB 기록 - 실패
        db.execute(
            "INSERT INTO messages (shop_id, account, template_id, status, error) "
            "VALUES (?, ?, ?, 'failed', ?)",
            (shop['id'], account_id, template['id'], str(e))
        )
        db.commit()
        return False


def run_sender(daily_limit=None):
    """메시지 발송 실행"""
    if not is_send_hour():
        start, end = CONFIG['send_hours']
        print(f"현재 시간은 발송 가능 시간이 아닙니다. ({start}시~{end}시만 가능)")
        return

    limit = daily_limit or CONFIG['daily_limit']
    account = CONFIG['account']
    account_id = account['id']
    profile_dir = os.path.expanduser(account['profile_dir'])

    db = get_db()

    # 오늘 이미 발송한 건수 확인
    today_sent = db.execute(
        "SELECT COUNT(*) as cnt FROM messages "
        "WHERE account = ? AND status = 'sent' AND date(sent_at) = date('now')",
        (account_id,)
    ).fetchone()['cnt']

    remaining = limit - today_sent
    if remaining <= 0:
        print(f"오늘 일일 한도({limit}건) 도달. 발송 중단.")
        db.close()
        return

    print(f"\n{'='*50}")
    print(f"계정: {account_id}")
    print(f"오늘 발송: {today_sent}건 / 한도: {limit}건 / 남은: {remaining}건")
    print(f"{'='*50}")

    # 미발송 매장 조회
    resend_days = CONFIG.get('resend_days', 90)
    shops = db.execute("""
        SELECT s.* FROM shops s
        WHERE s.talktalk_url IS NOT NULL
        AND s.id NOT IN (
            SELECT shop_id FROM messages
            WHERE status = 'sent'
            AND sent_at > datetime('now', ?)
        )
        LIMIT ?
    """, (f'-{resend_days} days', remaining)).fetchall()

    if not shops:
        print("발송 대상 매장이 없습니다.")
        db.close()
        return

    print(f"발송 대상: {len(shops)}개 매장")

    # 랜덤 스케줄 생성
    use_random = CONFIG.get('random_schedule', False)
    if use_random:
        schedule = generate_random_schedule(len(shops))
        print(f"랜덤 스케줄 생성 완료:")
        for i, t in enumerate(schedule):
            print(f"  [{i+1}] {t.strftime('%H:%M:%S')}")
        print()
    else:
        schedule = None

    driver = create_driver(profile_dir)

    try:
        sent = 0
        for i, shop in enumerate(shops):
            # 랜덤 스케줄: 해당 시각까지 대기
            if use_random and schedule and i < len(schedule):
                now = datetime.now()
                target_time = schedule[i]
                wait_seconds = (target_time - now).total_seconds()
                if wait_seconds > 0:
                    print(f"  다음 발송 시각: {target_time.strftime('%H:%M:%S')} "
                          f"({wait_seconds:.0f}초 대기)")
                    time.sleep(wait_seconds)
            else:
                # 기존 방식: 랜덤 딜레이
                if i > 0:
                    delay = random.uniform(CONFIG['delay_min'], CONFIG['delay_max'])
                    print(f"  {delay:.0f}초 대기...")
                    time.sleep(delay)

            shop_dict = dict(shop)
            template = random.choice(TEMPLATES)

            if send_talktalk(driver, shop_dict, template, db, account_id):
                sent += 1
                print(f"[{sent}/{len(shops)}] 발송 완료: {shop['name']}")
            else:
                print(f"[!] 발송 실패: {shop['name']}")

        print(f"\n총 {sent}건 발송 완료")

    finally:
        driver.quit()
        db.close()
