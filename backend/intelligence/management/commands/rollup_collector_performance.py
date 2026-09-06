from datetime import datetime

from django.core.management.base import BaseCommand
from django.db.models import Avg, Q
from django.utils import timezone

from intelligence.models import CollectorPerformanceSnapshot
from logistics.models import PickupRequest
from ratings.models import Rating
from users.models import User


class Command(BaseCommand):
    """
    Writes today's CollectorPerformanceSnapshot row for every
    collector/recycler, and refreshes each one's lifetime cached stats
    (completion_rate, cancellation_rate, avg_rating) on the User model
    itself - the fields intelligence.matching.match_score() reads.

    No Celery yet, so this runs as a plain management command on a daily
    cron (see users.management.commands.send_daily_reengagement_notifications
    for the existing Render cron pattern this should join). Safe to re-run
    for the same day - each collector's snapshot row is upserted, not
    duplicated.
    """

    help = "Roll up daily collector performance stats and refresh cached User fields."

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            default=None,
            help="Date to roll up, YYYY-MM-DD. Defaults to today.",
        )

    def handle(self, *args, **options):
        if options['date']:
            target_date = datetime.strptime(options['date'], '%Y-%m-%d').date()
        else:
            target_date = timezone.localdate()

        collectors = User.objects.filter(role__in=['COLLECTOR', 'RECYCLER'])
        snapshot_count = 0

        for collector in collectors:
            jobs_accepted_today = PickupRequest.objects.filter(
                collector=collector, accepted_at__date=target_date
            ).count()
            jobs_completed_today = PickupRequest.objects.filter(
                collector=collector, completed_at__date=target_date
            ).count()
            # No cancelled_at field exists (only accepted_at/arrived_at/
            # completed_at were added) - created_at is the best available
            # proxy for "which day this cancellation belongs to" and will
            # undercount jobs cancelled well after they were created.
            jobs_cancelled_today = PickupRequest.objects.filter(
                collector=collector, status='CANCELLED', created_at__date=target_date
            ).count()

            day_ratings = Rating.objects.filter(
                ratee=collector, created_at__date=target_date
            ).aggregate(avg=Avg('score'))['avg']

            if jobs_accepted_today or jobs_completed_today or jobs_cancelled_today or day_ratings is not None:
                CollectorPerformanceSnapshot.objects.update_or_create(
                    date=target_date,
                    collector=collector,
                    defaults={
                        'jobs_accepted': jobs_accepted_today,
                        'jobs_completed': jobs_completed_today,
                        'jobs_cancelled': jobs_cancelled_today,
                        'avg_rating': day_ratings,
                    },
                )
                snapshot_count += 1

            # Lifetime cached stats - no date-attribution problem, these
            # just look at everything ever assigned to this collector.
            lifetime_completed = PickupRequest.objects.filter(collector=collector, status='COMPLETED').count()
            lifetime_cancelled = PickupRequest.objects.filter(collector=collector, status='CANCELLED').count()
            lifetime_assigned = PickupRequest.objects.filter(
                collector=collector
            ).filter(Q(status='COMPLETED') | Q(status='CANCELLED')).count()
            lifetime_avg_rating = Rating.objects.filter(ratee=collector).aggregate(avg=Avg('score'))['avg']

            collector.completion_rate = (
                round(lifetime_completed / lifetime_assigned, 3) if lifetime_assigned else None
            )
            collector.cancellation_rate = (
                round(lifetime_cancelled / lifetime_assigned, 3) if lifetime_assigned else None
            )
            collector.avg_rating = round(lifetime_avg_rating, 2) if lifetime_avg_rating is not None else None
            collector.save(update_fields=['completion_rate', 'cancellation_rate', 'avg_rating'])

        self.stdout.write(self.style.SUCCESS(
            f"Rolled up {target_date}: {snapshot_count} snapshot rows, "
            f"{collectors.count()} collectors' cached stats refreshed."
        ))
