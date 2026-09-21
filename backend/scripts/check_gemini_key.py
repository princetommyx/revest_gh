# Body wrapped in main() so importing this module can never fire a live
# API call, SMS or database write. It used to run everything at import
# time, which meant `manage.py test` executed it as a side effect of
# discovering it - see scripts/README.md.

# Running this file directly puts scripts/ on sys.path rather than backend/,
# so the project package would not be importable. Fixed here rather than by
# expecting everyone to remember to set PYTHONPATH first.
import os as _os
import sys as _sys

_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

def main():
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


if __name__ == "__main__":
    main()
