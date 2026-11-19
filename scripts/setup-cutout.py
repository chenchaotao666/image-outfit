"""Download the small U2-Net model, verifying its upstream checksum."""
import hashlib
import urllib.request
from pathlib import Path

target = Path(__file__).resolve().parents[1] / 'models/vision/u2netp.onnx'
target.parent.mkdir(parents=True, exist_ok=True)
digest = '8e83ca70e441ab06c318d82300c84806'
if not target.exists() or hashlib.md5(target.read_bytes()).hexdigest() != digest:
    temporary = target.with_suffix('.download')
    urllib.request.urlretrieve('https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx', temporary)
    if hashlib.md5(temporary.read_bytes()).hexdigest() != digest:
        raise RuntimeError('Model checksum mismatch')
    temporary.replace(target)
print('Cutout model ready')
