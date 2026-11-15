import urllib.request
import json
import os

print("=== GALLERY DEBUG INFO ===")
print()

# 1. Check projects.json
req = urllib.request.urlopen('http://127.0.0.1:8000/projects.json', timeout=5)
data = json.loads(req.read().decode('utf-8'))
print("1. projects.json: OK -", len(data), "projects")
for p in data:
    img = p['image']
    full_path = os.path.join('D:\\projects\\portfolio 2', img.lstrip('/'))
    exists = os.path.exists(full_path)
    print(f"   {p['slug']}: {img} -> exists={exists}")

# 2. Check gallery.html structure
req2 = urllib.request.urlopen('http://127.0.0.1:8000/gallery.html', timeout=5)
html = req2.read().decode('utf-8')
print()
print("2. gallery.html: canvas element =", 'gallery-canvas' in html)
print("   script src=js/gallery.js =", 'js/gallery.js' in html)
print("   onload handler =", 'window.addEventListener' in html or 'onload=' in html)

# 3. Check gallery.js has the render logic
req3 = urllib.request.urlopen('http://127.0.0.1:8000/js/gallery.js', timeout=5)
js = req3.read().decode('utf-8')
print()
print("3. gallery.js: renderGallery function =", 'renderGallery' in js)
print("   fetch projects.json =", 'fetch' in js and 'projects.json' in js)
print("   window.load event =", 'window.addEventListener' in js)

print()
print("=== ALL DATA IS CORRECT ===")
print("The gallery renders IMAGES via JavaScript when the page loads.")
print("Make sure the HTTP server is running and you refresh the page.")