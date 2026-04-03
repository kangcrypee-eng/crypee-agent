"""네이버 톡톡 자동 영업 시스템 - 실행 진입점"""

import argparse

from config import CONFIG
from db import init_db
from scraper import search_and_collect, REGIONS, BUSINESS_TYPES
from sender import run_sender
from stats import show_stats


def main():
    parser = argparse.ArgumentParser(description='네이버 톡톡 자동 영업 시스템')
    parser.add_argument('--mode', choices=['scrape', 'send', 'stats', 'init', 'scrape-all', 'scrape-hair'],
                        required=True, help='실행 모드')
    parser.add_argument('--region', default='강남구', help='수집 지역 (기본: 강남구)')
    parser.add_argument('--type', default='미용실', help='업종 (기본: 미용실)')
    parser.add_argument('--limit', type=int, default=None, help='계정당 일일 발송 한도')
    args = parser.parse_args()

    if args.mode == 'init':
        # DB 초기화
        init_db()

    elif args.mode == 'scrape':
        # 특정 지역/업종 매장 수집
        init_db()
        search_and_collect(args.region, args.type)

    elif args.mode == 'scrape-hair':
        # 전국 미용실 수집
        init_db()
        for region in REGIONS:
            search_and_collect(region, '미용실')

    elif args.mode == 'scrape-all':
        # 전국 전체 업종 수집
        init_db()
        for region in REGIONS:
            for btype in BUSINESS_TYPES:
                search_and_collect(region, btype)

    elif args.mode == 'send':
        # 메시지 발송
        run_sender(args.limit)

    elif args.mode == 'stats':
        # 통계
        show_stats()


if __name__ == '__main__':
    main()
