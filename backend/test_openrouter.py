
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

api_key = os.getenv("OPENROUTER_API_KEY")
model = os.getenv("OPENROUTER_MODEL", "openrouter/free")

if not api_key:
    raise SystemExit("API key missing. Check backend/.env")

client = OpenAI(
    api_key=api_key,
    base_url="https://openrouter.ai/api/v1",
)

try:
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": "Reply with exactly: TRACE AI connected",
            }
        ],
        max_tokens=200,
    )
    print("Selected model:", response.model)
    print("Finish reason:", response.choices[0].finish_reason)
    print("AI response:", repr(response.choices[0].message.content))
    print("Usage:", response.usage)
except Exception as exc:
    print("Connection failed:", type(exc).__name__)
    print(str(exc)[:500])
