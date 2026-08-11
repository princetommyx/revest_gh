import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import useWebSocket from 'react-use-websocket';
import { MapPin, Navigation, Loader, CheckCircle, Truck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

// Fix for default marker icon in Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Error Boundary Component
import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Map Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-full bg-red-50 text-red-500 p-4 text-center">
                    <div>
                        <p className="font-bold">Map failed to load.</p>
                        <p className="text-xs mt-2">{this.state.error?.message}</p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Helper to auto-fit map bounds
const MapUpdater = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
};

const LogisticsProvider = () => {
    const { user } = useAuth();
    const [requesting, setRequesting] = useState(false);
    const [searching, setSearching] = useState(false);
    const [activeRequest, setActiveRequest] = useState(null);
    const [acceptedJob, setAcceptedJob] = useState(null);

    // WebSocket Connection
    const getSocketUrl = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';
        const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
        const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '');
        return `${wsProtocol}://${wsHost}/ws/logistics/?token=${localStorage.getItem('access_token')}`;
    };

    const { lastJsonMessage } = useWebSocket(getSocketUrl(), {
        onOpen: () => console.log("Provider: WebSocket Connected"),
        onClose: () => console.log("Provider: WebSocket Disconnected"),
        onError: (e) => console.error("Provider: WebSocket Error", e),
        shouldReconnect: () => true,
    });

    const [formData, setFormData] = useState({
        material_type: 'Plastics',
        quantity_estimate: '1-2 Bags',
        latitude: 5.6037, // Default Accra
        longitude: -0.1870
    });

    const handleRequest = async () => {
        setRequesting(true);
        try {
            // Simulate getting GPS
            const newReq = {
                ...formData,
                latitude: 5.6037 + (Math.random() * 0.01), // Simulate slight variation
                longitude: -0.1870 + (Math.random() * 0.01)
            };

            const response = await api.post('pickups/', newReq);
            setActiveRequest(response.data);
            setSearching(true);
            setRequesting(false);
        } catch (error) {
            console.error(error);
            setRequesting(false);
        }
    };

    const [collectorLocation, setCollectorLocation] = useState(null);

    useEffect(() => {
        console.log("Provider: Received WebSocket Message:", lastJsonMessage);
        if (lastJsonMessage) {
            if (lastJsonMessage.type === 'job_accepted') {
                console.log("Provider: Job Accepted!", lastJsonMessage);
                setSearching(false);
                setAcceptedJob(lastJsonMessage);
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            } else if (lastJsonMessage.type === 'collector_location') {
                console.log("Provider: Location Update", lastJsonMessage);
                setCollectorLocation(lastJsonMessage);
            }
        }
    }, [lastJsonMessage]);

    const [routeCoords, setRouteCoords] = useState([]);
    const [eta, setEta] = useState(null);
    const [mapBounds, setMapBounds] = useState(null);

    // Fetch Route & ETA
    useEffect(() => {
        if (acceptedJob && collectorLocation && typeof collectorLocation.lat === 'number') {
            const fetchRoute = async () => {
                try {
                    const start = `${collectorLocation.lon},${collectorLocation.lat}`;
                    const end = `${formData.longitude},${formData.latitude}`;
                    const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;

                    const res = await axios.get(url);
                    if (res.data.routes && res.data.routes.length > 0) {
                        const route = res.data.routes[0];
                        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
                        setRouteCoords(coords);
                        const durationMins = Math.ceil(route.duration / 60);
                        setEta(`${durationMins} min`);
                        setMapBounds([
                            [collectorLocation.lat, collectorLocation.lon],
                            [formData.latitude, formData.longitude]
                        ]);
                    }
                } catch (error) {
                    console.error("Routing Error", error);
                }
            };
            fetchRoute();
        }
    }, [acceptedJob, collectorLocation, formData]);

    if (acceptedJob) {
        return (
            <div className="h-screen flex flex-col relative overflow-hidden bg-gray-200">
                <ErrorBoundary>
                    <MapContainer
                        center={[formData.latitude, formData.longitude]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />

                        {/* <MapUpdater bounds={mapBounds} /> */}

                        {/* {routeCoords.length > 0 && (
                            <Polyline
                                positions={routeCoords}
                                color="#3b82f6"
                                weight={5}
                                opacity={0.7}
                                dashArray="10, 10"
                            />
                        )} */}

                        <Marker position={[formData.latitude, formData.longitude]}>
                            <Popup>You are here</Popup>
                        </Marker>

                        {collectorLocation && typeof collectorLocation.lat === 'number' && typeof collectorLocation.lon === 'number' && (
                            <Marker position={[collectorLocation.lat, collectorLocation.lon]}>
                                <Popup>{acceptedJob.collector_name}</Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </ErrorBoundary>

                <div className="absolute bottom-6 left-6 right-6 bg-white p-6 rounded-2xl shadow-xl z-[1000] md:w-96 md:mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Collector En Route</h2>
                            <p className="text-primary font-bold text-2xl">{eta || "Calculating..."}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <Truck size={24} className="text-green-600" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                            {acceptedJob.collector_name[0]}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{acceptedJob.collector_name}</p>
                            <p className="text-xs text-gray-500">{acceptedJob.vehicle_type} • {acceptedJob.license_plate}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => { setAcceptedJob(null); setActiveRequest(null); setCollectorLocation(null); }}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                    >
                        Complete / Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (searching) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <ErrorBoundary>
                        <MapContainer
                            center={[formData.latitude, formData.longitude]}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <Marker position={[formData.latitude, formData.longitude]}>
                                <Popup>Your Pickup Location</Popup>
                            </Marker>
                        </MapContainer>
                    </ErrorBoundary>
                </div>

                <div className="z-10 bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm mx-4">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                        <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 animate-ping"></div>
                        <Loader size={40} className="text-primary animate-spin" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Finding a Collector...</h2>
                    <p className="text-gray-500 mb-6">We are broadcasting your request to nearby drivers.</p>

                    <div className="bg-gray-50 p-4 rounded-xl text-left mb-6">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-500 text-sm">Material</span>
                            <span className="font-medium">{activeRequest?.material_type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">Est. Quantity</span>
                            <span className="font-medium">{activeRequest?.quantity_estimate}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setSearching(false)}
                        className="text-red-500 font-medium hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                    >
                        Cancel Request
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-screen bg-gray-200 overflow-hidden">
            <div className="absolute inset-0 z-0">
                <ErrorBoundary>
                    <MapContainer
                        center={[formData.latitude, formData.longitude]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker position={[formData.latitude, formData.longitude]}>
                            <Popup>Your Pickup Location</Popup>
                        </Marker>
                    </MapContainer>
                </ErrorBoundary>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-white p-6 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] max-h-[60vh] overflow-y-auto z-10">
                {/* Drag handle */}
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Navigation size={20} className="text-primary" />
                    Request Pickup
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Material Type</label>
                        <select
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                            value={formData.material_type}
                            onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                        >
                            <option>Plastics</option>
                            <option>Metals</option>
                            <option>Paper</option>
                            <option>Mixed</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Est. Quantity</label>
                        <select
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                            value={formData.quantity_estimate}
                            onChange={(e) => setFormData({ ...formData, quantity_estimate: e.target.value })}
                        >
                            <option>1-2 Bags</option>
                            <option>3-5 Bags</option>
                            <option>Pickup Truck Load</option>
                            <option>Tricycle Load</option>
                        </select>
                    </div>

                    <button
                        onClick={handleRequest}
                        disabled={requesting}
                        className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-600 transition-all active:scale-95 disabled:opacity-70"
                    >
                        {requesting ? 'Processing...' : 'Request Pickup Now'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogisticsProvider;
