import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '../constants/googleMaps';

export const placesApi = {
    /**
     * Search for places/addresses.
     * @param {string} query Search term
     * @param {number} lat Optional current latitude, biases (not restricts) results toward nearby places
     * @param {number} lon Optional current longitude
     * @returns {Promise<Array>} Array of { id, name, address, city, region, lat, lon }
     */
    searchPlaces: async (query, lat, lon) => {
        try {
            // If we specifically want to restrict to Ghana, appending it helps if not already present
            const searchQuery = query.toLowerCase().includes('ghana') ? query : `${query} Ghana`;

            const data = {
                textQuery: searchQuery,
            };

            if (lat && lon) {
                data.locationBias = {
                    circle: {
                        center: {
                            latitude: lat,
                            longitude: lon
                        },
                        radius: 50000.0 // 50km proximity bias
                    }
                };
            }

            const response = await axios.post(
                'https://places.googleapis.com/v1/places:searchText',
                data,
                {
                    headers: {
                        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
                        'Content-Type': 'application/json'
                    }
                }
            );

            const places = response.data.places || [];

            return places.map(p => ({
                id: p.id,
                name: p.displayName?.text || '',
                address: p.formattedAddress || '',
                city: '',
                region: '',
                lat: p.location?.latitude,
                lon: p.location?.longitude,
                distance: 0,
            }));
        } catch (error) {
            console.error('Location Search Error:', error.response?.data || error.message);
            // The new API uses standard HTTP status codes for errors
            throw new Error(`Location search unavailable (${error.message})`);
        }
    }
};
