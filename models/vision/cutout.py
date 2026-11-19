"""Local U2-Net foreground segmentation. No photos are written to disk."""
import base64
import io
import json
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = 24000000

def cutout(data):
    source = Image.open(io.BytesIO(base64.b64decode(data['image'].split(',', 1)[1], validate=True)))
    source = ImageOps.exif_transpose(source).convert('RGBA')
    source.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    pixels = np.asarray(source.convert('RGB').resize((320, 320), Image.Resampling.LANCZOS), dtype=np.float32)
    pixels /= max(float(pixels.max()), 1.0)
    pixels = (pixels - np.array([.485, .456, .406], dtype=np.float32)) / np.array([.229, .224, .225], dtype=np.float32)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    session = ort.InferenceSession(str(Path(__file__).parent / 'u2netp.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
    mask = session.run(None, {session.get_inputs()[0].name: pixels.transpose(2, 0, 1)[None]})[0][0, 0]
    span = float(mask.max() - mask.min())
    if span < .001:
        raise ValueError('No foreground detected')
    mask = (mask - mask.min()) / span
    alpha = Image.fromarray(np.uint8(np.clip(mask, 0, 1) * 255)).resize(source.size, Image.Resampling.LANCZOS)
    # Preserve transparent pixels already present in the original image.
    alpha = Image.fromarray(np.uint8(np.asarray(alpha, dtype=np.float32) * np.asarray(source.getchannel('A'), dtype=np.float32) / 255))
    source.putalpha(alpha)
    if data.get('white'):
        background = Image.new('RGBA', source.size, 'white')
        source = Image.alpha_composite(background, source)
    output = io.BytesIO()
    source.save(output, format='PNG')
    return {'image': 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode('ascii')}

if __name__ == '__main__':
    try:
        print(json.dumps(cutout(json.load(sys.stdin))))
    except Exception as error:
        print(type(error).__name__, file=sys.stderr)
        sys.exit(1)
