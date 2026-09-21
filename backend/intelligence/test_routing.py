from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone

from intelligence.models import PriceQuote
from intelligence.routing import (
    DEFAULT_CIRCUITY_FACTOR,
    MIN_ROUTE_SAMPLE,
    compute_calibration,
    eta_minutes,
    road_distance_km,
    routing_calibration,
    travel_estimate,
)
from logistics.models import PickupRequest
from users.models import User


class RoutingTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='disposer', email='disposer@example.com', password='x'
        )

    def leg(self, distance_km, minutes, straight_line_km=None, used_real_route=False):
        """One completed pickup a collector actually travelled to."""
        accepted = timezone.now() - timedelta(minutes=minutes)
        request = PickupRequest.objects.create(
            provider=self.user,
            material_type='PET',
            track_type='B',
            status='COMPLETED',
            quantity_estimate='1 sack',
            latitude=5.66,
            longitude=-0.19,
            accepted_at=accepted,
            arrived_at=accepted + timedelta(minutes=minutes),
        )
        return PriceQuote.objects.create(
            user=self.user,
            pickup_lat=5.66,
            pickup_lon=-0.19,
            distance_km=distance_km,
            straight_line_km=straight_line_km,
            used_real_route=used_real_route,
            quoted_price=Decimal('20.00'),
            pickup_request=request,
        )


class CircuityTests(RoutingTestCase):
    def test_a_road_route_is_never_shorter_than_the_straight_line(self):
        self.assertGreater(road_distance_km(10), 10)

    def test_circuity_applies_without_waiting_for_observations(self):
        # Unlike speed, this is geometry rather than a guess about Accra.
        self.assertEqual(road_distance_km(10), 10 * DEFAULT_CIRCUITY_FACTOR)

    def test_enough_routed_legs_replace_the_assumed_circuity(self):
        for _ in range(MIN_ROUTE_SAMPLE):
            self.leg(distance_km=8.0, minutes=30, straight_line_km=4.0, used_real_route=True)

        self.assertEqual(compute_calibration()['observed_circuity'], 2.0)
        self.assertEqual(compute_calibration()['circuity'], 2.0)

    def test_a_missing_distance_is_passed_through_not_invented(self):
        self.assertIsNone(road_distance_km(None))


class ObservedSpeedTests(RoutingTestCase):
    def test_no_pickups_means_the_assumed_speed_is_untouched(self):
        calibration = compute_calibration()

        self.assertEqual(calibration['sample_size'], 0)
        self.assertFalse(calibration['sufficient'])
        self.assertEqual(calibration['speed_kmh'], calibration['assumed_speed_kmh'])

    def test_too_few_legs_are_measured_but_not_applied(self):
        for _ in range(MIN_ROUTE_SAMPLE - 1):
            self.leg(distance_km=5.0, minutes=30)  # 10 km/h

        calibration = compute_calibration()
        self.assertEqual(calibration['observed_speed_kmh'], 10.0)
        self.assertFalse(calibration['sufficient'])
        self.assertEqual(calibration['speed_kmh'], calibration['assumed_speed_kmh'])

    def test_enough_legs_replace_the_assumption(self):
        for _ in range(MIN_ROUTE_SAMPLE):
            self.leg(distance_km=5.0, minutes=30)

        calibration = compute_calibration()
        self.assertTrue(calibration['sufficient'])
        self.assertEqual(calibration['speed_kmh'], 10.0)

    def test_the_median_ignores_one_collector_who_stopped_for_lunch(self):
        for _ in range(MIN_ROUTE_SAMPLE):
            self.leg(distance_km=5.0, minutes=30)
        self.leg(distance_km=5.0, minutes=600)  # 0.5 km/h - and implausible

        self.assertEqual(compute_calibration()['speed_kmh'], 10.0)

    def test_impossible_speeds_are_discarded_as_data_errors(self):
        for _ in range(MIN_ROUTE_SAMPLE):
            self.leg(distance_km=5.0, minutes=1)  # 300 km/h

        calibration = compute_calibration()
        self.assertEqual(calibration['sample_size'], 0)
        self.assertEqual(calibration['speed_kmh'], calibration['assumed_speed_kmh'])

    def test_a_pickup_that_was_never_accepted_is_not_a_travel_observation(self):
        quote = self.leg(distance_km=5.0, minutes=30)
        quote.pickup_request.accepted_at = None
        quote.pickup_request.save()

        self.assertEqual(compute_calibration()['sample_size'], 0)


class TravelEstimateTests(RoutingTestCase):
    @override_settings(FALLBACK_SPEED_KMH=40.0)
    def test_the_estimate_is_the_road_distance_at_the_working_speed(self):
        road_km, duration_min = travel_estimate(10)

        self.assertEqual(road_km, 10 * DEFAULT_CIRCUITY_FACTOR)
        self.assertAlmostEqual(duration_min, (road_km / 40.0) * 60)

    @override_settings(FALLBACK_SPEED_KMH=20.0)
    def test_a_slower_assumed_speed_lengthens_every_eta(self):
        cache.clear()
        self.assertEqual(eta_minutes(10), round((10 * DEFAULT_CIRCUITY_FACTOR / 20.0) * 60))

    def test_a_missing_distance_yields_no_eta_rather_than_zero(self):
        self.assertEqual(travel_estimate(None), (None, None))
        self.assertIsNone(eta_minutes(None))

    def test_calibration_never_raises_and_always_answers(self):
        calibration = routing_calibration()

        self.assertIn('speed_kmh', calibration)
        self.assertIn('circuity', calibration)
