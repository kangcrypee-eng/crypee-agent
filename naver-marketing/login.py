"""네이버 로그인용 Chrome 프로필 생성 도우미"""

import os
from config import CONFIG
from scraper import create_driver


def setup_login():
    """Chrome 프로필로 브라우저를 열어서 수동 네이버 로그인을 할 수 있게 함"""
    profile_dir = CONFIG['account']['profile_dir']
    os.makedirs(profile_dir, exist_ok=True)

    print(f"Chrome 프로필 경로: {profile_dir}")
    print(f"네이버 로그인 페이지를 엽니다...")
    print(f"로그인 후 이 창에서 Enter를 누르세요.\n")

    driver = create_driver(profile_dir)
    driver.get("https://nid.naver.com/nidlogin.login")

    input(">>> 네이버 로그인 완료 후 Enter 키를 누르세요...")

    driver.quit()
    print("로그인 정보가 저장되었습니다.")


if __name__ == '__main__':
    setup_login()
