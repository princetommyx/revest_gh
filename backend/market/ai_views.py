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
