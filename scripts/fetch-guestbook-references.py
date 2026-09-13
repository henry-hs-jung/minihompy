"""Download guestbook research references; never used by the application."""
import hashlib
import html
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import fitz
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'references' / 'guestbook'
SOURCES = [
    ('G01', 'https://www.slideserve.com/mackensie-short/cyworld-boom-in-korea',
     'https://image3.slideserve.com/6511049/slide26-l.jpg', '2014-11-12',
     'D10과 같은 발표 자료. 공개글·비밀글·작성 영역. 화면 내 글 날짜 2009-04. 캡처 시점 미확인.'),
    ('G02', 'https://www.elle.co.kr/article/51736',
     'https://www.elle.co.kr/resources_old/online/org_online_image/el/979626c7-d375-4bef-a765-5c5d3e2a908c.jpg',
     '2021-02-03', '회고 기사에 재수록된 실제 화면. 글 날짜 2005-08-25. 회색 스킨이며 촬영 시점 미확인.'),
    ('G03', 'https://www.yongyeol.com/papers/chun-cyworld-2008.pdf',
     'https://www.yongyeol.com/papers/chun-cyworld-2008.pdf', '2008-10',
     'IMC 2008 논문 Figure 1. PDF 2쪽 내장 이미지 추출. 이름·본문은 연구용 영문/익명화 편집. 글 날짜 2008-05-09.'),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    records = []
    for key, page, url, published, note in SOURCES:
        response = requests.get(url, timeout=40)
        response.raise_for_status()
        data = response.content
        derivation = None
        if key == 'G03':
            # Preserve the embedded figure, not a newly rasterized page or crop.
            with fitz.open(stream=data, filetype='pdf') as document:
                candidates = document[1].get_images(full=True)
                if len(candidates) != 1:
                    raise ValueError('PDF figure structure changed; inspect before extracting')
                extracted = document.extract_image(candidates[0][0])
                derivation = dict(pdfPage=2, xref=candidates[0][0],
                                  sourceSha256=hashlib.sha256(data).hexdigest(),
                                  method='PyMuPDF extract_image; embedded figure, no crop')
                data = extracted['image']
        with Image.open(io.BytesIO(data)) as im:
            width, height = im.size
            ext = {'JPEG': 'jpg', 'PNG': 'png'}[im.format]
            im.verify()
        filename = f'{key}.{ext}'
        (OUT / filename).write_bytes(data)
        records.append(dict(id=key, pageUrl=page, imageUrl=url, publishedAt=published,
                            captureDate=None, localPath=f'references/guestbook/{filename}',
                            width=width, height=height, note=note, derivation=derivation,
                            sha256=hashlib.sha256(data).hexdigest(),
                            retrievedAt=datetime.now(timezone.utc).isoformat(),
                            usage='Research only; not cleared for production assets'))
        print(f'{key}: {width}x{height}')
    (OUT / 'manifest.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    sections = []
    for record in records:
        name = Path(record['localPath']).name
        sections.append(f'<section><h2>{record["id"]}</h2><p>{html.escape(record["note"])}</p>'
                        f'<p>{record["width"]} x {record["height"]} | '
                        f'<a href="{html.escape(record["pageUrl"], quote=True)}">출처</a> | '
                        f'<a href="{name}">이미지 원래 크기</a></p>'
                        f'<a href="{name}"><img src="{name}" alt="{record["id"]} 방명록 참고 자료" '
                        f'width="{record["width"]}" height="{record["height"]}"></a></section>')
    (OUT / 'index.html').write_text('''<!doctype html>
<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>싸이월드 방명록 참고 자료</title>
<style>body{max-width:1100px;margin:24px auto;padding:0 16px;font:14px/1.6 sans-serif;color:#222;background:#fff}h1{font-size:22px}h2{font-size:18px}section{border-top:1px solid #bbb;margin-top:28px;padding-top:12px}img{display:block;max-width:100%;height:auto}a{color:#176b95}</style>
<h1>방명록 참고 자료</h1><p>연구용 원본 자료. 앱 배포 자산이 아닙니다. 게시일과 캡처 시점은 다릅니다.</p>
<p><a href="../../docs/guestbook-reference-research.md">조사 문서</a></p>
''' + '\n'.join(sections) + '\n</html>\n', encoding='utf-8')


if __name__ == '__main__':
    main()
