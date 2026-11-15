import json
import os

# Read current projects.json
with open(r'D:\projects\portfolio 2\projects.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Base path
base_path = r'D:\projects\portfolio 2\images\projects'

# Project order
project_slugs = ['nite-369', 'mars-369', 'bldc-foc-actuator', 'ffb-steer-by-wire',
                 'esp32-s3-micro-robot', 'cat-autonomous-rover', 'titan-klipper-corexy', 'scrapx6']

# Websites
websites = {
    'nite-369': 'https://aaruthrun-beep.github.io/nite-369/',
    'mars-369': 'https://aaruthrun-beep.github.io/mars-369/',
    'bldc-foc-actuator': 'https://aaruthrun-beep.github.io/bldc-foc-actuator/',
    'ffb-steer-by-wire': 'https://aaruthrun-beep.github.io/ffb-steer-by-wire/',
    'esp32-s3-micro-robot': 'https://aaruthrun-beep.github.io/esp32-s3-micro-robot/',
    'cat-autonomous-rover': 'https://aaruthrun-beep.github.io/cat-autonomous-rover/',
    'titan-klipper-corexy': 'https://aaruthrun-beep.github.io/titan-klipper-corexy/',
    'scrapx6': 'https://aaruthrun-beep.github.io/scrapx6/',
}

# For each project, set up images from organized folders
for i, slug in enumerate(project_slugs):
    proj = data[i]
    folder_path = os.path.join(base_path, slug)
    
    if os.path.exists(folder_path):
        # Get all image files (exclude README.md, non-image files)
        image_files = []
        for f in os.listdir(folder_path):
            if f.endswith(('.png', '.jpg', '.jpeg', '.webp')):
                image_files.append(f)
        image_files.sort()
        
        if image_files:
            # Use first image as cover
            proj['image'] = f'images/projects/{slug}/{image_files[0]}'
            # Use all images as gallery photos
            proj['images'] = [f'images/projects/{slug}/{f}' for f in image_files]
        else:
            # Fallback
            proj['image'] = 'images/nite-369.webp'
            proj['images'] = ['images/nite-369.webp']
    else:
        # Project without folder - use a reasonable default
        proj['image'] = 'images/nite-369.webp'
        proj['images'] = ['images/nite-369.webp']
    
    # Add/update website
    proj['website'] = websites.get(slug, '')

# Save updated projects.json
with open(r'D:\projects\portfolio 2\projects.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Updated projects.json')
for p in data:
    print('  ' + p['slug'] + ': cover=' + p['image'] + ', ' + str(len(p['images'])) + ' gallery photos')