from django.conf import settings
from django.db import models


class BlockedUser(models.Model):
    """
    One user blocking another. Directional on purpose: A blocking B is a
    statement about what A wants to see, not a mutual relationship. Everywhere
    it is enforced, though, it is enforced in BOTH directions - once either
    side blocks, neither can message the other or see the other's listings.
    Otherwise the blocked party could keep talking at someone who blocked them.
    """
    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blocking'
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blocked_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')
        indexes = [
            models.Index(fields=['blocker']),
            models.Index(fields=['blocked']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.blocker} blocked {self.blocked}"

    @staticmethod
    def blocked_user_ids(user):
        """
        Every user id that `user` should not see, in either direction: people
        they blocked, plus people who blocked them.
        """
        if not user or not user.is_authenticated:
            return set()
        outgoing = BlockedUser.objects.filter(blocker=user).values_list('blocked_id', flat=True)
        incoming = BlockedUser.objects.filter(blocked=user).values_list('blocker_id', flat=True)
        return set(outgoing) | set(incoming)

    @staticmethod
    def is_blocked_between(user_a, user_b):
        """True if either user has blocked the other."""
        if not user_a or not user_b:
            return False
        return BlockedUser.objects.filter(
            models.Q(blocker=user_a, blocked=user_b) | models.Q(blocker=user_b, blocked=user_a)
        ).exists()


class Report(models.Model):
    """
    A report filed against a user or a piece of user-generated content.

    Content is referenced with SET_NULL rather than CASCADE: if a reported
    listing or message is deleted, the report itself must survive for review -
    otherwise deleting the offending content also destroys the evidence and the
    moderation record.
    """
    class Target(models.TextChoices):
        USER = 'USER', 'User'
        LISTING = 'LISTING', 'Listing'
        MESSAGE = 'MESSAGE', 'Message'

    class Reason(models.TextChoices):
        SPAM = 'SPAM', 'Spam or misleading'
        HARASSMENT = 'HARASSMENT', 'Harassment or hate speech'
        SCAM = 'SCAM', 'Scam or fraud'
        INAPPROPRIATE = 'INAPPROPRIATE', 'Inappropriate or explicit content'
        SAFETY = 'SAFETY', 'Unsafe or dangerous behaviour'
        OTHER = 'OTHER', 'Something else'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending review'
        REVIEWED = 'REVIEWED', 'Reviewed - no action'
        ACTIONED = 'ACTIONED', 'Action taken'
        DISMISSED = 'DISMISSED', 'Dismissed'

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='filed_reports'
    )
    target_type = models.CharField(max_length=20, choices=Target.choices)

    # Always set - the account answerable for the reported content, so a
    # moderator can act on the person even when the content itself is gone.
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='reports_against', null=True, blank=True
    )
    listing = models.ForeignKey(
        'market.Listing', on_delete=models.SET_NULL, null=True, blank=True, related_name='reports'
    )
    message = models.ForeignKey(
        'chat.Message', on_delete=models.SET_NULL, null=True, blank=True, related_name='reports'
    )

    reason = models.CharField(max_length=20, choices=Reason.choices)
    details = models.TextField(blank=True)

    # Snapshot of what was reported, captured at report time. The content can
    # be edited or deleted before anyone reviews it; without this the report
    # would point at nothing.
    content_snapshot = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    moderator_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviewed_reports'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['reported_user']),
        ]

    def __str__(self):
        return f"{self.get_target_type_display()} report #{self.pk} ({self.status})"
