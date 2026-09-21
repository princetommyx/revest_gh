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


# --- Quality-adjusted pricing ------------------------------------------
#
# The market quotes a band, not a price - 1.4x wide on copper, 2.5x on
# paper - and where a load lands in that band is decided by its condition.
# Stripped copper fetches GHS 75, copper still in its insulation fetches
# GHS 55; dry cardboard is worth GHS 2.50, wet cardboard is worth, in the
# source's own words, nothing.
#
# That was previously unusable information, because nothing assessed
# condition. It is usable now for one reason: the waste-analysis model is
# already looking at a photograph of the load, and every one of these
# preparation rules describes something visible in a photograph. So the
# model reports what it sees, and the payout follows.

# Where an unassessed load is priced within its band. Deliberately near the
# bottom rather than the middle: a load nobody has looked at is not an
# average load, it is a load of unknown condition, and the band is wide
# enough that assuming the middle overpays on roughly half of them. A
# disposer who prepares their material gets the rest by way of the
# assessment, which is the incentive the survey's open answers ("when I
# know I will get value for it") were asking for.
UNASSESSED_QUALITY = Decimal('0.25')

CONTAMINATION_QUALITY = {
    'none': Decimal('1.00'),
    'light': Decimal('0.60'),
    'heavy': Decimal('0.15'),
}

# How much of the score each observation carries. Contamination dominates
# because it is the one that can take a load to zero - the source is explicit
# that wet paper loses all value, and a sack of PET with drink still in the
# bottles is not a sack of PET.
CONTAMINATION_WEIGHT = Decimal('0.5')
DRYNESS_WEIGHT = Decimal('0.3')
PREPARATION_WEIGHT = Decimal('0.2')


def quality_score(condition):
    """
    A 0..1 position within a material's price band, from what the model
    reported seeing. Returns UNASSESSED_QUALITY when there is nothing usable
    to go on - an absent assessment must never be read as a clean load.

    `condition` is the waste-analysis model's own observation block:
    {"contamination": "none"|"light"|"heavy", "dry": bool, "prepared": bool}.
    Any subset works; each missing observation simply doesn't vote.
    """
    if not isinstance(condition, dict):
        return UNASSESSED_QUALITY

    scored = []
    contamination = CONTAMINATION_QUALITY.get(condition.get('contamination'))
    if contamination is not None:
        scored.append((CONTAMINATION_WEIGHT, contamination))
    if isinstance(condition.get('dry'), bool):
        scored.append((DRYNESS_WEIGHT, Decimal('1') if condition['dry'] else Decimal('0.2')))
    if isinstance(condition.get('prepared'), bool):
        scored.append((PREPARATION_WEIGHT, Decimal('1') if condition['prepared'] else Decimal('0.4')))

    if not scored:
        return UNASSESSED_QUALITY

    total_weight = sum(weight for weight, _ in scored)
    return (sum(weight * value for weight, value in scored) / total_weight).quantize(Decimal('0.01'))


def price_band(material_key):
    """(low, high) for a material, or None when it has no captured band."""
    try:
        from .models import MaterialBuybackPrice

        row = (
            MaterialBuybackPrice.objects
            .filter(material_type=(material_key or '').upper())
            .exclude(price_per_kg_low=None)
            .exclude(price_per_kg_high=None)
            .order_by('-captured_at', 'price_per_kg_low')
            .first()
        )
        return (row.price_per_kg_low, row.price_per_kg_high) if row else None
    except Exception as e:
        logger.warning(f"Could not read price band for {material_key}: {e}")
        return None


def gate_price_for_quality(material_key, condition=None):
    """
    The gate price this particular load would fetch: its band, interpolated
    by what the model saw. Falls back to the flat captured price for a
    material with no band.
    """
    band = price_band(material_key)
    if band is None:
        return buyback_rates().get((material_key or '').upper())
    low, high = band
    return (low + (high - low) * quality_score(condition)).quantize(Decimal('0.01'))


def preparation_tips(material_key):
    """
    What this disposer could do to earn the top of the band, in the market's
    own words. Returned to the app so a low assessment comes with a reason
    and a remedy rather than just a smaller number.
    """
    try:
        from .models import MaterialBuybackPrice

        row = (
            MaterialBuybackPrice.objects
            .filter(material_type=(material_key or '').upper())
            .exclude(preparation_note='')
            .order_by('-captured_at')
            .first()
        )
        return row.preparation_note if row else ''
    except Exception as e:
        logger.warning(f"Could not read preparation note for {material_key}: {e}")
        return ''


def quality_adjusted_payout_per_kg(material_key, current_rate, condition=None):
    """
    derived_payout_per_kg(), but priced from where this load actually sits
    in its band rather than from the band's midpoint.

    Still bounded by MAX_SHIFT against the rate in force: condition decides
    which gate price is the target, never how far a single capture is
    allowed to move a live payout in one step.
    """
    gate = gate_price_for_quality(material_key, condition)
    if gate is None:
        return current_rate
    target = (gate * (1 - COLLECTION_MARGIN)).quantize(Decimal('0.01'))
    try:
        moved = clamp_to_shift(float(current_rate), float(target))
    except (TypeError, ValueError, InvalidOperation):
        return current_rate
    return Decimal(str(round(moved, 2)))


def preparation_guidance():
    """
    Every material's preparation rule, one line, for the waste-analysis
    prompt. This is what lets the model judge "prepared" against the right
    standard - crushed for cans, stripped for copper, capless and dry for
    PET - instead of against a general sense of tidiness.
    """
    try:
        from .models import MaterialBuybackPrice

        seen = {}
        for row in MaterialBuybackPrice.objects.exclude(preparation_note='').order_by('-captured_at'):
            key = row.material_type or row.label
            seen.setdefault(key, row.preparation_note)
        return '; '.join(f"{key}: {note}" for key, note in seen.items())
    except Exception as e:
        logger.warning(f"Could not read preparation guidance: {e}")
        return ''


def quality_pricing_active(material_key, current_rate):
    """
    Whether condition can actually change this material's payout yet.

    It cannot while the base rate sits so far below the band that even a
    filthy load's gate-derived payout clears the MAX_SHIFT ceiling - both a
    spotless and a contaminated load then clamp to the same bounded figure.
    That is the bound working as intended (one capture may not move a live
    payout far), but it means the assessment is being collected and not yet
    spent, which is worth saying out loud rather than leaving to be
    discovered.

    Returns (active, reason).
    """
    band = price_band(material_key)
    if band is None:
        return False, 'no captured price band for this material'

    worst = quality_adjusted_payout_per_kg(
        material_key, current_rate,
        {'contamination': 'heavy', 'dry': False, 'prepared': False},
    )
    best = quality_adjusted_payout_per_kg(
        material_key, current_rate,
        {'contamination': 'none', 'dry': True, 'prepared': True},
    )
    if worst == best:
        return False, (
            f"base rate GHS {current_rate}/kg is far enough below the band that "
            f"every load clamps to GHS {best}/kg - raise the base rate before "
            "condition can matter"
        )
    return True, f"GHS {worst}/kg to GHS {best}/kg depending on condition"
