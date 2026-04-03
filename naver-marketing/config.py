"""설정값 관리"""

CONFIG = {
    # 메시지 간 대기 시간 (초)
    'delay_min': 30,          # 최소 대기
    'delay_max': 120,         # 최대 대기
    'daily_limit': 50,        # 일일 발송 한도

    # 계정 (1개)
    'account': {
        'id': 'account1',
        'profile_dir': '~/.chrome-profiles/account1',
    },

    # 발송 시간대 (영업시간)
    'send_hours': (10, 18),

    # 랜덤 발송 스케줄
    # True: send_hours 범위 내에서 각 메시지 발송 시각을 랜덤으로 분산
    # False: 실행 즉시 순차 발송 (기존 방식)
    'random_schedule': True,

    # 메시지 변형
    'template_count': 5,

    # 중복 방지
    'resend_days': 90,        # 같은 매장 재발송 금지 기간
}
