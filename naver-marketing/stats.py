"""통계 및 모니터링"""

from db import get_db


def show_stats():
    """전체 통계 출력"""
    db = get_db()

    print("\n=== 매장 수집 현황 ===")
    for row in db.execute("SELECT business_type, COUNT(*) as cnt FROM shops GROUP BY business_type"):
        print(f"  {row['business_type']}: {row['cnt']}개")

    total_shops = db.execute("SELECT COUNT(*) as cnt FROM shops").fetchone()['cnt']
    talktalk_shops = db.execute("SELECT COUNT(*) as cnt FROM shops WHERE talktalk_url IS NOT NULL").fetchone()['cnt']
    print(f"  ---")
    print(f"  전체: {total_shops}개 (톡톡 가능: {talktalk_shops}개)")

    print("\n=== 발송 현황 ===")
    for row in db.execute("SELECT status, COUNT(*) as cnt FROM messages GROUP BY status"):
        print(f"  {row['status']}: {row['cnt']}건")

    print("\n=== 계정별 현황 ===")
    for row in db.execute("SELECT account, COUNT(*) as cnt FROM messages WHERE status='sent' GROUP BY account"):
        print(f"  {row['account']}: {row['cnt']}건")

    print("\n=== 오늘 발송 ===")
    today_rows = db.execute(
        "SELECT account, COUNT(*) as cnt FROM messages "
        "WHERE status='sent' AND date(sent_at)=date('now') GROUP BY account"
    ).fetchall()
    if today_rows:
        for row in today_rows:
            print(f"  {row['account']}: {row['cnt']}건")
    else:
        print("  오늘 발송 내역 없음")

    print("\n=== 지역별 현황 ===")
    for row in db.execute("SELECT region, COUNT(*) as cnt FROM shops GROUP BY region"):
        print(f"  {row['region']}: {row['cnt']}개")

    db.close()
