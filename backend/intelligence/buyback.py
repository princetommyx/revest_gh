"""
What recyclers pay Revesta, and therefore what Revesta can afford to pay
disposers.

MarketSurveyResponse answers "what do disposers want?". This module answers
the question that has to be asked straight after it: "can we pay that?"
Until now nothing in the codebase could. The Track B fallback rates in
logistics/pricing.py were figures with no stated origin, and the flat GHS 30
sack payout was never checked against what a sack of sachets is worth at the
gate - so a payout could look generous to a disposer and lose money on every
single load, with nothing anywhere to notice.

Two things come out of here:

* derived_payout_per_kg() - a per-kg payout backed by an observed gate
  price, less the margin Revesta needs to cover collection and its own cut.
* sack_economics() - the break-even weight a flat-rate sack must hit to
  clear its payout, checked against the weights collectors have actually
  recorded on completed pickups.

Same discipline as market_signal: bounded, gated, and failure-tolerant.
A buyback figure captured from one secondary source is evidence, not a
mandate, so it moves a price by a bounded step and reports the whole gap
rather than closing it silently.
"""

import logging
from decimal import Decimal, InvalidOperation

from django.core.cache import cache

from .market_signal import MAX_SHIFT, clamp_to_shift

logger = logging.getLogger(__name__)

CACHE_KEY = 'intelligence.buyback_rates.v1'
CACHE_TTL_SECONDS = 60 * 60

# The share of the gate price Revesta must keep to cover collection,
# transport, sorting and its own margin. The payout a disposer sees is what
# is left of the buyback price after this.
#
# A placeholder in the honest sense: nobody has costed a Revesta collection
# run yet, so 0.35 is a common buyback-operator split rather than a measured
# figure. It is the single number to change once real per-pickup costs exist
# (PriceQuote joined to PickupRequest is accumulating exactly that), and it
# is deliberately one named constant rather than baked into a rate table.
COLLECTION_MARGIN = Decimal('0.35')

# A sack of loose pure water sachets, in kilograms. Used only when no
# collector has actually weighed one yet; observed weights replace it the
# moment completed pickups carry them, which is why sack_economics() reports
# which of the two it used.
ASSUMED_SACK_KG = Decimal('8')

# Materials paid as a flat rate per sack rather than per kilogram - the ones
# whose economics depend entirely on what a sack actually weighs.
FLAT_RATE_MATERIALS = (
    'PURE_WATER_RUBBERS',
    'PLASTIC_BOTTLES',
)


def buyback_rates(refresh=False):
    """
    {material_key: Decimal GHS/kg} from the most recent capture.

    Where several market items map onto one Revesta material (white office
    paper and cardboard both land on PAPER) the lowest wins: a bucket is
    only as valuable as its cheapest member, and pricing a mixed PAPER load
    at the office-paper rate is how a buyback quietly loses money.

    Returns {} rather than raising, so every caller can treat "no buyback
    data" as "keep the existing constant".
    """
    if not refresh:
        cached = cache.get(CACHE_KEY)
        if cached is not None:
            return cached

    try:
        from .models import MaterialBuybackPrice

        rates = {}
        latest_capture = {}
        for row in MaterialBuybackPrice.objects.exclude(material_type='').order_by('captured_at'):
            key = row.material_type
            # Rows arrive oldest first, so a newer capture replaces an older
            # one outright instead of being averaged into it - a stale price
            # should stop counting, not keep half a vote.
            if latest_capture.get(key) != row.captured_at:
                latest_capture[key] = row.captured_at
                rates[key] = row.price_per_kg
            else:
                rates[key] = min(rates[key], row.price_per_kg)
    except Exception as e:
        logger.warning(f"Could not load buyback rates: {e}")
        return {}

    try:
        cache.set(CACHE_KEY, rates, CACHE_TTL_SECONDS)
    except Exception as e:
        logger.warning(f"Could not cache buyback rates: {e}")
    return rates


def refresh_buyback_rates():
    return buyback_rates(refresh=True)


def unbounded_payout_per_kg(material_key):
    """
    What the gate price says a kilogram could pay a disposer, with no
    reference to what Revesta pays today. None when the material has no
    observed buyback price.

    This is the honest target. derived_payout_per_kg() is what actually gets
    paid - the two differ by however far the current rate is out, which is
    the number worth looking at.
    """
    rate = buyback_rates().get((material_key or '').upper())
    if rate is None:
        return None
    return (rate * (1 - COLLECTION_MARGIN)).quantize(Decimal('0.01'))


def derived_payout_per_kg(material_key, current_rate):
    """
    `current_rate` moved toward the gate-price-backed payout, by at most
    MAX_SHIFT of itself.

    The bound is the point. These figures come from a single secondary
    source; a material whose payout is 4x out will not be corrected in one
    step, and that remaining gap is meant to stay visible in
    `show_market_signal` until someone decides deliberately to close it,
    rather than being applied on the strength of one capture.
    """
    target = unbounded_payout_per_kg(material_key)
    if target is None:
        return current_rate
    try:
        moved = clamp_to_shift(float(current_rate), float(target))
    except (TypeError, ValueError, InvalidOperation):
        return current_rate
    return Decimal(str(round(moved, 2)))


def observed_sack_kg(material_key):
    """
    Median weight collectors have actually recorded for this material on
    completed pickups, or None if nobody has weighed one yet.

    Prefers the AI-verified weight over the collector's typed figure where
    both exist - the typed one is exactly what logistics/verification.py
    exists to distrust.
    """
    try:
        from logistics.models import PickupRequest

        weights = []
        rows = PickupRequest.objects.filter(
            material_type__iexact=material_key, status='COMPLETED'
        ).values_list('ai_verified_weight', 'weight_kg', 'manual_weight')
        for verified, weight, manual in rows:
            value = verified or weight or manual
            if value and value > 0:
                weights.append(Decimal(value))
        if not weights:
            return None
        weights.sort()
        middle = len(weights) // 2
        if len(weights) % 2:
            return weights[middle]
        return ((weights[middle - 1] + weights[middle]) / 2).quantize(Decimal('0.01'))
    except Exception as e:
        logger.warning(f"Could not read observed sack weights for {material_key}: {e}")
        return None


def sack_economics(sack_rate):
    """
    For each flat-rate material: what the sack pays, what a kilogram of it
    is worth at the gate, and how heavy a sack must therefore be before that
    payout breaks even - checked against what sacks have actually weighed.

    `sack_rate` is passed in rather than imported so this module never
    imports logistics.pricing, which imports this one.
    """
    sack_rate = Decimal(str(sack_rate))
    rates = buyback_rates()
    report = {}

    for material in FLAT_RATE_MATERIALS:
        gate = rates.get(material)
        if not gate or gate <= 0:
            continue

        break_even_kg = (sack_rate / gate).quantize(Decimal('0.01'))
        observed = observed_sack_kg(material)
        actual_kg = observed if observed is not None else ASSUMED_SACK_KG
        gate_value = (actual_kg * gate).quantize(Decimal('0.01'))

        report[material] = {
            'sack_payout_ghs': sack_rate,
            'buyback_per_kg_ghs': gate,
            'break_even_kg': break_even_kg,
            'sack_kg': actual_kg,
            'sack_kg_source': 'observed' if observed is not None else 'assumed',
            'gate_value_ghs': gate_value,
            'margin_ghs': (gate_value - sack_rate).quantize(Decimal('0.01')),
            'clears': gate_value >= sack_rate,
        }

    return report


# Relative value tiers, for grounding the waste-analysis model without
# handing it a price to echo. Copper is two orders of magnitude above
# sachets per kilogram, which is precisely the kind of thing that should
# decide how hard the model works to tell two grey metals apart - and
# precisely the kind of thing it currently has no way to know.
def value_tiers():
    """
    Materials ordered by gate price, highest first, as (key, label) tiers.
    Returns [] when there is no buyback data. Carries no GHS figures - the
    waste-analysis prompt is deliberately price-free, and ranking is the
    part that helps classification anyway.
    """
    rates = buyback_rates()
    if not rates:
        return []
    ordered = sorted(rates.items(), key=lambda item: item[1], reverse=True)
    top = ordered[0][1]
    tiers = []
    # Bands relative to the most valuable mapped material. Chosen to
    # actually separate this market: gate prices here are bimodal - metals
    # far above everything, sachets far below - and wider bands collapsed
    # five of seven materials into one undifferentiated "high".
    for key, rate in ordered:
        if rate >= top / 3:
            tier = 'very high'
        elif rate >= top / 8:
            tier = 'high'
        elif rate >= top / 20:
            tier = 'moderate'
        else:
            tier = 'low'
        tiers.append((key, tier))
    return tiers


def unmapped_materials():
    """
    Materials the market trades that Revesta has no category for, most
    valuable first.

    Worth its own function because an unmapped material is not a data gap,
    it is a line of business nobody has opened: copper sits at the top of
    this market by a wide margin and the app has no way to accept it.
    """
    try:
        from .models import MaterialBuybackPrice

        rows = MaterialBuybackPrice.objects.filter(material_type='').order_by('-price_per_kg')
        return [(row.label, row.price_per_kg) for row in rows]
    except Exception as e:
        logger.warning(f"Could not read unmapped buyback materials: {e}")
        return []
