from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from google import genai
from google.genai import types
import os
import json
import traceback
from datetime import datetime
from django.conf import settings
import logging
from intelligence.buyback import preparation_tips
from intelligence.market_signal import pricing_basis, prompt_context
from intelligence.vision import corrected_weight_kg, prompt_context as vision_prompt_context
from intelligence.services import record_prediction

logger = logging.getLogger(__name__)

class AnalyzeWasteView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        # 1. Check for API Key
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY not found. Using simulation fallback.")
            return self.simulation_fallback(request=request, image_file=request.FILES.get('image'))

        # 2. Get Image
        if 'image' not in request.FILES:
            return Response({"error": "No image provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        image_file = request.FILES['image']
        
        try:
            # 3. Configure Gemini
            client = genai.Client(api_key=api_key)
            
            # Two models, not three: each candidate is a real network round
            # trip to Google, and Render's free tier kills a request that
            # runs too long before our own try/except ever gets a chance to
            # return the simulation fallback - a slow/failing third
            # candidate (gemini-1.5-flash is on Google's older, increasingly
            # unreliable track) was adding latency without adding a
            # meaningfully different fallback.
            candidate_models = [
                'gemini-flash-latest',
                'gemini-2.0-flash',
            ]
            
            active_model = None
            last_error = None
            
            # 4. Prepare Image Data
            image_content = image_file.read()
            mime_type = image_file.content_type or 'image/jpeg'

            # 5. Define Prompt (Once)
            #
            # Deliberately no GHS figures in here. This prompt used to hardcode
            # a pricing table ("PURE_WATER_RUBBERS: 30 GH₵...") that only ever
            # matched logistics/pricing.py by coincidence - it was never read
            # from there, so the two silently drifted, and Gemini would echo
            # its own stale number into the "description" field while the
            # actual estimated_cost/estimated_earnings below it (correctly
            # computed from calculate_track_a_fee/calculate_track_b_earnings)
            # showed something different. The model doesn't need to know
            # prices to classify material and estimate weight - it's told
            # explicitly not to guess at them, and the real number is filled
            # in server-side, from the one place pricing actually lives.
            prompt = """
            You are an expert, high-precision waste auditing AI for 'Revesta'.
            Analyze this image with EXTREME ATTENTION TO DETAIL.

            OBJECTIVE:
            1. Identify the item and classify it into Track A or Track B.
            2. Extract material details and estimate metrics.

            CLASSIFICATION LOGIC:
            - **Track A (Paid Disposal):** Organic waste, diapers, food scraps, mixed household trash that cannot be easily recycled.
            - **Track B (Value Buyback):** High-value recyclables like PET (bottles), HDPE (containers), Aluminum (cans), Paper/Cardboard, Electronics, or Scrap Metal.

            Allowed Material Types: 'PET', 'HDPE', 'ALUMINUM', 'PAPER', 'ELECTRONICS', 'METALS', 'PURE_WATER_RUBBERS', 'PURE_WATER_RUBBERS_BALE', 'PLASTIC_BOTTLES', 'PLASTIC_BOTTLES_BALE', 'MIXED', 'ORGANIC', 'OTHER'

            NOTE: If you see large compressed/bundled bales of pure water sachets or bottles, classify as the 'BALE' version.
            Otherwise use 'PURE_WATER_RUBBERS' or 'PLASTIC_BOTTLES'.

            PRICING: Do not invent or state a price anywhere in your answer, including
            in "description" and "reasoning". Revesta computes the real price
            separately from your material_type/weight/bag_size output - a price you
            state yourself will not match it and will only mislead the person reading it.

            EXAMPLE (for format only - your actual material_type/weight must come from the image):
            {
                "track_type": "B",
                "reasoning": "Clear PET bottles, no cap contamination visible, loosely piled rather than baled.",
                "material_type": "PET",
                "quantity_estimate": "1 Large Bag",
                "suggested_bag_size": null,
                "suggested_weight_kg": 8.5,
                "title_suggestion": "PET Bottles",
                "description": "A large bag of clear plastic bottles, mostly beverage containers, no visible contamination.",
                "confidence": 0.9
            }

            Return ONLY valid JSON matching that shape:
            {
                "track_type": "A" or "B",
                "reasoning": "String (Why you chose this track and category)",
                "material_type": "String (Exact match from Allowed Types)",
                "quantity_estimate": "String (e.g. '3 Large Bags', '10kg Pile')",
                "suggested_bag_size": "SMALL", "MEDIUM", "LARGE", or "XLARGE" (Track A only, otherwise null),
                "suggested_weight_kg": number (Track B only, estimated weight in KG, otherwise null),
                "title_suggestion": "String (e.g. 'Pure Water Rubbers')",
                "description": "String (Brief assessment, no prices)",
                "confidence": number (0.0-1.0),
                "condition": {
                    "contamination": "none", "light", or "heavy",
                    "dry": true or false (null if you cannot tell),
                    "prepared": true or false (null if you cannot tell),
                    "notes": "String (what you saw that decided this)"
                }
            }

            CONDITION - READ THIS CAREFULLY, IT SETS THE PRICE:
            Recyclers pay a range, not a fixed rate, and condition decides
            where in that range a load lands. Judge only what you can
            actually see; use null rather than guessing.
            - "contamination": is the load clean and single-material, or
              mixed with food waste, liquid, dirt, or other materials?
            - "dry": is there visible wet, damp, or water-stained material?
              Say false if you can see moisture, true if it is clearly dry.
            - "prepared": has it been made ready the way a buyer wants for
              THIS material (see the preparation guidance below, if given)?
            """

            # 5b. Ground the model in what Revesta's disposers actually put
            # out. Without this the model classifies Ghanaian household
            # waste on a generic prior - it has no way to know that sachet
            # rubbers dominate, that loads arrive as sacks rather than
            # industrial bales, or that a "worthless" dead phone is
            # something people expect real money for. Appended rather than
            # folded into the prompt above so that when there aren't enough
            # survey responses yet, the prompt is byte-for-byte the one
            # that has been running all along.
            market_context = prompt_context()
            if market_context:
                prompt = f"{prompt}\n\n{market_context}\n"

            # And what this model has actually been corrected on. Every other
            # input to this prompt is somebody else's data; this is the only
            # one that is the model's own track record, and a named blind
            # spot ("you have called PET when it was HDPE 4 times") is
            # something it can act on in a way that "be accurate" is not.
            track_record = vision_prompt_context()
            if track_record:
                prompt = f"{prompt}\n\n{track_record}\n"

            # 6. Iterate through models
            response = None
            for model_name in candidate_models:
                try:
                    # Without an explicit deadline, a stalled call to Google
                    # can hang well past Render's own platform request
                    # timeout, which kills the connection before this view
                    # ever gets to return the simulation fallback below - the
                    # client then sees a bare network error instead of the
                    # graceful "Estimated (offline mode)" response.
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            types.Part.from_bytes(data=image_content, mime_type=mime_type),
                            prompt
                        ],
                        # Guarantees a bare JSON body instead of relying on the
                        # model choosing not to wrap it in a ```json fence -
                        # the markdown-stripping below stays as a defensive
                        # fallback, not the primary way this gets parsed.
                        config=types.GenerateContentConfig(response_mime_type='application/json'),
                    )
                    break # Success!
                except Exception as e:
                    logger.warning(f"AI Analysis: model {model_name} failed: {e}")
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
            from logistics.pricing import calculate_track_a_fee, calculate_track_b_earnings, price_guardrail
            if data.get('track_type') == 'A':
                bag_size = data.get('suggested_bag_size', 'MEDIUM')
                category = data.get('material_type', 'General')
                estimated = calculate_track_a_fee(category=category, bag_size=bag_size)
                data['estimated_cost'] = float(estimated)
            elif data.get('track_type') == 'B':
                material = data.get('material_type', 'PET')
                # Corrected for the bias measured against real scale weights
                # before it becomes money. A model that reads consistently
                # light makes every payout light by the same margin, and no
                # amount of correct pricing downstream recovers that.
                raw_weight = data.get('suggested_weight_kg', 0)
                weight = corrected_weight_kg(raw_weight, material)
                if weight != raw_weight:
                    data['suggested_weight_kg'] = weight
                    data['raw_weight_estimate_kg'] = raw_weight
                # Priced from where this load sits in its band, not from the
                # band's midpoint: the model has just looked at it, so there
                # is no reason to pay it as though nobody had.
                estimated = calculate_track_b_earnings(
                    material, weight, condition=data.get('condition')
                )
                data['estimated_earnings'] = float(estimated)
                tips = preparation_tips(material)
                if tips:
                    # A smaller number should always arrive with the reason
                    # and the remedy. The survey asked what would make people
                    # sell more of their waste; every free-text answer came
                    # back some version of "knowing I'll get value for it".
                    data['preparation_tips'] = tips
            else:
                estimated = None

            if estimated is not None:
                min_price, max_price = price_guardrail(estimated)
                data['min_price'] = float(min_price)
                data['max_price'] = float(max_price)

            # What the price above was actually derived from. Sent back so
            # the app can explain a payout ("GHS 30/sack, from 6 disposer
            # responses") instead of quoting a number from nowhere, and
            # logged with the prediction so a later look-back can tell which
            # signal shaped which quote - a price that moved for a reason
            # nobody recorded isn't training data, it's noise.
            data['pricing_basis'] = pricing_basis(bool(market_context))

            record_prediction(
                task='waste_analysis',
                model_version=model_name,
                output=data,
                user=request.user,
                input_ref=image_file.name,
                confidence=data.get('confidence'),
            )
            return Response(data)

        except Exception as e:
            logger.error(f"AI Analysis Failed: {str(e)}\n{traceback.format_exc()}")
            return self.simulation_fallback(request=request, image_file=image_file)

    def simulation_fallback(self, request=None, image_file=None):
        """Returns a simulated successful response if AI unavailable"""
        import random
        import time
        from logistics.pricing import calculate_track_a_fee, calculate_track_b_earnings, price_guardrail

        time.sleep(1.5)

        tracks = ['A', 'B']
        track = random.choice(tracks)

        if track == 'A':
            bag_size = random.choice(['SMALL', 'MEDIUM', 'LARGE'])
            category = 'General'
            estimated = calculate_track_a_fee(category=category, bag_size=bag_size)
            min_price, max_price = price_guardrail(estimated)
            data = {
                "track_type": "A",
                "material_type": category,
                "quantity_estimate": f"1 {bag_size.title()} Bag",
                "suggested_bag_size": bag_size,
                "suggested_weight_kg": None,
                "estimated_cost": float(estimated),
                "min_price": float(min_price),
                "max_price": float(max_price),
                "title_suggestion": "General Waste Pickup",
                "description": "Simulation: Household trash identified.",
                "confidence": 0.85,
                "simulated": True,
                "pricing_basis": pricing_basis(),
            }
        else:
            material = random.choice(['PET', 'Aluminum', 'Electronics'])
            weight = random.uniform(5.0, 25.0)
            estimated = calculate_track_b_earnings(material.upper(), weight)
            min_price, max_price = price_guardrail(estimated)
            data = {
                "track_type": "B",
                "material_type": material,
                "quantity_estimate": f"{weight:.1f}kg of {material}",
                "suggested_bag_size": None,
                "suggested_weight_kg": round(weight, 1),
                "estimated_earnings": float(estimated),
                "min_price": float(min_price),
                "max_price": float(max_price),
                "title_suggestion": f"{material} Recycling",
                "description": f"Simulation: {material} recyclables detected.",
                "confidence": 0.92,
                "simulated": True,
                "pricing_basis": pricing_basis(),
            }

        record_prediction(
            task='waste_analysis',
            model_version='simulation-fallback',
            output=data,
            user=request.user if request else None,
            input_ref=image_file.name if image_file else '',
            confidence=data.get('confidence'),
        )
        return Response(data)

from chat.models import SupportSession, SupportAIMessage
from users.models import Notification
from admin_dashboard.models import AdminNotification

# How many past turns (user + model messages combined) to replay to Gemini
# as context. The client only ever sends the latest message - it has no way
# to hand back prior turns itself - so this is the only memory the bot has
# across a conversation. Capped rather than unbounded so a long-running
# session doesn't grow the request payload/cost without limit.
SUPPORT_CHAT_HISTORY_TURNS = 10

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
            client = genai.Client(api_key=api_key)

            chat_context = """
            You are 'ReVesta AI', the official support assistant for ReVesta.
            Help users with basic queries concisely. Detect if the user needs human support.
            If they need a human, start your response with '[HANDOFF_TRIGGER]'.
            Speak like a helpful, modern Ghanaian assistant.
            Do not use any markdown formatting like asterisks (**) or bold text.
            """

            # Replay recent turns so the model has actual conversation memory -
            # without this every message started from a blank slate and
            # couldn't resolve something as basic as "when will it arrive"
            # referring back to what "it" was two messages ago.
            history = SupportAIMessage.objects.filter(user=request.user).order_by('-created_at')[:SUPPORT_CHAT_HISTORY_TURNS]
            contents = [
                types.Content(role=msg.role, parts=[types.Part.from_text(text=msg.content)])
                for msg in reversed(history)
            ]
            contents.append(types.Content(role='user', parts=[types.Part.from_text(text=user_message)]))

            # Using 2.5-flash as it's the confirmed functional model with available quota
            response = client.models.generate_content(
                model='gemini-flash-latest',
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=chat_context,
                )
            )
            ai_reply = response.text

            handoff_active = "[HANDOFF_TRIGGER]" in ai_reply
            clean_reply = ai_reply.replace("[HANDOFF_TRIGGER]", "").strip()
            session_id = None

            SupportAIMessage.objects.bulk_create([
                SupportAIMessage(user=request.user, role=SupportAIMessage.Role.USER, content=user_message),
                SupportAIMessage(user=request.user, role=SupportAIMessage.Role.MODEL, content=clean_reply),
            ])
            
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
