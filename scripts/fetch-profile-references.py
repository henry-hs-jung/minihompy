"""Preserve the user-selected profile source of truth without image edits."""
import hashlib
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'references' / 'profile'


def main():
    url = 'https://img.tf.co.kr/article/home/2014/12/06/20142061417847722.jpg'
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    with Image.open(io.BytesIO(response.content)) as image:
        width, height = image.size
        image.verify()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'PR01-sot.jpg').write_bytes(response.content)
    record = dict(id='PR01', role='User-selected profile layout source of truth',
                  imageUrl=url, pageUrl='https://news.nate.com/view/20141206n09848',
                  publishedAt='2014-12-06', captureDate=None,
                  photoDateStamp='2004-03-16; date printed inside photo, not UI capture date',
                  localPath='references/profile/PR01-sot.jpg', width=width, height=height,
                  sha256=hashlib.sha256(response.content).hexdigest(),
                  retrievedAt=datetime.now(timezone.utc).isoformat(),
                  usage='Research only; not cleared for production assets')
    (OUT / 'manifest.json').write_text(json.dumps([record], ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'PR01: {width}x{height}, preserved original bytes')


if __name__ == '__main__':
    main()
