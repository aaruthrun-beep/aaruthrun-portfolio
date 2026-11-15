import urllib.request
import re

req = urllib.request.urlopen('http://127.0.0.1:8000/gallery.html', timeout=5)
content = req.read().decode('utf-8')

# Find img tags within the canvas
canvas_start = content.find('class="gallery-canvas"')
if canvas_start >= 0:
    # Find closing div
    depth = 0
    i = canvas_start
    while i < len(content) and depth >= 0:
        if content[i:i+6] == '</div>':
            depth -= 1
        elif content[i:i+5] == '<div>':
            depth += 1
        i += 1
    canvas_end = i
    canvas_content = content[canvas_start:canvas_end]
    
    # Find img tags
    img_tags = re.findall(r'<div[^>]+>', canvas_content)
    print('Photo container divs:', len(img_tags))
    
    # Look for any styles with left/top positions
    left_matches = re.findall(r'left:\s*(\d+)px', canvas_content)
    top_matches = re.findall(r'top:\s*(\d+)px', canvas_content)
    print('Left positions:', left_matches[:10])
    print('Top positions:', top_matches[:10])
else:
    print('Canvas not found')