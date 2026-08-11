from PIL import Image
import os

# Paths
brain_dir = r"C:\Users\PrinceTommy\.gemini\antigravity\brain\f61eed9a-596b-48e4-8b69-53d0e633996e"
mobile_assets = r"c:\Users\PrinceTommy\Desktop\revesta_gh\mobile\assets"

# Source Images
solid_icon = os.path.join(brain_dir, "app_icon_solid_1767391781175.png")
transparent_icon = os.path.join(brain_dir, "app_icon_transparent_1767391762269.png")

# Targets
targets = [
    (solid_icon, os.path.join(mobile_assets, "icon.png")),
    (solid_icon, os.path.join(mobile_assets, "adaptive-icon.png")),
    (solid_icon, os.path.join(mobile_assets, "splash-icon.png"))
]

def sanitize(src, dst):
    try:
        print(f"Processing {src} -> {dst}")
        with Image.open(src) as img:
            # Convert to RGBA to ensure standard channels
            img = img.convert("RGBA")
            # Resize just to force re-render (optional but helps)
            img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
            # Save as PNG with optimized settings, stripping metadata
            img.save(dst, "PNG", optimize=True)
            print("Success!")
    except Exception as e:
        print(f"Failed to process {src}: {e}")

if __name__ == "__main__":
    for src, dst in targets:
        sanitize(src, dst)
