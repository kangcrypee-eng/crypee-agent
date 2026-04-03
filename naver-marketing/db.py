"""DB 초기화 및 유틸리티"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'marketing.db')


def get_db():
    """DB 연결 반환"""
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    """DB 테이블 초기화"""
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS shops (
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

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shop_id INTEGER REFERENCES shops(id),
            account TEXT,
            template_id INTEGER,
            status TEXT DEFAULT 'pending',
            sent_at DATETIME,
            error TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_shops_type ON shops(business_type);
        CREATE INDEX IF NOT EXISTS idx_shops_region ON shops(region);
        CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
    """)
    db.commit()
    db.close()
    print("DB 초기화 완료")


def db_exists(db, place_id):
    """place_id 중복 체크"""
    row = db.execute("SELECT 1 FROM shops WHERE place_id = ?", (place_id,)).fetchone()
    return row is not None


def insert_shop(db, shop):
    """매장 정보 저장"""
    try:
        db.execute(
            """INSERT INTO shops (place_id, name, region, business_type, phone, talktalk_url, place_url)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (shop['place_id'], shop['name'], shop['region'], shop['business_type'],
             shop.get('phone'), shop.get('talktalk_url'), shop.get('place_url'))
        )
        db.commit()
        return True
    except sqlite3.IntegrityError:
        return False


if __name__ == '__main__':
    init_db()
