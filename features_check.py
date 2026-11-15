import re

with open('D:\\projects\\portfolio 2\\js\\gallery.js', 'r', encoding='utf-8') as f:
    content = f.read()

features = {
    'random positioning': 'areaX1 + Math.floor(rand' in content,
    'random rotation': 'rot = (rand()' in content,
    'alphabetical sort': 'Sort each project' in content,
    'seeded random': 'seeded(i * 53' in content,
    '3 columns': 'COLS      = 3' in content,
}

print('Gallery.js Features:')
for name, found in features.items():
    print(f'  {name}: {"YES" if found else "NO"}')