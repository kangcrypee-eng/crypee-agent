#!/usr/bin/env python3
"""
네이버 블로그 자동 포스팅 (로그인 된 상태에서 실행)
사용법: python3 scripts/naver-blog-post.py --json scripts/test-post.json

⚠️ 실행 전 Chrome을 완전히 종료해주세요
"""

import argparse
import time
import json
import sys
import os
import random

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


def human_delay(min_s=0.5, max_s=1.5):
    time.sleep(random.uniform(min_s, max_s))


def create_driver():
    """기존 Chrome 프로필 직접 사용 (⚠️ Chrome을 먼저 종료해야 함)"""
    options = Options()
    chrome_profile = os.path.expanduser('~/Library/Application Support/Google/Chrome')
    options.add_argument(f'--user-data-dir={chrome_profile}')
    options.add_argument('--profile-directory=Default')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option('excludeSwitches', ['enable-automation'])
    options.add_experimental_option('useAutomationExtension', False)

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': 'Object.defineProperty(navigator, "webdriver", {get: () => undefined})'
    })
    return driver


def post_to_blog(driver, title, html_content):
    """네이버 블로그에 글 발행"""
    print("[1/3] 블로그 에디터 열기...")
    driver.get('https://blog.naver.com/GoBlogWrite.naver')
    human_delay(4, 6)

    wait = WebDriverWait(driver, 20)

    print("[2/3] 제목 + 본문 입력 중...")

    # 제목 입력
    try:
        title_area = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.se-title-text')))
        title_area.click()
        human_delay(0.3, 0.5)
        title_area.send_keys(title)
        print(f"  ✅ 제목 입력 완료: {title[:30]}...")
    except Exception as e:
        print(f"  ⚠️ 제목 입력 실패: {e}")

    human_delay(1, 2)

    # 본문 영역에 HTML 주입
    try:
        body_area = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.se-component-content')))
        body_area.click()
        human_delay(0.5, 1)

        driver.execute_script("""
            const editor = document.querySelector('.se-main-container .se-component-content')
                || document.querySelector('[contenteditable="true"]')
                || document.querySelector('.se-content');
            if (editor) {
                editor.innerHTML = arguments[0];
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                editor.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
            return false;
        """, html_content)
        print(f"  ✅ 본문 입력 완료 ({len(html_content)}자)")
    except Exception as e:
        print(f"  ⚠️ HTML 주입 실패, 텍스트 모드 시도: {e}")
        try:
            import re
            body = driver.find_element(By.CSS_SELECTOR, '[contenteditable="true"]')
            body.click()
            plain = re.sub(r'<[^>]+>', '\n', html_content)
            plain = re.sub(r'\n{3,}', '\n\n', plain).strip()
            body.send_keys(plain)
            print(f"  ✅ 텍스트 모드 입력 완료")
        except Exception as e2:
            print(f"  ❌ 본문 입력 실패: {e2}")
            return False

    human_delay(2, 3)

    print("[3/3] 발행...")
    try:
        publish_btn = wait.until(EC.element_to_be_clickable((
            By.CSS_SELECTOR, '.publish_btn__m9KHH, .se-publish-btn, button[data-testid="publish-btn"]'
        )))
        publish_btn.click()
        human_delay(2, 3)

        # 확인 버튼
        try:
            confirm_btn = driver.find_element(By.CSS_SELECTOR, '.confirm_btn, .se-popup-button-confirm')
            confirm_btn.click()
        except:
            pass

        human_delay(3, 5)
        print(f"✅ 발행 완료! URL: {driver.current_url}")
        return True
    except Exception as e:
        print(f"⚠️ 자동 발행 실패: {e}")
        print("브라우저에서 직접 발행 버튼을 눌러주세요.")
        input("발행 완료 후 Enter...")
        return True


def main():
    parser = argparse.ArgumentParser(description='네이버 블로그 자동 포스팅 (로그인 상태)')
    parser.add_argument('--title', help='블로그 제목')
    parser.add_argument('--html', help='HTML 본문')
    parser.add_argument('--file', help='HTML 파일 경로')
    parser.add_argument('--json', help='JSON 파일 (title + html)')
    args = parser.parse_args()

    title = args.title or ''
    html_content = args.html or ''

    if args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            html_content = f.read()
    if args.json:
        with open(args.json, 'r', encoding='utf-8') as f:
            data = json.load(f)
            title = data.get('title', title)
            html_content = data.get('html', html_content)

    if not title or not html_content:
        print("❌ --title + --html 또는 --json 또는 --file 필요")
        sys.exit(1)

    print(f"📝 제목: {title}")
    print(f"📄 본문: {len(html_content)}자")
    print(f"\n⚠️  Chrome을 Cmd+Q로 완전히 종료한 후 Enter를 눌러주세요")
    input("준비되면 Enter...")

    driver = create_driver()
    try:
        success = post_to_blog(driver, title, html_content)
        if success:
            print("\n🎉 네이버 블로그 포스팅 완료!")
        else:
            print("\n❌ 포스팅 실패")
    except Exception as e:
        print(f"\n❌ 오류: {e}")
    finally:
        input("\nEnter를 누르면 브라우저를 닫습니다...")
        driver.quit()


if __name__ == '__main__':
    main()
