import urllib.request
import re
import time

# Wait a moment for server to start
time.sleep(2)

try:
    req = urllib.request.urlopen('http://127.0.0.1:8000/gallery.html', timeout=5)
    content = req.read().decode('utf-8')
    checks = ['gallery-viewport', 'gallery-canvas', 'img src', 'projects.json', 'renderGallery']
    print('Gallery.html checks:')
    for c in checks:
        present = c in content
        status = 'YES' if present else 'NO'
        print('  ' + c + ': ' + status)
    # Count img tags
    img_count = len(re.findall(r'<img[^>]+>', content))
    print('  img tags in raw HTML: ' + str(img_count))
except Exception as e:
    print('Error: ' + str(e))