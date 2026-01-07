import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
key = os.getenv("GOOGLE_API_KEY")
print(f"Loaded Key: {key[:5]}...{key[-3:] if key else 'None'}")

if not key:
    print("KEY IS MISSING from environment.")
    exit()

print("Attempting to list models...")
genai.configure(api_key=key)
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"FAILURE: {e}")
