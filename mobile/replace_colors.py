import os

replacements = {
    '#2E7D32': '#111',
    '#388E3C': '#222',
    '#1B5E20': '#111',
    '#E8F5E9': '#F3F4F6',
    '#F0F7F4': '#FAFAFA'
}

def process_dir(directory):
    for root, _, files in os.walk(directory):
        for f in files:
            if f.endswith('.js'):
                path = os.path.join(root, f)
                with open(path, 'r') as file:
                    content = file.read()
                
                original = content
                for old, new in replacements.items():
                    content = content.replace(old, new)
                    content = content.replace(old.lower(), new)
                
                if content != original:
                    with open(path, 'w') as file:
                        file.write(content)
                    print(f"Updated {path}")

process_dir('src/screens')
process_dir('src/components')
process_dir('src/navigation')
