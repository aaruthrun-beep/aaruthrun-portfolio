import json
import os

images_dir = r"D:\projects\portfolio 2\images"
image_files = [f for f in os.listdir(images_dir) if f.endswith(('.webp', '.jpg', '.png'))]
print("Images in folder:", len(image_files))
print("Files:", sorted(image_files))

with open(r"D:\projects\portfolio 2\projects.json", 'r', encoding='utf-8') as f:
    data = json.load(f)
print("\nProjects in JSON:", len(data))
for p in data:
    img = p.get('image', 'MISSING')
    imgs = p.get('images', [])
    print(f"  {p['slug']}: cover={img}, array={imgs}")