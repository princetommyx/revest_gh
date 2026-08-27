import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '../constants/googleMaps';

export const placesApi = {
    /**
     * Search for places/addresses in Ghana.
     * @param {string} query Search term
     * @param {number} lat Optional current latitude, biases (not restricts) results toward nearby places
     * @param {number} lon Optional current longitude
     * @returns {Promise<Array>} Array of { id, name, address, city, region, lat, lon }
     */
    searchPlaces: async (query, lat, lon) => {
        try {
            const params = {
                query,
                region: 'gh',
                key: GOOGLE_MAPS_API_KEY,
            };
            if (lat && lon) {
                params.location = `${lat},${lon}`;
                params.radius = 50000; // 50km proximity bias, not a hard filter
            }

            const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', { params });

            const { status, results, error_message } = response.data || {};
            if (status && status !== 'OK' && status !== 'ZERO_RESULTS') {
                console.warn('Places search failed:', status, error_message);
                return [];
            }

            return (results || [])
                .filter(r => r.geometry?.location)
                .map(r => ({
                    id: r.place_id,
                    name: r.name,
                    address: r.formatted_address || '',
                    city: '',
                    region: '',
                    lat: r.geometry.location.lat,
                    lon: r.geometry.location.lng,
                    distance: 0,
                }));
        } catch (error) {
            console.error('Location Search Error:', error.response?.data || error.message);
            throw error;
        }
    }
};
