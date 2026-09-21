from decimal import Decimal

from django.core.management.base import BaseCommand

from intelligence.routing import (
    DEFAULT_CIRCUITY_FACTOR,
    fallback_speed_kmh,
    routing_calibration,
    travel_estimate,
)
from logistics.pricing import calculate_fare_estimate


class Command(BaseCommand):
    """
    What Revesta's own completed pickups say about how far away a collector
    really is and how long they really take - and what the fallback estimate
    would look like if it believed them.

    Exists because the assumed speed is deliberately left at its old value
    until there is data to replace it. That makes the assumption safe, but
    also invisible: without this, nobody would know the gap had opened.
    """

    help = "Show observed vs assumed travel speed and road circuity, and their effect on fares."

    def handle(self, *args, **options):
        calibration = routing_calibration(refresh=True)

        self.stdout.write(self.style.MIGRATE_HEADING("Observed travel (completed pickups)"))
        self.stdout.write(f"  legs measured      : {calibration['sample_size']}")
        if calibration['sufficient']:
            self.stdout.write(self.style.SUCCESS("  applied to estimates: yes"))
        else:
            self.stdout.write(self.style.WARNING(
                f"  applied to estimates: no (needs {calibration['min_sample_size']})"
            ))
        self.stdout.write(f"  observed speed     : {calibration['observed_speed_kmh'] or '-'} km/h")
        self.stdout.write(f"  assumed speed      : {calibration['assumed_speed_kmh']} km/h"
                          f"  (settings.FALLBACK_SPEED_KMH)")
        self.stdout.write(
            f"  road circuity      : {calibration['circuity']} "
            f"({'observed' if calibration.get('observed_circuity') else 'assumed'}, "
            f"from {calibration.get('circuity_sample_size', 0)} routed legs)"
        )

        observed = calibration.get('observed_speed_kmh')
        if observed and not calibration['sufficient']:
            self.stdout.write(self.style.WARNING(
                f"  {calibration['sample_size']} leg(s) so far suggest {observed} km/h, "
                f"not {calibration['assumed_speed_kmh']} - not enough to act on yet."
            ))

        self.stdout.write(self.style.MIGRATE_HEADING("What that does to a fallback estimate"))
        self.stdout.write(f"  {'straight':>9} {'road':>7} {'mins':>6} {'fare':>8}")
        for straight_km in (1, 3, 5, 10):
            road_km, duration_min = travel_estimate(straight_km)
            fare = calculate_fare_estimate(road_km, duration_min)
            self.stdout.write(
                f"  {straight_km:>7}km {road_km:>6.2f} {duration_min:>6.1f} {fare:>8}"
            )

        if observed and not calibration['sufficient']:
            self.stdout.write(self.style.MIGRATE_HEADING("If the observed speed were applied"))
            self.compare(observed, calibration['circuity'])

    def compare(self, observed_speed, circuity):
        assumed_speed = fallback_speed_kmh()
        self.stdout.write(f"  {'straight':>9} {'now':>8} {'observed':>10} {'change':>9}")
        for straight_km in (1, 3, 5, 10):
            road_km = straight_km * circuity
            now = calculate_fare_estimate(road_km, (road_km / assumed_speed) * 60)
            then = calculate_fare_estimate(road_km, (road_km / observed_speed) * 60)
            change = (then - now) / now * 100 if now else Decimal('0')
            self.stdout.write(
                f"  {straight_km:>7}km {now:>8} {then:>10} {change:>+8.1f}%"
            )
