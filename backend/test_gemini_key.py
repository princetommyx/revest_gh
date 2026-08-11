import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
print(f"Testing with key: {api_key[:10]}...")

try:
    genai.configure(api_key=api_key)
    names_to_test = ['models/gemini-flash-latest', 'models/gemini-pro-latest', 'gemini-flash-latest']
    for name in names_to_test:
        try:
            print(f"Testing {name}...")
            model = genai.GenerativeModel(name)
            response = model.generate_content("Say 'Hello'")
            print(f"Success with {name}: {response.text}")
        except Exception as e:
            print(f"Failed with {name}: {e}")
except Exception as e:
    print(f"Error: {e}")


