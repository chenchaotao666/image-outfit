"""Image encoding only; no landmarks, segmentation or feature detection."""
import base64, io, json, sys
from PIL import Image, ImageOps

data = json.load(sys.stdin)
image = ImageOps.exif_transpose(Image.open(io.BytesIO(base64.b64decode(data['face'].split(',')[1])))).convert('RGB')
limit = min(2560, max(48, int(data.get('maxSize', 2560))))
image.thumbnail((limit, limit))
def encode(im, quality):
    out = io.BytesIO()
    im.save(out, format='JPEG', quality=quality)
    return 'data:image/jpeg;base64,' + base64.b64encode(out.getvalue()).decode('ascii')
result = {'face': encode(image, 95), 'width': image.width, 'height': image.height}
image.thumbnail((640, 800))
result['preview'] = encode(image, 78)
print(json.dumps(result))
