import urllib.request
import json

# 1. Check projects.json
try:
    req = urllib.request.urlopen('http://127.0.0.1:8000/projects.json', timeout=5)
    data = json.loads(req.read().decode('utf-8'))
    print('1. projects.json: OK -', len(data), 'projects')
    for p in data:
        img = p['image']
        print('   ' + p['slug'] + ': ' + img)
except Exception as e:
    print('1. projects.json ERROR:', e)

# 2. Check gallery.js
try:
    req = urllib.request.urlopen('http://127.0.0.1:8000/js/gallery.js', timeout=5)
    gj = req.read().decode('utf-8')
    print('2. gallery.js: OK -', len(gj), 'bytes')
    print('   Has renderGallery:', 'renderGallery' in gj)
    print('   Has fetch projects:', 'fetch' in gj and 'projects.json' in gj)
except Exception as e:
    print('2. gallery.js ERROR:', e)

# 3. Check gallery.html structure
try:
    req = urllib.request.urlopen('http://127.0.0.1:8000/gallery.html', timeout=5)
    html = req.read().decode('utf-8')
    print('3. gallery.html: OK -', len(html), 'bytes')
    print('   Has gallery-viewport:', 'gallery-viewport' in html)
    print('   Has gallery-canvas:', 'gallery-canvas' in html)
    print('   Has script include:', 'js/gallery.js' in html)
except Exception as e:
    print('3. gallery.html ERROR:', e)