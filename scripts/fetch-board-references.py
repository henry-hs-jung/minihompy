"""Preserve board research screenshots without resizing or retouching."""
import hashlib
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'references' / 'board'
SOURCES = [
    ('B01', 'list-wide', 'fs6/19_tistory_2008_04_16_14_26_48058e045cad9'),
    ('B02', 'detail-wide', 'fs4/14_tistory_2008_04_16_14_14_48058b25d07b3'),
    ('B03', 'folder-settings', 'fs4/1_tistory_2008_04_16_14_14_48058b26a3a2d'),
    ('B04', 'editor-2010', '2024F80E4BF7911958'),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    records = []
    for identifier, role, image_id in SOURCES:
        url = (f'https://t1.daumcdn.net/cfile/tistory/{image_id}' if identifier == 'B04'
               else f'https://t1.daumcdn.net/tistoryfile/{image_id}?original=')
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        with Image.open(io.BytesIO(response.content)) as image:
            width, height = image.size
            extension = {'JPEG': 'jpg', 'PNG': 'png', 'GIF': 'gif'}[image.format]
            image.verify()
        filename = f'{identifier}-{role}.{extension}'
        (OUT / filename).write_bytes(response.content)
        records.append(dict(
            id=identifier, role=role, imageUrl=url,
            pageUrl='https://yavadavadoo.tistory.com/268' if identifier == 'B04' else 'https://xarsrima.tistory.com/462',
            publishedAt='2010-04-04' if identifier == 'B04' else '2008-04-16', captureDate=None,
            dateNote='Post date is not capture date; B04 is later editor evidence, not pre-2008 SoT',
            localPath=f'references/board/{filename}', width=width, height=height,
            sha256=hashlib.sha256(response.content).hexdigest(),
            retrievedAt=datetime.now(timezone.utc).isoformat(),
            usage='Research only; not cleared for production assets',
        ))
        print(f'{identifier}: {filename} {width}x{height}')
    (OUT / 'manifest.json').write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
