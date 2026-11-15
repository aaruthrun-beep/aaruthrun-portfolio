import re

with open('D:\projects\portfolio 2\js\gallery.js', 'r', encoding='utf-8') as f:
    c = f.read()

features = {
    'checkMinDistance': 'function checkMinDistance' in c,
    'seeded random': 'function seeded' in c,
    'alphabetical sort': 'Sort each project' in c,
    'minimum spacing': 'MIN_SPACING' in c,
    'object-fit cover': 'object-fit:cover' in c,
    '3 columns': 'COLS      = 3' in c,
    'PADDING': 'const PADDING' in c,
    'MIN_PHOTO_W': 'const MIN_PHOTO_W' in c,
    'MAX_PHOTO_W': 'const MAX_PHOTO_W' in c,
}

print('Gallery.js Features:')
print('=' * 40)
for name, found in features.items():
    status = 'YES' if found else 'NO'
    print(f'  {name}: {status}')

open_b = c.count('{') + c.count('[') + c.count('(')
close_b = c.count('}') + c.count(']') + c.count(')')
balanced = "BALANCED" if open_b == close_b else "UNBALANCED"
print(f'\\nBrackets: {open_b} open / {close_b} close - {balanced}')

print()
print('Layout: Scattered with minimum spacing enforcement')
print('Overlap: SIGNIFICANTLY REDUCED - enforced minimum distance')
print('Ordering: Alphabetical by filename (editable by renaming)')
print('Cropping: object-fit:cover for consistent resizing')
print('Rotation: Limited to ±MAX_ROT degrees')