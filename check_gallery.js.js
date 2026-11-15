with open('D:\projects\portfolio 2\js\gallery.js', 'r', encoding='utf-8') as f:
    c = f.read()

length = len(c)
has_render = 'renderGallery' in c
has_fetch = 'fetch' in c
has_projects = 'projects.json' in c

# Check html +=' presence using find
idx = c.find('html +=')
has_html = idx >= 0

# Check insertAdjacentHTML
has_insert = 'insertAdjacentHTML' in c

# Check braces
open_b = c.count('{')
close_b = c.count('}')
balanced = "BALANCED" if open_b == close_b else "UNBALANCED"

print('Length:', length)
print('Has renderGallery:', has_render)
print('Has fetch:', has_fetch)
print('Has projects.json:', has_projects)
print('Has html +=' , has_html)
print('Has insertAdjacentHTML:', has_insert)
print(f'Braces: {open_b} open / {close_b} close - {balanced}')