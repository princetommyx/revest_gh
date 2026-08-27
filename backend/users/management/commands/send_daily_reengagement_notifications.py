from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from users.models import User
from users.notifications import send_push_notification

# A user counts as "inactive" once this much time has passed since they
# were last seen (per ActivityTrackingMiddleware's last_active_at).
INACTIVE_AFTER = timedelta(hours=20)

# Don't nag someone who just signed up - give them a day before the first nudge.
MIN_ACCOUNT_AGE = timedelta(hours=24)

# Send at most one re-engagement push per user per run of this command.
RESEND_COOLDOWN = timedelta(hours=20)

MESSAGES = {
    'SELLER': (
        "Got waste sitting around?",
        "Request a pickup in a couple of taps and get it cleared today.",
    ),
    'COLLECTOR': (
        "Pickups may be waiting nearby",
        "Go online to see if there are jobs around you right now.",
    ),
    'RECYCLER': (
        "New listings could be waiting",
        "Check the marketplace for materials available near you.",
    ),
}
DEFAULT_MESSAGE = ("We miss you!", "Come see what's new on Revesta.")


class Command(BaseCommand):
    help = "Sends a daily re-engagement push notification to inactive users with a registered device."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="List who would be notified without actually sending anything.",
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        candidates = User.objects.filter(
            is_active=True,
            date_joined__lte=now - MIN_ACCOUNT_AGE,
        ).exclude(
            expo_push_token__isnull=True
        ).exclude(
            expo_push_token=''
        ).filter(
            Q(last_active_at__lte=now - INACTIVE_AFTER) |
            Q(last_active_at__isnull=True, last_login__lte=now - INACTIVE_AFTER)
        ).filter(
            Q(last_reengagement_sent_at__isnull=True) |
            Q(last_reengagement_sent_at__lte=now - RESEND_COOLDOWN)
        )

        sent = 0
        failed = 0
        for user in candidates.iterator():
            title, body = MESSAGES.get(user.role, DEFAULT_MESSAGE)

            if dry_run:
                self.stdout.write(f"Would notify {user.username} ({user.role})")
                continue

            try:
                # background=False: this is a one-shot script, not a long-lived
                # server process, so the send must happen inline before we exit.
                send_push_notification(user, title, body, data={'type': 'daily_reengagement'}, background=False)
                User.objects.filter(pk=user.pk).update(last_reengagement_sent_at=now)
                sent += 1
            except Exception as e:
                failed += 1
                self.stderr.write(f"Failed to notify {user.username}: {e}")

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"Dry run: {candidates.count()} user(s) would be notified."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Sent {sent} re-engagement notification(s), {failed} failure(s)."))
