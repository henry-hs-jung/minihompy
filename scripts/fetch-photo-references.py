"""Archive unmodified album research images, not application assets."""

import hashlib
import io
import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "references" / "photos"
SOURCES = [
    ("P01", "2006-06-28", "https://www.newswire.co.kr/newsRead.php?no=163944", "https://file.newswire.co.kr/data/datafile2/thumb_480/2006/06/2006062811514556240.00029700.jpg", "2006-tag-overview.jpg", "Contemporary operator reference"),
    ("P02", "2006-06-28", "https://www.newswire.co.kr/newsRead.php?no=163944", "https://file.newswire.co.kr/data/datafile2/thumb_480/2006/06/2006062811514556240.45726300.jpg", "2006-tag-detail.jpg", "Contemporary operator reference"),
    ("P03", "2006-06-28", "https://www.newswire.co.kr/newsRead.php?no=163944", "https://file.newswire.co.kr/data/datafile2/thumb_480/2006/06/2006062811514556240.85897700.jpg", "2006-tag-index.jpg", "Contemporary operator reference"),
    ("P04", "2009-02-25", "https://xarsrima.tistory.com/661", "https://t1.daumcdn.net/tistoryfile/fs11/20_tistory_2009_02_25_01_46_49a42469c696b?original", "2009-album.jpg", "Later comparison; not target-era authority"),
    ("P05", "2011-10-16", "https://unsungbyul.wordpress.com/2011/10/16/tutorial-cyworld-photos-photo-albums-2011/", "https://unsungbyul.wordpress.com/wp-content/uploads/2011/10/cyworldphototut-12.png", "2011-album.png", "Later comparison; not target-era authority"),
    ("P06", "2011-10-16", "https://unsungbyul.wordpress.com/2011/10/16/tutorial-cyworld-photos-photo-albums-2011/", "https://unsungbyul.wordpress.com/wp-content/uploads/2011/10/cyworldphototut-6.png", "2011-wide-view.png", "Later comparison; not target-era authority"),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    records = []
    for source_id, published, page_url, image_url, filename, role in SOURCES:
        # The operator page's gallery data-src exposes these full-size originals.
        if source_id in {"P01", "P02", "P03"}:
            image_url = image_url.replace("/thumb_480/", "/data/")
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        with Image.open(io.BytesIO(response.content)) as image:
            width, height = image.size
            image.verify()
        destination = OUT / filename
        destination.write_bytes(response.content)
        records.append({
            "id": source_id, "publishedAt": published, "captureDate": None,
            "pageUrl": page_url, "imageUrl": image_url,
            "localPath": str(destination.relative_to(ROOT)),
            "width": width, "height": height,
            "sha256": hashlib.sha256(response.content).hexdigest(),
            "retrievedAt": datetime.now(timezone.utc).isoformat(),
            "role": role, "usage": "Research only; rights not cleared for deployment.",
        })
        print(f"{source_id}: {width}x{height} {filename}", flush=True)
    (OUT / "manifest.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
