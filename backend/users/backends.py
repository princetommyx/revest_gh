from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

User = get_user_model()

class EmailOrPhoneBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('username')
        
        print(f"DEBUG: Authenticating user: {username}")
        
        try:
            # Check if the username matches username, email, or phone_number
            user = User.objects.get(
                Q(username=username) | 
                Q(email=username) | 
                Q(phone_number=username)
            )
            print(f"DEBUG: Found user: {user.username} (ID: {user.id})")
        except User.DoesNotExist:
            print(f"DEBUG: No user found matching {username}")
            return None
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
