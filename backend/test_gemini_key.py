import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
print(f"Testing with key: {api_key[:10]}...")

try:
    client = genai.Client(api_key=api_key)
    names_to_test = ['gemini-2.5-flash', 'gemini-1.5-pro']
    for name in names_to_test:
        try:
            print(f"Testing {name}...")
            response = client.models.generate_content(
                model=name,
                contents="Say 'Hello'"
            )
            print(f"Success with {name}: {response.text}")
        except Exception as e:
            print(f"Failed with {name}: {e}")
except Exception as e:
    print(f"Error: {e}")


