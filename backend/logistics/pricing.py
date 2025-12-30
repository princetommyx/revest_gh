from decimal import Decimal
from .utils import haversine

# Pricing Constants (GHS)
BASE_RATE = Decimal('10.00')
PER_KM_RATE = Decimal('2.50') 
PER_MIN_RATE = Decimal('0.50')

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
