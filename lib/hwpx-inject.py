#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import zipfile, json, html, sys, re

data = json.load(open(sys.argv[1]))
src = data['templatePath']
dst = data['outPath']
bullets = data['bulletItems']
tables = data['tableData']

with zipfile.ZipFile(src, 'r') as zin:
    with zipfile.ZipFile(dst, 'w') as zout:
        for item in zin.infolist():
            raw = zin.read(item.filename)
            if item.filename == 'Contents/section0.xml':
                t = raw.decode('utf-8')

                # === 1. 목차 페이지 삭제 (첫 pageBreak 전까지) ===
                first_break = t.find('pageBreak="1"')
                if first_break > 0:
                    # pageBreak가 있는 <hp:p> 태그의 시작 찾기
                    p_start = t.rfind('<hp:p ', 0, first_break)
                    if p_start > 0:
                        # 섹션 시작(<hs:sec> 직후 ~ 이 <hp:p> 직전까지 삭제
                        sec_content_start = t.find('>', t.find('<hs:sec')) + 1
                        t = t[:sec_content_start] + t[p_start:]

                # === 2. 안내 셀 삭제 (※ 사업계획서는 목차...) ===
                guide_marker = '※ 사업계획서는 목차'
                if guide_marker in t:
                    tbl_s = t.rfind('<hp:tbl ', 0, t.find(guide_marker))
                    tbl_e = t.find('</hp:tbl>', t.find(guide_marker))
                    if tbl_s > 0 and tbl_e > 0:
                        # tbl을 포함하는 <hp:p> 전체 삭제
                        p_s = t.rfind('<hp:p ', 0, tbl_s)
                        p_e = t.find('</hp:p>', tbl_e) + len('</hp:p>')
                        if p_s > 0 and p_e > 0:
                            t = t[:p_s] + t[p_e:]

                # === 3. 파란색 가이드만 있는 표 삭제 ===
                guide_only_tables = [
                    '※ 예시 : 가벼움',
                    '※ 1단계 정부지원사업비는 20백만원',
                    '※ 2단계 정부지원사업비는 20백만원',
                ]
                for marker in guide_only_tables:
                    if marker not in t:
                        continue
                    idx = t.find(marker)
                    tbl_s = t.rfind('<hp:tbl ', 0, idx)
                    tbl_e = t.find('</hp:tbl>', idx)
                    if tbl_s > 0 and tbl_e > 0:
                        p_s = t.rfind('<hp:p ', 0, tbl_s)
                        p_e = t.find('</hp:p>', tbl_e) + len('</hp:p>')
                        if p_s > 0 and p_e > 0:
                            t = t[:p_s] + t[p_e:]

                # 본문 섹션의 가이드 표도 삭제
                body_guide_tables = [
                    '※ 경쟁사 분석, 목표 시장 진입 전략',
                    '※ 대표자, 팀원, 업무파트너(협력기업)',
                    '※ 대표자 보유 역량(경영 능력,',
                ]
                for marker in body_guide_tables:
                    if marker not in t:
                        continue
                    idx = t.find(marker)
                    tbl_s = t.rfind('<hp:tbl ', 0, idx)
                    tbl_e = t.find('</hp:tbl>', idx)
                    if tbl_s > 0 and tbl_e > 0:
                        p_s = t.rfind('<hp:p ', 0, tbl_s)
                        p_e = t.find('</hp:p>', tbl_e) + len('</hp:p>')
                        if p_s > 0 and p_e > 0:
                            t = t[:p_s] + t[p_e:]

                # === 4. 개요 표 가이드 교체 (lineBreak 블록 통째로) ===
                overview_replace = {
                    '※ 본 지원사업을 통해 개발 또는 구체화하고자 하는 제품·서비스 개요<hp:lineBreak/>(사용 용도, 사양, 가격 등), 핵심 기능·성능, 고객 제공 혜택 등': tables.get('아이템개요', '[확인 필요]'),
                    '※ 개발하고자 하는 창업 아이템의 국내·외 시장 현황 및 문제점 등<hp:lineBreak/>문제 해결을 위한 창업 아이템 필요성 등 ': tables.get('문제인식요약', '[확인 필요]'),
                    '※ 개발하고자 하는 창업 아이템을 사업기간 내 제품·서비스로 개발 또는 구체화 <hp:lineBreak/>하고자 하는 계획(최종 산출물_형태, 수량 등)': tables.get('실현가능성요약', '[확인 필요]'),
                    '※ 경쟁사 분석, 목표 시장 진입 전략, 창업 아이템의 비즈니스 모델(수익화 모델), 사업 전체 로드맵, 투자유치 전략 등': tables.get('성장전략요약', '[확인 필요]'),
                    '※ 대표자, 팀원, 업무파트너(협력기업) 등 역량 활용 계획 등': tables.get('팀구성요약', '[확인 필요]'),
                    '- 개발하고자 하는 창업 아이템의 차별성 및 경쟁력 확보 전략': ' ',
                    '※ 제품·서비스 특징을 나타낼 수 있는 참고 사진(이미지)·설계도 등 삽입<hp:lineBreak/>(해당 시)': '[이미지 추천: 제품/서비스 구조도]',
                }
                for old, new in overview_replace.items():
                    safe = new.replace('<', '').replace('>', '') if new else ' '
                    if old in t:
                        idx = t.find(old)
                        t = t[:idx] + safe + t[idx+len(old):]
                        ls_s = t.find('<hp:linesegarray>', idx)
                        ls_e = t.find('</hp:linesegarray>', ls_s) if ls_s > 0 else -1
                        if ls_s > 0 and ls_e > 0 and (ls_s - idx) < 800:
                            t = t[:ls_s] + '<hp:linesegarray/>' + t[ls_e + len('</hp:linesegarray>'):]

                # === 5. 명칭/범주 예시 통째로 교체 ===
                t = t.replace('※ 예시 1 : 게토레이<hp:lineBreak/>예시 2 : Windows<hp:lineBreak/>예시 3 : 알파고',
                              tables.get('명칭', '[확인 필요]').replace('<','').replace('>',''))
                t = t.replace('※ 예시 1 : 스포츠음료<hp:lineBreak/>예시 2 : OS(운영체계)<hp:lineBreak/>예시 3 : 인공지능프로그램',
                              tables.get('범주', '[확인 필요]').replace('<','').replace('>',''))

                # === 6. 표 텍스트 교체 ===
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

                # === 7. 본문 ◦/- 교체 + linesegarray 빈 태그 ===
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
