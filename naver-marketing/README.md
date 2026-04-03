# 네이버 톡톡 자동 영업 시스템

네이버 플레이스에서 매장을 수집하고, 톡톡 메시지를 자동 발송합니다.

## 필요한 것
- Python 3.10 이상
- Chrome 브라우저

## 윈도우 설치 (VSCode)

### 1. Python 설치
https://www.python.org/downloads/ 에서 다운로드
> 설치 시 반드시 "Add Python to PATH" 체크!

### 2. VSCode에서 폴더 열기
이 `naver-marketing` 폴더를 VSCode로 열기

### 3. 터미널에서 실행 (Ctrl+`)
```cmd
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4. 네이버 로그인 (최초 1회)
```cmd
python main.py --mode login
```
Chrome이 열리면 네이버 로그인 → 터미널에서 Enter

## 사용법

### 전국 미용실 수집
```cmd
python main.py --mode scrape-hair
```

### 전체 업종 수집 (미용실, 카페, 음식점, 네일샵, 필라테스, 병원, 학원, 부동산)
```cmd
python main.py --mode scrape-all
```

### 특정 지역/업종만 수집
```cmd
python main.py --mode scrape --region 강남구 --type 카페
```

### 1건 테스트 발송
```cmd
python main.py --mode send-test
```

### 메시지 발송 (일일 50건)
```cmd
python main.py --mode send
```

### 통계 확인
```cmd
python main.py --mode stats
```

## 참고
- 수집은 중간에 중단해도 이미 수집된 지역은 자동 건너뜀
- 발송은 10시~18시 사이만 가능
- 일일 50건 한도 (config.py에서 변경 가능)
- 같은 매장에 90일 내 재발송 안 됨
