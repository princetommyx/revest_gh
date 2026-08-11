
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "revesta_backend.settings")
django.setup()

from chat.models import Message, SupportSession
from users.models import User

# Check active sessions
active_sessions = SupportSession.objects.filter(status='ACTIVE')
print(f"Active Sessions: {active_sessions.count()}")
for session in active_sessions:
    adm = session.admin
    print(f"Session {session.id} - User: {session.user.username}({session.user.role}) - Admin: {adm.username if adm else 'None'}({adm.role if adm else 'N/A'})")
    
# Check specific user role
u = User.objects.filter(username='admin').first()
if u:
    print(f"\nUser 'admin' details: Role={u.role}, is_staff={u.is_staff}, is_support={u.is_support}")

# Check all admins
print(f"\nUsers with role 'ADMIN': {list(User.objects.filter(role='ADMIN').values_list('username', flat=True))}")

# Check last 10 messages
messages = Message.objects.all().order_by('-timestamp')[:10]
print("\nLast 10 Messages:")
for m in messages:
    sender = m.sender
    receiver = m.receiver
    print(f"ID: {m.id} | From: {sender.username}({sender.role}) | To: {receiver.username}({receiver.role}) | Content: {m.content[:30]}... | Time: {m.timestamp}")
