"""
How far away a collector really is, and how long they will really take.

Revesta asks Google Distance Matrix for a real road route and falls back to
a straight line when it can't reach it (no API key, timeout, quota). The
fallback carries two systematic errors, and both push the same way:

* Haversine distance is used as though it were road distance. It is a
  straight line between two points, which is a hard lower bound on any
  route a vehicle can actually drive - roads bend, rivers and railways have
  crossings, and Accra's are not on a grid. Every fallback estimate is
  therefore too short by construction, never too long.
* The speed is a flat 40 km/h, duplicated in three places. Whatever the
  right figure for Accra is, one number written three times is a number
  that will be corrected in two of them.

Rather than pick better constants and hope, this module learns both from
what Revesta has already recorded. PriceQuote stores the distance behind
every quote and links to the PickupRequest it became; PickupRequest stores
accepted_at and arrived_at. A quote joined to its request is one observed
answer to "a collector was this far away and took this long" - real
vehicles, real Accra roads, real traffic, at the hours collectors actually
work. Enough of those beats any constant.

The same discipline as the rest of intelligence/: an assumption never moves
money, an observation does. Until MIN_ROUTE_SAMPLE legs exist, the speed
stays exactly what it is today (settings.FALLBACK_SPEED_KMH, defaulting to
the 40 km/h already in force), so nothing reprices on my say-so. Circuity is
the one exception and applies immediately, because it is not a guess about
Accra - a road route cannot be shorter than the straight line, so correcting
toward it is right in the only direction it can be wrong.
"""

import logging
from statistics import median

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

CACHE_KEY = 'intelligence.routing_calibration.v1'
CACHE_TTL_SECONDS = 30 * 60

# Road distance / straight-line distance. 1.3-1.4 is the usual range for
# dense urban road networks; 1.35 sits in the middle of it. Replaced by the
# observed ratio as soon as enough routed quotes have recorded both numbers.
DEFAULT_CIRCUITY_FACTOR = 1.35

# Legs needed before observations replace assumptions. Higher than the
# survey's gate because a travel time is far noisier than a survey answer -
# one collector stopping for fuel should not reprice the city.
MIN_ROUTE_SAMPLE = 10

# Travel times outside this band are treated as data errors rather than
# slow days: a leg logged at 200 km/h is a clock problem, and one at
# 0.5 km/h is a collector who accepted a job and went to lunch. Both would
# otherwise drag a median that is meant to describe driving.
MIN_PLAUSIBLE_SPEED_KMH = 2.0
MAX_PLAUSIBLE_SPEED_KMH = 80.0


def fallback_speed_kmh():
    """
    The assumed speed, when there is nothing observed to use instead.

    Reads settings.FALLBACK_SPEED_KMH so the figure is one env var rather
    than three literals, and defaults to the 40 km/h already in force: the
    speed half of the estimate is unchanged until Revesta has measured its
    own. (The circuity half does move fares immediately - see this module's
    docstring for why that one is a correction rather than a guess.)

    Accra's real traffic speed is well below 40; `show_routing_calibration`
    prints what Revesta's own pickups say it is, which is the number to move
    this to once there are enough of them.
    """
    try:
        return float(getattr(settings, 'FALLBACK_SPEED_KMH', 40.0))
    except (TypeError, ValueError):
        return 40.0


def _observations():
    """
    (straight_line_km, road_km, travel_minutes) for every quote that became
    a real pickup and has both timestamps. road_km is None unless the quote
    was routed by Google.
    """
    from .models import PriceQuote

    rows = (
        PriceQuote.objects
        .filter(
            pickup_request__isnull=False,
            pickup_request__accepted_at__isnull=False,
            pickup_request__arrived_at__isnull=False,
        )
        .values_list(
            'distance_km', 'straight_line_km', 'used_real_route',
            'pickup_request__accepted_at', 'pickup_request__arrived_at',
        )
    )

    observations = []
    for distance_km, straight_km, used_real_route, accepted_at, arrived_at in rows:
        if not distance_km or distance_km <= 0:
            continue
        minutes = (arrived_at - accepted_at).total_seconds() / 60
        if minutes <= 0:
            continue
        road_km = distance_km if used_real_route else None
        observations.append((straight_km, road_km, distance_km, minutes))
    return observations


def compute_calibration():
    """
    What Revesta's own completed pickups say about travel in its service
    area. Always returns a dict; `sufficient` says whether it is allowed to
    replace the assumed speed.
    """
    try:
        observations = _observations()
    except Exception as e:
        logger.warning(f"Could not read routing observations: {e}")
        observations = []

    speeds = []
    circuities = []
    for straight_km, road_km, distance_km, minutes in observations:
        speed = distance_km / (minutes / 60)
        if MIN_PLAUSIBLE_SPEED_KMH <= speed <= MAX_PLAUSIBLE_SPEED_KMH:
            speeds.append(speed)
        if straight_km and road_km and straight_km > 0:
            circuities.append(road_km / straight_km)

    sample_size = len(speeds)
    sufficient = sample_size >= MIN_ROUTE_SAMPLE
    observed_speed = round(median(speeds), 2) if speeds else None
    observed_circuity = round(median(circuities), 3) if circuities else None

    return {
        'sample_size': sample_size,
        'min_sample_size': MIN_ROUTE_SAMPLE,
        'sufficient': sufficient,
        'observed_speed_kmh': observed_speed,
        'assumed_speed_kmh': fallback_speed_kmh(),
        'speed_kmh': observed_speed if (sufficient and observed_speed) else fallback_speed_kmh(),
        'observed_circuity': observed_circuity,
        'circuity_sample_size': len(circuities),
        'circuity': (
            observed_circuity
            if (len(circuities) >= MIN_ROUTE_SAMPLE and observed_circuity)
            else DEFAULT_CIRCUITY_FACTOR
        ),
    }


def routing_calibration(refresh=False):
    """Cached compute_calibration(); never raises."""
    if not refresh:
        cached = cache.get(CACHE_KEY)
        if cached is not None:
            return cached
    try:
        calibration = compute_calibration()
    except Exception as e:
        logger.warning(f"Could not compute routing calibration: {e}")
        return {
            'sample_size': 0,
            'sufficient': False,
            'speed_kmh': fallback_speed_kmh(),
            'circuity': DEFAULT_CIRCUITY_FACTOR,
        }
    try:
        cache.set(CACHE_KEY, calibration, CACHE_TTL_SECONDS)
    except Exception as e:
        logger.warning(f"Could not cache routing calibration: {e}")
    return calibration


def road_distance_km(straight_line_km):
    """
    Straight-line distance turned into a plausible driving distance.

    Applied even with no observations behind it: a route cannot be shorter
    than the straight line between its ends, so the uncorrected figure is
    wrong in a known direction and by a knowable amount, which is not the
    same kind of uncertainty as a guessed speed.
    """
    if straight_line_km is None:
        return None
    try:
        return float(straight_line_km) * routing_calibration()['circuity']
    except (TypeError, ValueError):
        return straight_line_km


def travel_estimate(straight_line_km):
    """
    (road_km, duration_min) for a straight-line distance - the fallback used
    whenever a real routed answer isn't available. One function so the three
    call sites that each had their own copy of this arithmetic cannot drift
    apart again.
    """
    if straight_line_km is None:
        return None, None
    road_km = road_distance_km(straight_line_km)
    speed = routing_calibration()['speed_kmh'] or fallback_speed_kmh()
    if speed <= 0:
        speed = fallback_speed_kmh()
    return road_km, (road_km / speed) * 60


def eta_minutes(straight_line_km):
    """Just the minutes, for the serializers that only show an ETA."""
    _, duration_min = travel_estimate(straight_line_km)
    return None if duration_min is None else round(duration_min)
