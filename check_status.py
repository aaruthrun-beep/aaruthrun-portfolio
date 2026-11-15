import json, os

with open('D:\\projects\\portfolio 2\\projects.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('=== PROJECTS.JSON ===')
print(f'Total projects: {len(data)}')
print()

for p in data:
    img_path = p['image']
    img_full = r'D:\projects\portfolio 2\\' + img_path.lstrip('/')
    img_exists = os.path.exists(img_full)
    print(f"{p['slug']}:")
    print(f"  image: {img_path} (exists: {img_exists})")
    imgs_count = len(p.get('images', []))
    print(f"  images count: {imgs_count}")
    web = p.get('website', 'N/A')
    print(f"  website: {web[:50] if web else 'N/A'}")
    print()