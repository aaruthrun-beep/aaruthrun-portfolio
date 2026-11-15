import urllib.request
import re
import json

req = urllib.request.urlopen('http://127.0.0.1:8000/gallery.html', timeout=5)
content = req.read().decode('utf-8')

# Find img tags
img_tags = re.findall(r'<img[^>]+>', content)
print('Img tags in raw HTML:', len(img_tags))

# Look for gallery-canvas content
if 'gallery-canvas' in content:
    print('Gallery canvas found in HTML')

# Look for any rendered content between the canvas tags
canvas_start = content.find('class="gallery-canvas"')
if canvas_start >= 0:
    # Find the closing div
    depth = 0
    i = canvas_start
    while i < len(content) and depth >= 0:
        if content[i:i+6] == '</div>':
            depth -= 1
        elif content[i:i+5] == '<div>':
            depth += 1
        i += 1
    canvas_end = i
    canvas_content = content[canvas_start:canvas_end]
    # Look for img tags within canvas
    canvas_imgs = re.findall(r'<img[^>]+>', canvas_content)
    print('Img tags within canvas:', len(canvas_imgs))
    for img in canvas_imgs[:5]:
        src = re.search(r'src=["\']([^"\']+)["\']', img)
        if src:
            print('  src:', src.group(1))

# Check projects.json
try:
    req2 = urllib.request.urlopen('http://127.0.0.1:8000/projects.json', timeout=5)
    pdata = json.loads(req2.read().decode('utf-8'))
    print('\nprojects.json:', len(pdata), 'projects')
    for p in pdata:
        print('  ' + p['slug'] + ': image=' + p['image'])
except Exception as e:
    print('\nError fetching projects.json:', e)

# Check if gallery.js is loaded
req3 = urllib.request.urlopen('http://127.0.0.1:8000/js/gallery.js', timeout=5)
gj = req3.read().decode('utf-8')
print('\ngallery.js loaded:', len(gj), 'bytes')
if 'renderGallery' in gj:
    print('renderGallery function present')
if 'fetch' in gj:
    print('fetch logic present')