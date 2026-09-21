from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("No API Key found")
    exit()

print(f"Using Key: {api_key[:10]}...")
client = genai.Client(api_key=api_key)

print("Listing available models...")
try:
    for m in client.models.list():
        print(m.name)
except Exception as e:
    print(f"Error: {e}")
