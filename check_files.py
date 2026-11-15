import urllib.request
import json

# Check gallery.js
try:
    req = urllib.request.urlopen('http://127.0.0.1:8000/js/gallery.js', timeout=3)
    gj = req.read().decode('utf-8')
    print('gallery.js loaded:', len(gj), 'bytes')
    print('  Has renderGallery:', 'renderGallery' in gj)
    print('  Has fetch:', 'fetch' in gj)
except Exception as e:
    print('gallery.js error:', e)

# Check projects.json
try:
    req = urllib.request.urlopen('http://127.0.0.1:8000/projects.json', timeout=3)
    pj = req.read().decode('utf-8')
    data = json.loads(pj)
    print('projects.json loaded:', len(pj), 'bytes')
    print('  Projects:', len(data))
except Exception as e:
    print('projects.json error:', e)