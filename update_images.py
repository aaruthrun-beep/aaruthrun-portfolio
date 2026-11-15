import json
import os

base_path = r"D:\projects\portfolio 2\images\projects"

# Read existing projects.json
with open(r"D:\projects\portfolio 2\projects.json", 'r', encoding='utf-8') as f:
    data = json.load(f)

# Update each project with images from organized folders
project_folders = {
    "nite-369": data[0],
    "mars-369": data[1],
    "bldc-foc-actuator": data[2],
    "ffb-steer-by-wire": data[3],
    "esp32-s3-micro-robot": data[4],
    "cat-autonomous-rover": data[5],
    "titan-klipper-corexy": data[6],
    "scrapx6": data[7],
}

for slug, proj in project_folders.items():
    folder_path = os.path.join(base_path, slug)
    if os.path.exists(folder_path):
        image_files = []
        for f in os.listdir(folder_path):
            if f.endswith(('.png', '.jpg', '.jpeg', '.webp')):
                image_files.append(f)
        image_files.sort()
        if image_files:
            proj['image'] = "images/projects/" + slug + "/" + image_files[0]
            proj['images'] = ["images/projects/" + slug + "/" + f for f in image_files]
        else:
            proj['image'] = "images/nite-369.webp"
            proj['images'] = ["images/nite-369.webp"]
    else:
        proj['image'] = "images/nite-369.webp"
        proj['images'] = ["images/nite-369.webp"]

# Add website field for each project
websites = {
    "nite-369": "https://aaruthrun-beep.github.io/nite-369/",
    "mars-369": "https://aaruthrun-beep.github.io/mars-369/",
    "bldc-foc-actuator": "https://aaruthrun-beep.github.io/bldc-foc-actuator/",
    "ffb-steer-by-wire": "https://aaruthrun-beep.github.io/ffb-steer-by-wire/",
    "esp32-s3-micro-robot": "https://aaruthrun-beep.github.io/esp32-s3-micro-robot/",
    "cat-autonomous-rover": "https://aaruthrun-beep.github.io/cat-autonomous-rover/",
    "titan-klipper-corexy": "https://aaruthrun-beep.github.io/titan-klipper-corexy/",
    "scrapx6": "https://aaruthrun-beep.github.io/scrapx6/",
]

for p in data:
    p['website'] = websites.get(p['slug'], '')

# Save updated projects.json
with open(r"D:\projects\portfolio 2\projects.json", 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Updated projects.json with organized project images")
for p in data:
    print("  " + p['slug'] + ": cover=" + p['image'] + ", " + str(len(p['images'])) + " gallery photos, website=" + p['website'][:40])
PYEOF