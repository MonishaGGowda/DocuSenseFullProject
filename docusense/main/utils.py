import google.generativeai as genai
from django.conf import settings

def generate_summary(prompt):
    """Generate text using the Gemini API."""
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)

        generation_config = {
            "temperature": 1,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
            "response_mime_type": "application/json"
        }
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=generation_config,
        )
        response = model.generate_content(prompt)
        return response.text.strip() 
    except Exception as e:
        print("Error generating summary:", e)
        raise e
