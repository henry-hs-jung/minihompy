"""Preserve public diary research images without pixel modifications."""
import hashlib
import html
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'references' / 'diary'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sources = []
    page = 'https://www.newswire.co.kr/newsRead.php?no=70250'
    response = requests.get(page, timeout=25)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    for item in soup.select('#lightbox-image-gallery .column_image')[2:]:
        sources.append((page, '2005-08-04', item['data-src'], item.get_text(' ', strip=True)))
    page = 'https://yslife.tistory.com/805'
    response = requests.get(page, timeout=25)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    for img in soup.select('.article img'):
        if 'cfile/tistory/' in img.get('src', ''):
            sources.append((page, '2014-04-24', img['src'], 'Edited collage of archived entries; not full UI geometry'))
    sources.extend([
        ('https://www.slideserve.com/mackensie-short/cyworld-boom-in-korea', '2014-11-12', 'https://image3.slideserve.com/6511049/slide24-l.jpg', 'Best full diary layout candidate; presentation repost, capture date unverified'),
        ('https://sports.news.nate.com/view/20220526n24658', '2022-05-26', 'https://thumbnews.nateimg.co.kr/view610/news.nateimg.co.kr/orgImg/jn/2022/05/26/283ac6be44be47.jpg', 'Old entry excerpts in later news collage'),
        ('https://www.etoday.co.kr/news/view/2163745', '2022-08-16', 'https://img.etoday.co.kr/pto_db/2022/08/20220816094004_1787098_843_902.jpeg', 'Exclude: modern mobile diary'),
        ('https://orbi.kr/00022768576', '2019-05-14', 'https://s3.orbi.kr/data/file/united2/8456792f-5f65-4ee4-9703-8a876a22afda20190514_141920.png', 'Grape reward management; not diary reading screen'),
        ('https://orbi.kr/00022768576', '2019-05-14', 'https://s3.orbi.kr/data/file/united2/ca5f9580-bcc1-433d-9a28-fd9a38c9d242image.jpg', 'Exclude: hand-drawn Orbi proposal, not Cyworld UI'),
        ('https://paranpenguin.co.kr/PPT/194551', None, 'https://paranpenguin.co.kr/files/attach/images/2025/05/08/2bf59a97b481a90c744ac213d6f602c1.jpg', 'Exclude: presentation template, not actual diary screenshot'),
        ('https://orbi.kr/00022768576', '2019-05-14', 'https://s3.orbi.kr/data/file/united2/57a4ae34-1aab-4438-8193-2b10ee83b0ce20190514_141646.png', 'Exclude from diary geometry: photo/text meme crop with no diary chrome'),
    ])
    records = []
    for index, (page, published, url, note) in enumerate(sources, 1):
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        with Image.open(io.BytesIO(response.content)) as image:
            width, height = image.size
            extension = 'png' if image.format == 'PNG' else 'jpg' if image.format == 'JPEG' else image.format.lower()
            image.verify()
        path = OUT / f'D{index:02d}.{extension}'
        path.write_bytes(response.content)
        records.append(dict(id=f'D{index:02d}', pageUrl=page, publishedAt=published,
                            captureDate=None, imageUrl=url, localPath=str(path.relative_to(ROOT)),
                            width=width, height=height, note=note,
                            sha256=hashlib.sha256(response.content).hexdigest(),
                            retrievedAt=datetime.now(timezone.utc).isoformat(),
                            usage='Research only; not cleared for production assets'))
        print(f'D{index:02d} {width}x{height} {note}', flush=True)
    (OUT / 'manifest.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    cards = []
    for record in sorted(records, key=lambda r: (r['id'] not in {'D10', 'D11', 'D01', 'D02'}, r['id'])):
        filename = Path(record['localPath']).name
        cards.append(
            f'<section id="{record["id"]}"><h2>{record["id"]} '
            f'<small>{record["width"]} x {record["height"]}</small></h2>'
            f'<p>{html.escape(record["note"])}</p>'
            f'<p>Published: {record["publishedAt"] or "unknown"} / Capture date: unverified '
            f'<a href="{html.escape(record["pageUrl"], quote=True)}">Source</a> '
            f'<a href="{filename}">Original image</a></p>'
            f'<a href="{filename}"><img src="{filename}" alt="{record["id"]}" loading="lazy"></a></section>'
        )
    gallery = '''<!doctype html>
<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>다이어리 조사 이미지</title>
<style>
body{margin:24px;font:14px/1.6 sans-serif;color:#333;background:#fff;letter-spacing:0}
h1{font-size:22px}h2{font-size:18px}small{font-weight:normal;font-size:12px;color:#777}
main{max-width:1100px}section{padding:20px 0;border-top:1px solid #ccc}
img{max-width:100%;height:auto}a{color:#24648d}p{overflow-wrap:anywhere}
</style><main><h1>다이어리 조사 이미지 16개</h1>
<p><a href="../../docs/diary-reference-research.md">조사 보고서</a> ·
<a href="#D10">우선 후보 D10</a> · <a href="#D11">본문 비교 D11</a></p>
<p>시기·상태가 다른 후보와 제외 자료를 함께 보관했습니다. 원본 이미지를 누르면 별도로 열립니다.</p>
'''
    (OUT / 'index.html').write_text(gallery + '\n'.join(cards) + '</main></html>\n', encoding='utf-8')


if __name__ == '__main__':
    main()
