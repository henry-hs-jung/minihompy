"""Vendor the pinned upstream browser bundle, verifying npm archive integrity."""
import base64
import hashlib
import io
import tarfile
from pathlib import Path

import requests

VERSION = '2.116.0'
INTEGRITY = 'YyWmKXt2NspV9iO8FPnlswUFJIRnrLd3oTCb+3ZyYRuKZtBH0xCUDgnUqoyA0fGUxpM/UhfwDjYf/dht/9bp7g=='
out = Path(__file__).resolve().parents[1] / 'assets' / 'vendor'
response = requests.get(f'https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-{VERSION}.tgz', timeout=30)
response.raise_for_status()
assert base64.b64encode(hashlib.sha512(response.content).digest()).decode() == INTEGRITY
out.mkdir(parents=True, exist_ok=True)
with tarfile.open(fileobj=io.BytesIO(response.content), mode='r:gz') as archive:
    for source, target in [('package/dist/umd/supabase.js', f'supabase-{VERSION}.js'), ('package/LICENSE', 'supabase-LICENSE')]:
        data = archive.extractfile(source).read()
        (out / target).write_bytes(data)
        print(target, len(data), hashlib.sha256(data).hexdigest())
