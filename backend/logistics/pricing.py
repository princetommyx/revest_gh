from decimal import Decimal
from .utils import haversine
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
        # Priority 2: Bag-size based rate
        base = BAG_SIZE_RATES.get(bag_size, Decimal('10.00'))
    
    distance_surcharge = Decimal(str(distance_km)) * Decimal('0.50') if distance_km > 5 else Decimal('0')
    return (base + distance_surcharge).quantize(Decimal('0.01'))

def calculate_track_b_earnings(material_type, weight_kg):
    """
    Calculate estimated earnings for high-value recyclables.
    """
    material_key = (material_type or '').upper()

    if material_key in ['PURE_WATER_RUBBERS', 'PLASTIC_BOTTLES']:
        return Decimal('30.00')
    if material_key in ['PURE_WATER_RUBBERS_BALE', 'PLASTIC_BOTTLES_BALE']:
        return Decimal('60.00')

    try:
        market_price = MaterialMarketPrice.objects.get(material_type=material_key).price_per_kg
    except MaterialMarketPrice.DoesNotExist:
        # Fallback rates if not in DB - covers both the AI's precise
        # vocabulary and the mobile app's coarser manual-picker categories.
        fallback_rates = {
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
        market_price = fallback_rates.get(material_key, Decimal('0.10'))

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
