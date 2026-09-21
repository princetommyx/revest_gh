from decimal import Decimal
from .utils import haversine
from intelligence.buyback import quality_adjusted_payout_per_kg
from intelligence.market_signal import clamp_to_shift, priced_signal
from market.models import MaterialMarketPrice

# Track A Constants (GHS)
BAG_SIZE_RATES = {
    'SMALL': Decimal('5.00'),
    'MEDIUM': Decimal('10.00'),
    'LARGE': Decimal('20.00'),
    'XLARGE': Decimal('50.00'),
}

# Pricing Constants (GHS) - Legacy/Generic
BASE_RATE = Decimal('10.00')
PER_KM_RATE = Decimal('2.50') 
PER_MIN_RATE = Decimal('0.50')

# The flat per-sack payout for pure water rubbers / plastic bottles, and
# what a bale is worth in sacks. This used to be a bare 30.00 and 60.00
# sitting inline in calculate_track_b_earnings; naming them lets the market
# survey adjust the sack rate without the bale drifting away from it.
SACK_FLAT_RATE = Decimal('30.00')
BALE_SACK_EQUIVALENT = Decimal('2')

# Per-kg rates used when no MaterialMarketPrice row exists - covering both
# the AI's precise vocabulary and the mobile app's coarser manual-picker
# categories. Module level rather than rebuilt inside the function on every
# call, so `show_market_signal` can report what each one is doing against
# the observed buyback band instead of duplicating the table to guess.
#
# None of these figures was ever derived from a market price, and every one
# with an observed band behind it now reads as too low - see
# intelligence.buyback.
FALLBACK_RATES = {
    'PET': Decimal('0.50'),
    'HDPE': Decimal('0.60'),
    'ALUMINUM': Decimal('2.00'),
    'METALS': Decimal('1.50'),
    'PAPER': Decimal('0.20'),
    'ELECTRONICS': Decimal('8.00'),
    'MIXED': Decimal('0.30'),
    'ORGANIC': Decimal('0.10'),
    # Coarse categories from the manual (no-photo) picker
    'PLASTICS': Decimal('1.20'),
    'GLASS': Decimal('0.50'),
    'OTHER': Decimal('0.50'),
}


def survey_adjusted_sack_rate():
    """
    The flat sack payout, nudged by what disposers told the "what should
    your waste pay you?" survey about a GHS 30 sack.

    Falls straight back to SACK_FLAT_RATE whenever there aren't enough
    responses yet, or the signal can't be computed at all - the survey is
    allowed to tune a price, never to be the only thing holding one up.
    """
    signal = priced_signal()
    if not signal:
        return SACK_FLAT_RATE
    rate = clamp_to_shift(float(SACK_FLAT_RATE), signal.get('sack_rate_ghs'))
    return Decimal(str(round(rate, 2)))


def survey_adjusted_track_a_rate(bag_size='MEDIUM'):
    """
    A bag-size haulage rate, scaled by the survey's willingness to pay.

    The survey asked about exactly one medium sack, so that answer is
    compared against the MEDIUM rate and the resulting ratio is applied to
    every bag size - a crowd that will only pay half of what a medium sack
    costs today is telling us the whole ladder sits too high, not just its
    middle rung.
    """
    base = BAG_SIZE_RATES.get(bag_size, Decimal('10.00'))
    signal = priced_signal()
    if not signal:
        return base
    medium = clamp_to_shift(
        float(BAG_SIZE_RATES['MEDIUM']), signal.get('track_a_medium_fee_ghs')
    )
    ratio = Decimal(str(medium)) / BAG_SIZE_RATES['MEDIUM']
    return (base * ratio).quantize(Decimal('0.01'))

def calculate_track_a_fee(category='General', bag_size='MEDIUM', distance_km=0):
    """
    Calculate fee for non-recyclable waste disposal.
    Uses TrackAServiceFee model if available, otherwise fallbacks to bag size rates.
    """
    from market.models import TrackAServiceFee
    
    try:
        # Priority 1: Category-based dynamic fee
        fee_config = TrackAServiceFee.objects.get(category=category)
        base = fee_config.fee_per_unit
    except TrackAServiceFee.DoesNotExist:
        # Priority 2: Bag-size based rate, scaled by what disposers actually
        # said they would pay. Only the fallback is scaled - a
        # TrackAServiceFee row is an explicit decision someone made in the
        # admin, and survey sentiment has no business quietly overriding it.
        base = survey_adjusted_track_a_rate(bag_size)
    
    distance_surcharge = Decimal(str(distance_km)) * Decimal('0.50') if distance_km > 5 else Decimal('0')
    return (base + distance_surcharge).quantize(Decimal('0.01'))

def calculate_track_b_earnings(material_type, weight_kg, condition=None):
    """
    Calculate estimated earnings for high-value recyclables.

    `condition` is the waste-analysis model's observation of the load
    (contamination, dryness, preparation). Recyclers quote a band rather
    than a rate, and condition is what decides where in that band a load
    sits, so passing it through is the difference between paying for the
    material and paying for this particular sack of it. Omitting it prices
    the load as unassessed, near the bottom of the band.
    """
    material_key = (material_type or '').upper()

    if material_key in ['PURE_WATER_RUBBERS', 'PLASTIC_BOTTLES']:
        return survey_adjusted_sack_rate()
    if material_key in ['PURE_WATER_RUBBERS_BALE', 'PLASTIC_BOTTLES_BALE']:
        # A bale has always been priced at two sacks; keeping it defined
        # that way means the survey moves both together instead of the bale
        # silently becoming worth less than the sacks that make it up.
        return (survey_adjusted_sack_rate() * BALE_SACK_EQUIVALENT).quantize(Decimal('0.01'))

    try:
        market_price = MaterialMarketPrice.objects.get(material_type=material_key).price_per_kg
    except MaterialMarketPrice.DoesNotExist:
        fallback_rates = FALLBACK_RATES
        # Nudged toward what the material is actually worth at a Ghanaian
        # recycler's gate, less Revesta's collection margin. These fallback
        # rates were never derived from an observed price - several of them
        # sit well under one - so a material with a real buyback figure
        # behind it moves toward it by a bounded step rather than staying
        # wrong indefinitely. Only the fallbacks are adjusted: a
        # MaterialMarketPrice row above is a price someone set on purpose.
        market_price = quality_adjusted_payout_per_kg(
            material_key, fallback_rates.get(material_key, Decimal('0.10')), condition
        )

    weight = Decimal(str(weight_kg)) if weight_kg else Decimal('0')
    return (weight * market_price).quantize(Decimal('0.01'))

def price_guardrail(estimated_price, spread=Decimal('0.20')):
    """
    Min/max a disposer can adjust an estimated price to before posting.
    Kept server-side so the allowed spread is a single tunable, not
    duplicated logic on the client.
    """
    estimated_price = Decimal(str(estimated_price))
    delta = (estimated_price * spread).quantize(Decimal('0.01'))
    min_price = max(Decimal('0.00'), estimated_price - delta)
    max_price = estimated_price + delta
    return min_price.quantize(Decimal('0.01')), max_price.quantize(Decimal('0.01'))

def calculate_fare_estimate(distance_km, duration_min):
    """
    Calculate fare using Bolt-like algorithm:
    Total = Base + (Dist * DistRate) + (Time * TimeRate)
    """
    if distance_km is None or duration_min is None:
        return Decimal('0.00')
        
    dist_cost = Decimal(str(distance_km)) * PER_KM_RATE
    time_cost = Decimal(str(duration_min)) * PER_MIN_RATE
    
    total = BASE_RATE + dist_cost + time_cost
    
    # Minimum fare
    if total < BASE_RATE:
        return BASE_RATE
        
    return total.quantize(Decimal('0.01'))
