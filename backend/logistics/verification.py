import google.generativeai as genai
import os
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def verify_scale_photo(image_content, mime_type, manual_weight_kg):
    """
    AI verification to prevent fraud.
    Compares visual weight in photo with manually entered weight.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY missing for weight verification. Falling back to manual approval.")
        return True, 0, "AI Verification unavailable. Proceeding with manual weight."

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-001') # Fast model for verification

        prompt = f"""
        Analyze this SCALE PHOTO.
        The collector reports the weight as {manual_weight_kg} kg.
        
        TASKS:
        1. Identify the weight displayed on the digital or analog scale in the photo.
        2. If the scale is not clearly visible, estimate the weight of the waste shown (e.g. bags of plastic).
        3. Compare the visual weight with the reported weight ({manual_weight_kg} kg).
        
        Return JSON:
        {{
            "visual_weight_estimate": number,
            "is_match": boolean (True if within 20% margin of error),
            "reasoning": "string",
            "confidence": number
        }}
        """

        response = model.generate_content([
            {'mime_type': mime_type, 'data': image_content},
            prompt
        ])
        
        json_str = response.text.replace('```json', '').replace('```', '').strip()
        data = json.loads(json_str)
        
        visual_weight = data.get('visual_weight_estimate', 0)
        is_verified = data.get('is_match', False)
        
        # Additional safety check
        if manual_weight_kg > 0:
            diff_percent = abs(visual_weight - manual_weight_kg) / manual_weight_kg
            if diff_percent > 0.3: # 30% strict threshold regardless of AI boolean
                 is_verified = False

        return is_verified, visual_weight, data.get('reasoning', "Verification complete.")

    except Exception as e:
        logger.error(f"Scale photo verification failed: {e}")
        return True, 0, f"Error during AI verification: {str(e)}. Defaulting to True for UX."
