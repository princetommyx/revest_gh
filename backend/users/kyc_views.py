from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from .models import IdentityVerification
from .kyc_utils import encrypt_id_number, decrypt_id_number
import google.generativeai as genai
import os
import json
import logging

logger = logging.getLogger(__name__)

class KYCSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        user = request.user
        
        # Only Collectors and Recyclers require KYC for now
        if user.role not in ['COLLECTOR', 'RECYCLER']:
            return Response({"error": "Identity verification is only required for Collectors and Recyclers."}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure they don't submit if already verified or pending
        if hasattr(user, 'identity_verification'):
            kyc = user.identity_verification
            if kyc.status in ['PENDING', 'VERIFIED']:
                return Response({"error": f"You already have a {kyc.status.lower()} identity verification application."}, status=status.HTTP_400_BAD_REQUEST)

        # Get data
        id_front = request.FILES.get('id_front_image')
        id_back = request.FILES.get('id_back_image')
        selfie = request.FILES.get('selfie_image')
        id_number = request.data.get('id_number')

        if not all([id_front, id_back, selfie, id_number]):
            return Response({"error": "Please provide id_front_image, id_back_image, selfie_image, and id_number"}, status=status.HTTP_400_BAD_REQUEST)

        # Encrypt PIN
        encrypted_pin = encrypt_id_number(id_number)

        # Duplicate Prevention Check: Ensure no OTHER user has verified with this exact ID
        duplicate_exists = IdentityVerification.objects.filter(
            id_number_encrypted=encrypted_pin,
            status__in=['PENDING', 'VERIFIED']
        ).exclude(user=user).exists()

        if duplicate_exists:
            return Response(
                {"error": "This ID number is already associated with an active Revesta account. Duplicate accounts are not allowed."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or Update record
        kyc, created = IdentityVerification.objects.update_or_create(
            user=user,
            defaults={
                'id_front_image': id_front,
                'id_back_image': id_back,
                'selfie_image': selfie,
                'id_number_encrypted': encrypted_pin,
                'status': IdentityVerification.Status.PENDING,
                'rejection_reason': ''
            }
        )

        # Automated Fraud & OCR Check using AI
        self._analyze_submission_async(kyc, id_number)

        return Response({
            "message": "Identity verification submitted successfully. It is now pending review.",
            "status": "PENDING"
        }, status=status.HTTP_201_CREATED)

    def _analyze_submission_async(self, kyc, provided_id_number):
        """
        Runs the AI check. In a production app, this should be sent to Celery.
        For now, doing it synchronously but encapsulated since it's an MVP.
        """
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY missing, skipping automated KYC check.")
            return

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.5-flash')

            # We need to read the file contents to send to Gemini
            kyc.id_front_image.seek(0)
            kyc.selfie_image.seek(0)
            
            front_content = kyc.id_front_image.read()
            selfie_content = kyc.selfie_image.read()

            prompt = f"""
            You are a highly secure Identity Verification (KYC) fraud detection AI.
            I am providing two images:
            1. An official ID Card (Front)
            2. A live selfie of the user

            Perform the following strict checks:
            A. OCR Match: Extract the unique ID number or National ID / Document Number from the ID card. Does it closely match the user provided number '{provided_id_number}'?
            B. Face Match: Does the face in the selfie match the face printed on the ID card?
            C. Fraud Detection: Does the ID card look like a digital screenshot, a photo of a screen, heavily blurred, black and white, or entirely unreadable?

            Output exactly valid JSON in this format:
            {{
                "ocr_match": true/false,
                "face_match": true/false,
                "is_fraudulent": true/false,
                "reasoning": "Explain your findings briefly."
            }}
            """

            response = model.generate_content([
                {'mime_type': 'image/jpeg', 'data': front_content},
                {'mime_type': 'image/jpeg', 'data': selfie_content},
                prompt
            ])

            response_text = response.text.strip().replace('```json', '').replace('```', '')
            analysis = json.loads(response_text)

            # Auto-Verification Logic
            if not analysis.get('is_fraudulent') and analysis.get('face_match') and analysis.get('ocr_match'):
                kyc.status = IdentityVerification.Status.VERIFIED
                kyc.rejection_reason = ''
                kyc.save()
                
                # Activate the User
                kyc.user.is_verified = True
                kyc.user.save(update_fields=['is_verified'])
                logger.info(f"User {kyc.user.username} was automatically VERIFIED by AI.")

            # Mark as REJECTED automatically if definitively fraudulent
            elif analysis.get('is_fraudulent') or not analysis.get('face_match'):
                kyc.status = IdentityVerification.Status.REJECTED
                kyc.rejection_reason = analysis.get('reasoning', 'Automated system flagged submission as invalid or the face did not match.')
                kyc.save()
                logger.info(f"User {kyc.user.username} was automatically REJECTED by AI.")
            
            # Note: We keep PENDING if ocr_match is false but face matches, giving human admins a chance to review typos.
            
        except Exception as e:
            logger.error(f"Automated KYC AI Check failed: {e}")
            # Do not fail request, leave as PENDING for manual review
            pass

class KYCStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if not hasattr(request.user, 'identity_verification'):
            return Response({"status": "UNVERIFIED"})
        
        kyc = request.user.identity_verification
        return Response({
            "status": kyc.status,
            "rejection_reason": kyc.rejection_reason if kyc.status == 'REJECTED' else None,
            "submitted_at": kyc.created_at
        })
