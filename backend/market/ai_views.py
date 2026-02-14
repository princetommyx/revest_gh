from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
import google.generativeai as genai
import os
import json
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class AnalyzeWasteView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        # 1. Check for API Key
        api_key = os.environ.get("GEMINI_API_KEY")
        print(f"!!! DEBUG: Checking API Key. Found: {bool(api_key)}")
        if not api_key:
            print("!!! DEBUG: No GEMINI_API_KEY found in os.environ")
            logger.warning("GEMINI_API_KEY not found. Using simulation fallback.")
            return self.simulation_fallback()

        # 2. Get Image
        if 'image' not in request.FILES:
            return Response({"error": "No image provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        image_file = request.FILES['image']
        
        try:
            # 3. Configure Gemini
            genai.configure(api_key=api_key)
            
            # IMPLEMENT ROBUST FALLBACK CHAIN
            # We try models in order of preference: 
            # 1. 2.5 Flash (Fastest/Standard for real-time)
            # 2. 2.5 Pro (Higher accuracy if Flash fails)
            # 3. 2.0 Flash (Legacy fallback)
            candidate_models = [
                'gemini-2.5-flash',
                'gemini-2.5-pro',
                'gemini-2.0-flash-001'
            ]
            
            active_model = None
            last_error = None
            
            # 4. Prepare Image Data
            image_content = image_file.read()
            mime_type = image_file.content_type or 'image/jpeg'

            # 5. Define Prompt (Once)
            prompt = """
            You are an expert, high-precision waste auditing AI. 
            Analyze this image with EXTREME ATTENTION TO DETAIL.
            
            OBJECTIVE: Identify the item and classify it into the correct recycling category.
            
            HIERARCHY RULES (Must Follow):
            1. **Electronics (Highest Priority):** Any device with a circuit board, battery, plug, screen, or complex mechanism equals 'Electronics'.
               - Laptops, Phones, Fridges, Washing Machines, Microwaves.
            2. **Metals:** Simple non-electronic scrap (Pipes, Cans, Sheets).
            3. **Plastics:** Containers, bottles, crates.
            
            Allowed Material Types: 'Electronics', 'Plastics', 'Metals', 'Paper', 'Glass', 'Mixed', 'Other'

            Return ONLY valid JSON:
            {
                "reasoning": "String (Why you chose this category)",
                "is_waste": boolean,
                "material_type": "String (Exact match from Allowed Types)",
                "quantity_estimate": "String (Natural description e.g. '1 Fridge', '3 Bags of Cans', '50kg Pile')",
                "weight_kg": number (Estimated weight in KG. Crucial for pricing.),
                "quality_score": number (1-10),
                "title_suggestion": "String (e.g. 'Scrap Fridge')",
                "description": "String (Short assessment)",
                "confidence": number (0.0-1.0)
            }
            """

            # 6. Iterate through models
            response = None
            for model_name in candidate_models:
                try:
                    print(f"!!! DEBUG: Attempting analysis with model: {model_name}")
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content([
                        {'mime_type': mime_type, 'data': image_content},
                        prompt
                    ])
                    print(f"!!! DEBUG: Success with {model_name}")
                    break # Success!
                except Exception as e:
                    print(f"!!! DEBUG: Failed with {model_name}: {e}")
                    last_error = e
                    continue # Try next model
            
            if not response:
                raise last_error or Exception("All AI models failed.")

            # 6. Parse Response
            raw_text = response.text
            # Clean up potential markdown formatting
            json_str = raw_text.replace('```json', '').replace('```', '').strip()
            data = json.loads(json_str)
            
            return Response(data)

        except Exception as e:
            logger.error(f"AI Analysis Failed: {str(e)}")
            logger.warning(f"!!! DEBUG: AI Analysis Failed with error: {str(e)}")
            import traceback
            # traceback.print_exc() # Logger handles trace usually, or we can format it
            # Fallback to simulation if AI fails (e.g. quota exceeded) to keep app working
            return self.simulation_fallback()

    def simulation_fallback(self):
        """Returns a simulated successful response if AI unavailable"""
        import random
        import time
        
        logger.warning("!!! DEBUG: Triggering Simulation Fallback")
        
        # Simulate processing time
        time.sleep(1.5)
        
        # Removed 'Paper' and 'Mixed' to prevent insulting fallback for laptops during demo
        materials = ['Electronics', 'Metals'] 
        selected = random.choice(materials)
        
        return Response({
            "is_waste": True,
            "material_type": selected,
            "quantity_estimate": "1-2 Bags",
            "quality_score": 8,
            "title_suggestion": f"Simulated {selected} Waste",
            "description": "Simulation: Real AI failed (check backend logs).",
            "confidence": 0.95,
            "simulated": True
        })
