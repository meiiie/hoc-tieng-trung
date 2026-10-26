"""Verify the generated core against the pinned English input; optional local input for offline use."""
import hashlib
from pathlib import Path
import subprocess
import sys
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://raw.githubusercontent.com/meiiie/hoc-tu-vung/8953b394657555ee07dd5bb32f30823829330032/app.js'
EXPECTED_SHA = 'c422151496e735305dd53114de38cc292cd6acb05555d54fe8d2927ec3110107'
if len(sys.argv) > 1:
    source = Path(sys.argv[1]).read_bytes()
else:
    with urllib.request.urlopen(URL, timeout=30) as response:
        source = response.read()
assert hashlib.sha256(source).hexdigest() == EXPECTED_SHA, 'Unexpected generator source'
with tempfile.TemporaryDirectory(prefix='hsk-core-') as folder:
    path = Path(folder) / 'app.js'
    path.write_bytes(source)
    generated = subprocess.check_output([sys.executable, '-X', 'utf8', str(ROOT / 'tools/make-core.py'), str(path)])
    assert generated.decode('utf-8').replace('\r\n', '\n') == (ROOT / 'core/app-core.js').read_text(encoding='utf-8')
print('Generated core matches the pinned English input and checked-in output')
