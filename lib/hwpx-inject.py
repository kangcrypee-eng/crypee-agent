#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import zipfile, json, html, sys

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
                for old, new in tables.items():
                    if old and old in t:
                        t = t.replace(old, html.escape(new) if new else ' ')
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
