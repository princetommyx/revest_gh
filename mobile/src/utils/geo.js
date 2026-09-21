import * as Location from 'expo-location';

/**
 * Turn coordinates into a human address.
 *
 * Returns the full "street, city" form used when a pickup address has to be
 * precise. Falls back to the raw coordinates so a caller always has
 * something to show rather than an empty string.
 */
export async function reverseGeocode(lat, lon) {
    try {
        const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (address) {
            const street = address.street || address.name || '';
            const city = address.city || address.subregion || address.region || '';
            return `${street}, ${city}`.replace(/^, /, '').trim();
        }
    } catch (error) {
        console.log('Reverse geocode error:', error);
    }
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

/**
 * The short form for a header chip - the district or town only, no street.
 *
 * A full address wraps or truncates in the narrow space next to the avatar,
 * and "Near Kingsway Supermarket" is not what someone wants to read as the
 * answer to "where am I". Returns null rather than coordinates when nothing
 * useful comes back, so the caller can fall back to a profile city.
 */
export async function reverseGeocodeShort(lat, lon) {
    try {
        const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (address) {
            return address.city || address.subregion || address.district || address.region || null;
        }
    } catch (error) {
        console.log('Reverse geocode error:', error);
    }
    return null;
}
