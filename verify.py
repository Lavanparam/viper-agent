import requests
import sys

def test_chat():
    url = "http://127.0.0.1:8002/chat"
    payload = {
        "message": "Explain the Prisoner's Dilemma and how I should play it.",
        "history": []
    }
    
    try:
        print(f"Testing {url}...")
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        print("Response received:")
        print(data["response"][:200] + "...") # Print first 200 chars
        return True
    except requests.exceptions.HTTPError as e:
        print(f"Test failed: {e}")
        print(f"Server Error Detail: {response.text}")
        return False
    except Exception as e:
        print(f"Test failed: {e}")
        return False

if __name__ == "__main__":
    if test_chat():
        print("VERIFICATION SUCCESS")
    else:
        print("VERIFICATION FAILED")
