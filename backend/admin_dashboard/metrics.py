"""
Shared dashboard metrics.

There are two admin stats endpoints - users.admin_stats.admin_dashboard_stats
(what the dashboard actually calls) and admin_dashboard.views.DashboardStatsView
(richer, but unused by the dashboard today). These helpers live here so the
chart data cannot drift between them.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone


def signup_trend(months=6):
    """
    New users per calendar month, oldest first, including the current month.

    Replaces a hardcoded Jan-Sep curve in the dashboard component that was
    labelled "January 2025" whatever the date.
    """
    User = get_user_model()

    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    cursor = today_start.replace(day=1)

    starts = []
    for _ in range(months):
        starts.append(cursor)
        # Step back a month by landing on the previous month's last day.
        cursor = (cursor - timedelta(days=1)).replace(day=1)

    trend = []
    for start in reversed(starts):
        next_month = (start + timedelta(days=32)).replace(day=1)
        trend.append({
            'label': start.strftime('%b'),
            'month': start.strftime('%Y-%m'),
            'value': User.objects.filter(
                date_joined__gte=start, date_joined__lt=next_month).count(),
        })
    return trend


def material_distribution(limit=6):
    """
    Listings grouped by material, largest first. Replaces a hardcoded
    Paper 400 / Plastic 300 / Metal 300 split that an admin could easily
    have read as real.
    """
    from market.models import Listing

    return [
        {'name': row['material_type'] or 'Unspecified', 'value': row['n']}
        for row in Listing.objects.values('material_type')
                                  .annotate(n=Count('id'))
                                  .order_by('-n')[:limit]
    ]
