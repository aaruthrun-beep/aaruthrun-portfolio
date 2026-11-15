import json
import os

# Read current projects.json
with open(r'D:\projects\portfolio 2\projects.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Base path
base_path = r'D:\projects\portfolio 2\images\projects'

# Project slugs in order
project_slugs = ['nite-369', 'mars-369', 'bldc-foc-actuator', 'ffb-steer-by-wire',
                 'esp32-s3-micro-robot', 'cat-autonomous-rover', 'titan-klipper-corexy', 'scrapx6']

# Update each project with images from organized folders
for i, slug in enumerate(project_slugs):
    proj = data[i]
    folder_path = os.path.join(base_path, slug)
    
    if os.path.exists(folder_path):
        # Get all image files
        image_files = []
        for f in os.listdir(folder_path):
            if f.endswith(('.png', '.jpg', '.jpeg', '.webp')):
                image_files.append(f)
        image_files.sort()
        
        if image_files:
            # Use first image as cover
            proj['image'] = 'images/projects/' + slug + '/' + image_files[0]
            # Use all images as gallery photos
            proj['images'] = ['images/projects/' + slug + '/' + f for f in image_files]
        else:
            # Fallback
            proj['image'] = 'images/nite-369.webp'
            proj['images'] = ['images/nite-369.webp']
    else:
        proj['image'] = 'images/nite-369.webp'
        proj['images'] = ['images/nite-369.webp']
    
    # Add website
    proj['website'] = 'https://aaruthrun-beep.github.io/' + slug + '/'

# Save updated projects.json
with open(r'D:\projects\portfolio 2\projects.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Updated projects.json')
for p in data:
    img_exists = os.path.exists(p['image'])
    print('  ' + p['slug'] + ': image=' + p['image'] + ' exists=' + str(img_exists) + ', ' + str(len(p['images'])) + ' gallery photos')