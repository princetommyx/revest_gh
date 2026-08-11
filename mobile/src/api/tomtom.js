import axios from 'axios';
import polyline from 'polyline';

const TOMTOM_API_KEY = 'YOUR_TOMTOM_API_KEY'; // Placeholder: User should replace this
const BASE_URL = 'https://api.tomtom.com/routing/1/calculateRoute';

export const tomtomApi = {
    /**
     * Get route between two points
     * @param {Object} start {lat, lon}
     * @param {Object} end {lat, lon}
     * @returns {Promise<Object>} Route data including summary and decoded polyline
     */
    getRoute: async (start, end) => {
        try {
            const locations = `${start.lat},${start.lon}:${end.lat},${end.lon}`;
            const url = `${BASE_URL}/${locations}/json`;

            const response = await axios.get(url, {
                params: {
                    key: TOMTOM_API_KEY,
                    traffic: true,
                    routeType: 'fastest',
                    travelMode: 'truck', // Can be parameterized later (e.g., motorcyce, van)
                }
            });

            if (response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                const summary = route.summary;

                // TomTom returns geometry in its own format or GeoJSON if requested.
                // By default, it returns 'points' in 'legs'.
                // We'll extract points and format them for react-native-maps Polyline
                const points = route.legs[0].points.map(p => ({
                    latitude: p.latitude,
                    longitude: p.longitude
                }));

                return {
                    distance: summary.lengthInMeters,
                    travelTime: summary.travelTimeInSeconds,
                    arrivalTime: summary.arrivalTime,
                    points: points,
                };
            }
            throw new Error('No route found');
        } catch (error) {
            console.error('TomTom Routing Error:', error.response?.data || error.message);
            throw error;
        }
    }
};
