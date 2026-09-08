from rest_framework.throttling import SimpleRateThrottle

class OTPIdentifierRateThrottle(SimpleRateThrottle):
    """
    Limits the rate of OTP requests per identifier (email or phone) 
    to prevent spamming a specific user.
    """
    scope = 'otp_identifier'

    def get_cache_key(self, request, view):
        identifier = request.data.get("identifier")
        if not identifier:
            return None
        
        # Normalize the identifier so +233 and 0 format map to the same key
        identifier = identifier.replace(" ", "").lower()
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': identifier
        }
