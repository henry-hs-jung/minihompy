"""Download unmodified research references and record their provenance.

Requires requests, beautifulsoup4, and Pillow in the local research environment.
"""

import hashlib
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "references" / "research"
SOURCES = [
    ("R01", "https://briskeen.com/770", "btqF7tu9nWu", "briskeen-blue-frame.jpg"),
    ("R02", "https://briskeen.com/770", "btqF5AV1zpG", "briskeen-blue-room.jpg"),
    ("R03", "https://www.newswire.co.kr/newsRead.php?no=73393", "2005081811243481360", "ministry-2005.jpg"),
    ("R04", "https://www.koreatimes.co.kr/business/tech-science/20191013/cyworld-faces-business-shutdown", "a279752d179c40aabd47a95976ec33ff", "koreatimes-2006-photo.jpg"),
    ("R05", "https://www.newswire.co.kr/newsRead.php?no=318372", "2008022212036406400", "minisearch-2008.jpg"),
    ("R06", "https://www.mt.co.kr/society/2015/09/30/2015093013531661158", "2015093013531661158_1", "moneytoday-master-related.jpg"),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    pages = {}
    records = []
    for source_id, page_url, image_key, filename in SOURCES:
        if page_url not in pages:
            response = session.get(page_url, timeout=25)
            response.raise_for_status()
            pages[page_url] = BeautifulSoup(response.text, "html.parser")
        urls = [img.get("src", "") for img in pages[page_url].find_all("img")]
        image_url = next((url for url in urls if image_key in url), None)
        # This article's image can be absent from the current server-rendered HTML.
        if image_url is None and source_id == "R04":
            image_url = "https://img.koreatimes.co.kr/upload/newsV2/images/201910/a279752d179c40aabd47a95976ec33ff.jpg"
        if image_url is not None and source_id == "R06":
            # The page serves AVIF derivatives; this verified path serves the larger JPEG.
            image_url = "https://thumb.mt.co.kr/21/2015/09/2015093013531661158_1.jpg"
        if image_url is None:
            raise RuntimeError(f"Source image missing: {source_id}")
        response = session.get(image_url, timeout=25)
        response.raise_for_status()
        with Image.open(io.BytesIO(response.content)) as image:
            width, height = image.size
            image.verify()
        destination = OUT / filename
        destination.write_bytes(response.content)
        records.append({
            "id": source_id,
            "pageUrl": page_url,
            "imageUrl": image_url,
            "localPath": str(destination.relative_to(ROOT)),
            "width": width,
            "height": height,
            "sha256": hashlib.sha256(response.content).hexdigest(),
            "retrievedAt": datetime.now(timezone.utc).isoformat(),
            "usage": "Research reference only; not a production asset.",
        })
        print(f"{source_id}: {width}x{height} {destination.name}", flush=True)
    (OUT / "manifest.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
