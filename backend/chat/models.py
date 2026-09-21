from django.db import models
from django.conf import settings

class Message(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField(null=True, blank=True)
    attachment = models.FileField(upload_to='chat_attachments/', null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"From {self.sender} to {self.receiver}"

class SupportSession(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        RESOLVED = 'RESOLVED', 'Resolved'
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_sessions')
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_support')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Support: {self.user.username} ({self.status})"


class SupportAIMessage(models.Model):
    """
    Turn history for the Gemini support bot (market.ai_views.SupportAIChatView).
    The mobile client only ever sends the single latest message - it has no
    way to replay prior turns - so without persisting them here, every call
    to Gemini started from a blank slate: it couldn't answer "when will it
    arrive" if "it" was named two messages ago. Kept separate from Message
    (user-to-user chat) since this is a different conversation entirely,
    between one user and the bot.
    """

    class Role(models.TextChoices):
        USER = 'user', 'User'
        MODEL = 'model', 'Model'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_ai_messages'
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user_id} [{self.role}]: {self.content[:50]}"
