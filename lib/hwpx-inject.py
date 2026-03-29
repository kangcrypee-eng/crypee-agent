#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import zipfile, json, html, sys

data = json.load(open(sys.argv[1]))
src = data['templatePath']
dst = data['outPath']
bullets = data['bulletItems']
tables = data['tableData']

def pad(new, old_len):
    if len(new) >= old_len:
        return new[:old_len]
    return new + ' ' * (old_len - len(new))

with zipfile.ZipFile(src, 'r') as zin:
    with zipfile.ZipFile(dst, 'w') as zout:
        for item in zin.infolist():
            raw = zin.read(item.filename)
            if item.filename == 'Contents/section0.xml':
                t = raw.decode('utf-8')

                # 1. 목차 삭제 (검증됨)
                fb = t.find('pageBreak="1"')
                if fb > 0:
                    ps = t.rfind('<hp:p ', 0, fb)
                    if ps > 0:
                        sc = t.find('>', t.find('<hs:sec')) + 1
                        t = t[:sc] + t[ps:]

                # 2. 가이드 텍스트 — 같은 길이 공백 패딩 (삭제 안 함!)
                guides = [
                    '※ 사업계획서는 목차(1페이지)를 제외하고 10페이지 이내로 작성',
                    '사업계획서 앙식은 변경·삭제할 수 없으며, 추가설명을 위한 이미지(사진), 표 등은 삽입 가능',
                    '(표 안의 행은 추가 가능하며, 해당 없을 시 공란을 유지)',
                    "※ 본문 내 '파란색 글씨로 작성된 안내 문구'는 삭제하고 검정 글씨로 작성하여 제출",
                    '※ 예시 : 가벼움(고객 제공 혜택)을 위해서 용량을 줄이는 재료(핵심 기능)를 사용',
                    '※ 1단계 정부지원사업비는 20백만원 내외로 작성',
                    '※ 2단계 정부지원사업비는 20백만원 내외로 작성',
                    '제작·개발 완료할 최종 생산품의 형태, 수량 등 기재',
                    '(직장명 기재 불가)',
                    '- 개발하고자 하는 창업 아이템의 차별성 및 경쟁력 확보 전략',
                ]
                for g in guides:
                    if g in t:
                        t = t.replace(g, pad(' ', len(g)))

                # 3. 개요 표 lineBreak 블록 — 같은 길이 패딩
                overview = {
                    '※ 본 지원사업을 통해 개발 또는 구체화하고자 하는 제품·서비스 개요<hp:lineBreak/>(사용 용도, 사양, 가격 등), 핵심 기능·성능, 고객 제공 혜택 등': tables.get('아이템개요', ' '),
                    '※ 개발하고자 하는 창업 아이템의 국내·외 시장 현황 및 문제점 등<hp:lineBreak/>문제 해결을 위한 창업 아이템 필요성 등 ': tables.get('문제인식요약', ' '),
                    '※ 개발하고자 하는 창업 아이템을 사업기간 내 제품·서비스로 개발 또는 구체화 <hp:lineBreak/>하고자 하는 계획(최종 산출물_형태, 수량 등)': tables.get('실현가능성요약', ' '),
                    '※ 경쟁사 분석, 목표 시장 진입 전략, 창업 아이템의 비즈니스 모델(수익화 모델), 사업 전체 로드맵, 투자유치 전략 등': tables.get('성장전략요약', ' '),
                    '※ 대표자, 팀원, 업무파트너(협력기업) 등 역량 활용 계획 등': tables.get('팀구성요약', ' '),
                    '※ 제품·서비스 특징을 나타낼 수 있는 참고 사진(이미지)·설계도 등 삽입<hp:lineBreak/>(해당 시)': '[이미지 추천: 제품/서비스 구조도]',
                }
                for old, new in overview.items():
                    safe = new.replace('<', '').replace('>', '') if new else ' '
                    if old in t:
                        t = t.replace(old, pad(safe, len(old)))

                # 4. 명칭/범주 예시 통째로 — 같은 길이
                nm_old = '※ 예시 1 : 게토레이<hp:lineBreak/>예시 2 : Windows<hp:lineBreak/>예시 3 : 알파고'
                nm_new = tables.get('명칭', ' ').replace('<','').replace('>','')
                if nm_old in t:
                    t = t.replace(nm_old, pad(nm_new, len(nm_old)))

                ct_old = '※ 예시 1 : 스포츠음료<hp:lineBreak/>예시 2 : OS(운영체계)<hp:lineBreak/>예시 3 : 인공지능프로그램'
                ct_new = tables.get('범주', ' ').replace('<','').replace('>','')
                if ct_old in t:
                    t = t.replace(ct_old, pad(ct_new, len(ct_old)))

                # 5. 표 교체
                for old, new in tables.items():
                    if not old or old not in t:
                        continue
                    safe = new.replace('<', '').replace('>', '') if new else ' '
                    if len(safe) > len(old):
                        idx = t.find(old)
                        t = t[:idx] + safe + t[idx+len(old):]
                        ls_s = t.find('<hp:linesegarray>', idx)
                        ls_e = t.find('</hp:linesegarray>', ls_s) if ls_s > 0 else -1
                        if ls_s > 0 and ls_e > 0 and (ls_s - idx) < 500:
                            t = t[:ls_s] + '<hp:linesegarray/>' + t[ls_e + len('</hp:linesegarray>'):]
                    else:
                        t = t.replace(old, safe)

                # 6. 본문 ◦/-
                for marker, content in bullets:
                    content = content.replace('>', '').replace('<', '')
                    escaped = html.escape(content)
                    if marker == 'b':
                        old_tag = '<hp:t> \u25e6 </hp:t>'
                        new_tag = '<hp:t>\u25e6 ' + escaped + '</hp:t>'
                    else:
                        old_tag = '<hp:t>   - </hp:t>'
                        new_tag = '<hp:t>- ' + escaped + '</hp:t>'
                    idx = t.find(old_tag)
                    if idx < 0:
                        continue
                    t = t[:idx] + new_tag + t[idx+len(old_tag):]
                    ls_s = t.find('<hp:linesegarray>', idx)
                    ls_e = t.find('</hp:linesegarray>', ls_s) if ls_s > 0 else -1
                    if ls_s > 0 and ls_e > 0 and (ls_s - idx) < 500:
                        t = t[:ls_s] + '<hp:linesegarray/>' + t[ls_e + len('</hp:linesegarray>'):]

                raw = t.encode('utf-8')
            zout.writestr(item, raw, compress_type=item.compress_type)
print('OK')
