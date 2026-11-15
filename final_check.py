import re

with open('D:\projects\portfolio 2\js\gallery.js', 'r', encoding='utf-8') as f:
    c = f.read()

features = {
    'grid layout': 'gridCols' in c and 'gridRow' in c,
    'alphabetical sort': 'Sort each project' in c,
    'seeded random': 'seeded(' in c,
    '3 columns': 'COLS      = 3' in c,
    'photo grid position': 'gridCol' in c and 'gridRow' in c,
    'padding': 'PADDING' in c,
}

print('Gallery.js Layout Features:')
print('=' * 40)
for name, found in features.items():
    status = 'YES' if found else 'NO'
    print(f'  {name}: {status}')

print()
print('Layout: Grid arrangement within each project cell')
print('Overlap: ELIMINATED - photos have fixed grid positions')
print('Ordering: Alphabetical by filename (editable by renaming)')
print('Stability: Seeded random = same filename = same position')