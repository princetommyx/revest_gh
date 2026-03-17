import logging
import requests
import threading
from django.conf import settings

logger = logging.getLogger('revesta.sms')

class HubtelSMSService:
    """
    Service for sending SMS via Hubtel API.
    """
    def __init__(self):
        self.client_id = getattr(settings, 'HUBTEL_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'HUBTEL_CLIENT_SECRET', None)
        self.sender = getattr(settings, 'HUBTEL_FROM', 'Revesta')
        self.base_url = "https://smsc.hubtel.com/v1/messages/send"
        self.otp_send_url = "https://api-otp.hubtel.com/v1/otp/send"
        self.otp_verify_url = "https://api-otp.hubtel.com/v1/otp/verify"

    def send(self, to, content):
        """
        Send SMS to a specific number using Hubtel Standard SMS POST API.
        """
        if not self.client_id or not self.client_secret:
            logger.error("Hubtel credentials not configured.")
            return False

        # Strict Normalization for Ghana (233...)
        formatted_to = to.lstrip('+').replace(' ', '')
        if formatted_to.startswith('0'):
            formatted_to = '233' + formatted_to[1:]
        elif not formatted_to.startswith('233') and len(formatted_to) == 9:
            formatted_to = '233' + formatted_to

        payload = {
            'From': self.sender,
            'To': formatted_to,
            'Content': content,
            'RegisteredId': '' # Optional registered ID for some Hubtel accounts
        }

        try:
            from requests.auth import HTTPBasicAuth
            # Hubtel SMS API supports Basic Auth for POST on smsc.hubtel.com
            response = requests.post(
                self.base_url, 
                json=payload, 
                auth=HTTPBasicAuth(self.client_id, self.client_secret),
                timeout=15
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"SMS sent successfully to {formatted_to}")
                print(f"DEBUG: Hubtel SMS Sent to {formatted_to} successfully.")
                return True
            else:
                logger.error(f"Failed to send SMS to {formatted_to}: {response.status_code} - {response.text}")
                print(f"DEBUG: Hubtel SMS FAILED for {formatted_to}. Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error calling Hubtel SMS API: {e}")
            return False

    def request_otp(self, phone_number):
        """
        Request Hubtel to generate and send an OTP using Managed Verification.
        """
        if not self.client_id or not self.client_secret:
            logger.error("Hubtel credentials not configured.")
            return False

        # Strict Normalization
        formatted_phone = phone_number.lstrip('+').replace(' ', '')
        if formatted_phone.startswith('0'):
            formatted_phone = '233' + formatted_phone[1:]

        payload = {
            'SenderId': self.sender,
            'PhoneNumber': formatted_phone
        }

        try:
            from requests.auth import HTTPBasicAuth
            response = requests.post(
                self.otp_send_url, 
                json=payload, 
                auth=HTTPBasicAuth(self.client_id, self.client_secret),
                timeout=15
            )
            print(f"DEBUG: Hubtel OTP Request Status: {response.status_code}")
            print(f"DEBUG: Hubtel OTP Request Response: {response.text}")
            
            if response.status_code in [200, 201]:
                logger.info(f"Hubtel OTP request successful for {formatted_phone}")
                return True
            else:
                logger.error(f"Failed to request Hubtel OTP for {formatted_phone}. Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error calling Hubtel OTP API: {e}")
            return False

    def verify_otp(self, phone_number, code):
        """
        Verify an OTP via Hubtel.
        """
        if not self.client_id or not self.client_secret:
            logger.error("Hubtel credentials not configured.")
            return False

        formatted_phone = phone_number.lstrip('+')

        payload = {
            'PhoneNumber': formatted_phone,
            'Code': code
        }

        try:
            from requests.auth import HTTPBasicAuth
            response = requests.post(
                self.otp_verify_url, 
                json=payload, 
                auth=HTTPBasicAuth(self.client_id, self.client_secret),
                timeout=15
            )
            print(f"DEBUG: Hubtel OTP Verify Status: {response.status_code}")
            print(f"DEBUG: Hubtel OTP Verify Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                # Hubtel V1/V2 Managed Verification response check
                # Response usually contains {"status": "success"} or similar
                if data.get('status') == 'Success' or data.get('Status') == 'Success' or data.get('data', {}).get('status') == 'Success':
                    logger.info(f"Hubtel OTP verification successful for {formatted_phone}")
                    return True
                else:
                    logger.warning(f"Hubtel OTP verification failed for {formatted_phone}: {data}")
                    return False
            else:
                logger.error(f"Failed to verify Hubtel OTP for {formatted_phone}. Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error calling Hubtel Verify API: {e}")
            return False

def send_sms_async(to, content):
    """
    Send SMS in a background thread.
    """
    def _send():
        service = HubtelSMSService()
        service.send(to, content)

    thread = threading.Thread(target=_send, daemon=True)
    thread.start()

# --- Helper Functions ---

def send_otp_sms(phone_number, otp):
    """
    Send OTP verification SMS.
    """
    content = f"Your Revesta verification code is: {otp}. Valid for 2 minutes."
    send_sms_async(phone_number, content)

def send_login_sms(phone_number, username):
    """
    Send login alert SMS.
    """
    content = f"Hello {username}, a new login was detected on your Revesta account. If this wasn't you, please secure your account."
    send_sms_async(phone_number, content)

def send_withdrawal_sms(phone_number, amount, currency='GHS'):
    """
    Send withdrawal request SMS.
    """
    content = f"Withdrawal request of {currency} {amount} initiated from your Revesta wallet. If this wasn't you, contact support immediately."
    send_sms_async(phone_number, content)
