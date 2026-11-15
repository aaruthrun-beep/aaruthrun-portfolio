import re

with open('D:\\projects\\portfolio 2\\js\\gallery.js', 'r', encoding='utf-8') as f:
    c = f.read()

openers = c.count('{') + c.count('[') + c.count('(')
closers = c.count('}') + c.count(']') + c.count(')')
balanced = "BALANCED" if openers == closers else "UNBALANCED"

checks = {
    'seeded function': 'function seeded' in c,
    'renderGallery': 'async function renderGallery' in c,
    'fetch projects': 'fetch' in c and 'projects.json' in c,
    'sort images': 'Sort each project' in c,
    'COLS = 3': 'COLS      = 3' in c,
    'PADDING = 60': 'const PADDING     = 60' in c,
}

print('Gallery.js Verification:')
print(f'  Brackets: {openers} open / {closers} close - {balanced}')
for name, found in checks.items():
    print(f'  {name}: {"YES" if found else "NO"}')