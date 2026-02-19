from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
import google.generativeai as genai
import os
import json
import traceback
from datetime import datetime
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
            You are an expert, high-precision waste auditing AI for 'Revesta'.
            Analyze this image with EXTREME ATTENTION TO DETAIL.
            
            OBJECTIVE: 
            1. Identify the item and classify it into Track A or Track B.
            2. Extract material details and estimate metrics.

            CLASSIFICATION LOGIC:
            - **Track A (Paid Disposal):** Organic waste, diapers, food scraps, mixed household trash that cannot be easily recycled.
            - **Track B (Value Buyback):** High-value recyclables like PET (bottles), HDPE (containers), Aluminum (cans), Paper/Cardboard, Electronics, or Scrap Metal.

            Allowed Material Types: 'PET', 'HDPE', 'Aluminum', 'Paper', 'Electronics', 'Metals', 'Mixed', 'Organic', 'Other'

            Return ONLY valid JSON:
            {
                "track_type": "A" or "B",
                "reasoning": "String (Why you chose this track and category)",
                "material_type": "String (Exact match from Allowed Types)",
                "quantity_estimate": "String (e.g. '3 Large Bags', '10kg Pile')",
                "suggested_bag_size": "SMALL", "MEDIUM", "LARGE", or "XLARGE" (Track A only, otherwise null),
                "suggested_weight_kg": number (Track B only, estimated weight in KG, otherwise null),
                "title_suggestion": "String (e.g. 'PET Bottle Collection')",
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
            
            # Enrich with Estimated Financials
            from logistics.pricing import calculate_track_a_fee, calculate_track_b_earnings
            if data.get('track_type') == 'A':
                bag_size = data.get('suggested_bag_size', 'MEDIUM')
                category = data.get('material_type', 'General')
                data['estimated_cost'] = float(calculate_track_a_fee(category=category, bag_size=bag_size))
            elif data.get('track_type') == 'B':
                weight = data.get('suggested_weight_kg', 0)
                material = data.get('material_type', 'PET')
                data['estimated_earnings'] = float(calculate_track_b_earnings(material, weight))

            return Response(data)

        except Exception as e:
            logger.error(f"AI Analysis Failed: {str(e)}")
            logger.warning(f"!!! DEBUG: AI Analysis Failed with error: {str(e)}")
            return self.simulation_fallback()

    def simulation_fallback(self):
        """Returns a simulated successful response if AI unavailable"""
        import random
        import time
        from logistics.pricing import calculate_track_a_fee, calculate_track_b_earnings
        
        logger.warning("!!! DEBUG: Triggering Simulation Fallback")
        time.sleep(1.5)
        
        tracks = ['A', 'B']
        track = random.choice(tracks)
        
        if track == 'A':
            bag_size = random.choice(['SMALL', 'MEDIUM', 'LARGE'])
            category = 'General'
            return Response({
                "track_type": "A",
                "material_type": category,
                "quantity_estimate": f"1 {bag_size.title()} Bag",
                "suggested_bag_size": bag_size,
                "suggested_weight_kg": None,
                "estimated_cost": float(calculate_track_a_fee(category=category, bag_size=bag_size)),
                "title_suggestion": "General Waste Pickup",
                "description": "Simulation: Household trash identified.",
                "confidence": 0.85,
                "simulated": True
            })
        else:
            material = random.choice(['PET', 'Aluminum', 'Electronics'])
            weight = random.uniform(5.0, 25.0)
            return Response({
                "track_type": "B",
                "material_type": material,
                "quantity_estimate": f"{weight:.1f}kg of {material}",
                "suggested_bag_size": None,
                "suggested_weight_kg": round(weight, 1),
                "estimated_earnings": float(calculate_track_b_earnings(material.upper(), weight)),
                "title_suggestion": f"{material} Recycling",
                "description": f"Simulation: {material} recyclables detected.",
                "confidence": 0.92,
                "simulated": True
            })

from chat.models import SupportSession
from users.models import Notification
from admin_dashboard.models import AdminNotification

class SupportAIChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user_message = request.data.get('message')
        api_key = os.environ.get("GEMINI_API_KEY")
        
        if not api_key:
            return Response({
                "reply": "I'm currently working in offline mode, but I can still answer basic questions! How can I help?",
                "handoff": False
            })

        if not user_message:
            return Response({"error": "No message provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            genai.configure(api_key=api_key)
            
            chat_context = """
            You are 'ReVesta AI', the official support assistant for ReVesta.
            Help users with basic queries concisely. Detect if the user needs human support.
            If they need a human, start your response with '[HANDOFF_TRIGGER]'.
            Speak like a helpful, modern Ghanaian assistant.
            """
            
            # Using 2.5-flash as it's the confirmed functional model with available quota
            model = genai.GenerativeModel(
                model_name='models/gemini-2.5-flash',
                system_instruction=chat_context
            )
            
            response = model.generate_content(user_message)
            ai_reply = response.text
            
            handoff_active = "[HANDOFF_TRIGGER]" in ai_reply
            clean_reply = ai_reply.replace("[HANDOFF_TRIGGER]", "").strip()
            session_id = None
            
            if handoff_active:
                # Create Support Session
                session, created = SupportSession.objects.get_or_create(
                    user=request.user,
                    status=SupportSession.Status.ACTIVE
                )
                session_id = session.id
                
                if created:
                    # Notify admins
                    from users.models import User
                    from django.db.models import Q
                    admins = User.objects.filter(Q(is_staff=True) | Q(is_support=True) | Q(role='ADMIN'))
                    for admin in admins:
                        Notification.objects.create(
                            user=admin,
                            title="🆘 Human Support Requested",
                            body=f"User {request.user.username} (Phone: {request.user.phone_number}) needs assistance.",
                            data={"type": "SUPPORT_REQUEST", "session_id": session.id, "user_id": request.user.id},
                            urgency=Notification.Urgency.URGENT
                        )
            
            return Response({
                "reply": clean_reply,
                "handoff": handoff_active,
                "session_id": session_id
            })

        except Exception as e:
            error_str = str(e)
            logger.error(f"Support AI Error: {error_str}")

            # User-friendly responses for common API issues
            if "429" in error_str or "quota" in error_str.lower():
                return Response({
                    "reply": "I'm a bit overwhelmed with questions right now! Please wait a few seconds and try again, or ask for a human agent.",
                    "handoff": False
                })
            
            return Response({
                "reply": "I'm having a bit of trouble connecting to my brain right now. Please try again or email support@revesta.com!",
                "handoff": False
            })
