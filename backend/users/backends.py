from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

User = get_user_model()

class EmailOrPhoneBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('username')
        
        print(f"DEBUG: Authenticating user: {username}")
        
        # Normalize Phone Number if provided
        normalized_username = username
        if username and username.lstrip('+').isdigit():
            clean = username.lstrip('+').replace(' ', '')
            if clean.startswith('0'):
                normalized_username = '233' + clean[1:]
            elif len(clean) == 9:
                normalized_username = '233' + clean
            else:
                normalized_username = clean
            print(f"DEBUG: Normalized {username} to {normalized_username}")

        try:
            # Check if the username matches username, email, or phone_number
            # Order by -date_joined to pick the most recent account if duplicates exist
            user = User.objects.filter(
                Q(username=username) | 
                Q(email=username) | 
                Q(phone_number=username) |
                Q(phone_number=normalized_username)
            ).order_by('-date_joined').first()
            
            if not user:
                print(f"DEBUG: No user found matching {username}")
                return None
                
            print(f"DEBUG: Found user: {user.username} (ID: {user.id})")
        except Exception as e:
            print(f"DEBUG: Error looking up user: {e}")
            return None
        
        if user.check_password(password):
            print(f"DEBUG: Password verification successful for {user.username}")
            if self.user_can_authenticate(user):
                print(f"DEBUG: User can authenticate: {user.username}")
                return user
            else:
                print(f"DEBUG: User cannot authenticate (is_active=False?): {user.username}")
        else:
            print(f"DEBUG: Password verification FAILED for {user.username}")
            
        return None
