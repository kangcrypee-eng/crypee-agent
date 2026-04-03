"""디버그: 네이버 플레이스 페이지 구조 확인"""

import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from scraper import create_driver

driver = create_driver()

try:
    query = "강남구 미용실"
    url = f"https://map.naver.com/p/search/{query}"
    print(f"접속: {url}")
    driver.get(url)
    time.sleep(5)

    # 스크린샷
    driver.save_screenshot("/tmp/naver_debug_1_main.png")
    print("스크린샷 저장: /tmp/naver_debug_1_main.png")

    # 현재 페이지 iframe 목록
    iframes = driver.find_elements(By.TAG_NAME, "iframe")
    print(f"\niframe 수: {len(iframes)}")
    for i, iframe in enumerate(iframes):
        name = iframe.get_attribute("name")
        src = iframe.get_attribute("src") or ""
        print(f"  [{i}] name={name}, src={src[:100]}")

    # searchIframe 전환 시도
    try:
        WebDriverWait(driver, 10).until(
            EC.frame_to_be_available_and_switch_to_it("searchIframe")
        )
        print("\nsearchIframe 전환 성공")

        driver.save_screenshot("/tmp/naver_debug_2_iframe.png")

        # 페이지 소스 일부 저장
        html = driver.page_source
        with open("/tmp/naver_debug_page.html", "w") as f:
            f.write(html)
        print(f"HTML 저장: /tmp/naver_debug_page.html ({len(html)} bytes)")

        # 다양한 셀렉터 시도
        selectors = [
            '.CHC5F a.tzwk0',
            'a[href*="/place/"]',
            '.TYaxT',
            '.place_bluelink',
            'a.place_bluelink',
            'li.UEzoS',
            'li[data-laim-exp-id]',
            '.ouxiq a',
            'a.P7gyV',
            'span.TYaxT',
            'a[class*="link"]',
            'div[class*="item"] a',
        ]
        for sel in selectors:
            els = driver.find_elements(By.CSS_SELECTOR, sel)
            if els:
                texts = [e.text[:30] for e in els[:3] if e.text]
                print(f"  {sel}: {len(els)}개 - {texts}")
            else:
                print(f"  {sel}: 0개")

        # 모든 a 태그 href 확인
        all_links = driver.find_elements(By.TAG_NAME, "a")
        print(f"\n전체 <a> 태그: {len(all_links)}개")
        for a in all_links[:20]:
            href = a.get_attribute("href") or ""
            text = a.text.strip()[:40]
            if href and text:
                print(f"  {text} -> {href[:80]}")

        driver.switch_to.default_content()

    except Exception as e:
        print(f"\nsearchIframe 전환 실패: {e}")

        # iframe 없이 직접 시도
        all_links = driver.find_elements(By.TAG_NAME, "a")
        print(f"\n메인 페이지 <a> 태그: {len(all_links)}개")
        for a in all_links[:20]:
            href = a.get_attribute("href") or ""
            text = a.text.strip()[:40]
            if href and text:
                print(f"  {text} -> {href[:80]}")

finally:
    driver.quit()
    print("\n완료")
