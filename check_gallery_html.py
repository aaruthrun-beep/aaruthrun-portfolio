import urllib.request
import re

content = urllib.request.urlopen('http://127.0.0.1:8000/gallery.html', timeout=5).read().decode('utf-8')

checks = {
    'DOCTYPE html': 'DOCTYPE html' in content,
    'html lang': 'lang=en' in content,
    'head': '<head>' in content,
    'body': '<body' in content,
    'gallery-viewport': 'gallery-viewport' in content,
    'gallery-canvas': 'gallery-canvas' in content,
    'script include js': 'js/gallery.js' in content,
    'script include include': 'js/include.js' in content,
    'body style': 'body style=' in content,
    'main style': 'main style=' in content,
    'Fit to screen': 'fitToScreen' in content,
    'renderGallery call': 'renderGallery' in content,
}

print('Gallery.html Structure:')
for name, found in checks.items():
    print('  ' + name + ': ' + ('YES' if found else 'NO'))

abs_count = len(re.findall(r'position: absolute', content))
print('  position:absolute elements: ' + str(abs_count))

img_count = len(re.findall(r'<img[^>]+>', content))
print('  img tags: ' + str(img_count))