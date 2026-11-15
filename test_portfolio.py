import urllib.request
import json
import os

urls = [
    'http://localhost:8080/index.html',
    'http://localhost:8080/about.html',
    'http://localhost:8080/projects.html',
    'http://localhost:8080/project.html?slug=nite-369',
    'http://localhost:8080/gallery.html',
    'http://localhost:8080/timeline.html',
    'http://localhost:8080/skills.html',
    'http://localhost:8080/startup.html',
    'http://localhost:8080/education.html',
    'http://localhost:8080/contact.html',
    'http://localhost:8080/css/style.css',
    'http://localhost:8080/config/design-tokens.css',
    'http://localhost:8080/config/app.config.js',
    'http://localhost:8080/data/data-store.js',
    'http://localhost:8080/js/include.js',
    'http://localhost:8080/js/app.js',
    'http://localhost:8080/modules/projects/project-manager.js',
    'http://localhost:8080/modules/gallery/gallery-manager.js',
    'http://localhost:8080/modules/timeline/timeline-manager.js',
    'http://localhost:8080/modules/filters/filter-manager.js',
    'http://localhost:8080/styles/gallery.css',
    'http://localhost:8080/projects.json',
    'http://localhost:8080/data/gallery.json'
]

print('=== TESTING HTTP RESPONSES ===')
all_ok = True
for url in urls:
    try:
        req = urllib.request.urlopen(url)
        content = req.read()
        print(f'[OK 200] {url} (Length: {len(content)} bytes)')
    except Exception as e:
        print(f'[FAIL] {url}: {e}')
        all_ok = False

print('\n=== VALIDATING PROJECTS.JSON DATA ===')
with open('projects.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
print(f'Total projects in dataset: {len(data)}')
for p in data:
    img_exists = os.path.exists(p['image'])
    print(f"- {p['slug']}: {p['title']}")
    print(f"  Start: {p['start']}, End: {p['end']}, Status: {p['status']}, Image Exists: {img_exists}")
    print(f"  Milestones: {len(p.get('milestones', []))}, Tags: {p.get('tags', [])}")
    print(f"  Skills: {len(p.get('skills', []))}, Specs: {len(p.get('specs', {}))}")
    if not img_exists:
        all_ok = False

print(f'\nTEST SUITE RESULT: {"SUCCESS (ALL CHECKS PASSED)" if all_ok else "FAILED"}')
