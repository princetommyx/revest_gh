import sys
from PIL import Image

def process_image(in_path, out_path):
    img = Image.open(in_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # Look for pure magenta (or very close)
        r, g, b, a = item
        if r > 240 and g < 20 and b > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(out_path, "PNG")

if __name__ == "__main__":
    process_image(sys.argv[1], sys.argv[2])
