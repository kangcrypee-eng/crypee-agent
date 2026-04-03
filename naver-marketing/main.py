"""네이버 톡톡 자동 영업 시스템 - 실행 진입점"""

import argparse

from config import CONFIG
from db import init_db
from scraper import search_and_collect, REGIONS, BUSINESS_TYPES
from sender import run_sender
from stats import show_stats


def main():
    parser = argparse.ArgumentParser(description='네이버 톡톡 자동 영업 시스템')
    parser.add_argument('--mode', choices=[
        'login',        # 네이버 로그인 (최초 1회)
        'scrape',       # 특정 지역/업종 수집
        'scrape-hair',  # 전국 미용실 수집
        'scrape-all',   # 전국 전체 업종 수집
        'send',         # 톡톡 메시지 발송
        'send-test',    # 1건 테스트 발송
        'stats',        # 통계
        'init',         # DB 초기화
    ], required=True, help='실행 모드')
    parser.add_argument('--region', default='강남구', help='수집 지역 (기본: 강남구)')
    parser.add_argument('--type', default='미용실', help='업종 (기본: 미용실)')
    parser.add_argument('--limit', type=int, default=None, help='일일 발송 한도')
    args = parser.parse_args()

    if args.mode == 'login':
        # 네이버 로그인 (최초 1회)
        from login import setup_login
        setup_login()

    elif args.mode == 'init':
        init_db()

    elif args.mode == 'scrape':
        init_db()
        search_and_collect(args.region, args.type)

    elif args.mode == 'scrape-hair':
        init_db()
        for region in REGIONS:
            search_and_collect(region, '미용실')

    elif args.mode == 'scrape-all':
        init_db()
        for region in REGIONS:
            for btype in BUSINESS_TYPES:
                search_and_collect(region, btype)

    elif args.mode == 'send':
        run_sender(args.limit)

    elif args.mode == 'send-test':
        # 1건만 테스트 발송
        run_sender(daily_limit=1)

    elif args.mode == 'stats':
        show_stats()


if __name__ == '__main__':
    main()
