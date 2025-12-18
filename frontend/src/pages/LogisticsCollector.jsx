import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import useWebSocket from 'react-use-websocket';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Truck, Power, History } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const providerIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const truckIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const LogisticsCollector = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isOnline, setIsOnline] = useState(false);
    const [requests, setRequests] = useState([]);
    const [activeJob, setActiveJob] = useState(null);
    const [currentLocation, setCurrentLocation] = useState({ lat: 5.6037, lon: -0.1870 });

    // WebSocket Connection
    const getSocketUrl = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';
        const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
        const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '');
        return `${wsProtocol}://${wsHost}/ws/logistics/?token=${localStorage.getItem('access_token')}`;
    };

    const { sendMessage, lastJsonMessage } = useWebSocket(getSocketUrl(), {
        onOpen: () => console.log('Connected to Logistics Network'),
        shouldReconnect: () => true,
    });

    // ... (existing useEffect for new_request)

    // Simulate Movement for Active Job
    useEffect(() => {
        let interval;
        if (activeJob && isOnline) {
            interval = setInterval(() => {
                setCurrentLocation(prev => {
                    // Simple simulation: move slightly towards target (or just random walk for demo)
                    // In a real app, this would be navigator.geolocation.watchPosition
                    const newLat = prev.lat + (Math.random() - 0.5) * 0.001;
                    const newLon = prev.lon + (Math.random() - 0.5) * 0.001;

                    // Send update via WebSocket
                    sendMessage(JSON.stringify({
                        type: 'location_update',
                        lat: newLat,
                        lon: newLon,
                        provider_id: activeJob.provider_id
                    }));

                    return { lat: newLat, lon: newLon };
                });
            }, 3000); // Update every 3 seconds
        }
        return () => clearInterval(interval);
    }, [activeJob, isOnline, sendMessage]);

    const toggleOnline = async () => {
        const newState = !isOnline;
        setIsOnline(newState);
        try {
            // Update status on backend
            await api.patch('users/me/location/', {
                is_online: newState,
                // Simulate current location (Accra)
                current_lat: 5.6037,
                current_lon: -0.1870
            });

            // If going online, fetch pending jobs
            if (newState) {
                const res = await api.get('pickups/available_jobs/', {
                    params: {
                        lat: 5.6037, // Using simulated location for now
                        lon: -0.1870
                    }
                });
                // Map API response to internal request format
                const formattedRequests = res.data.map(job => ({
                    type: 'new_request',
                    request_id: job.id,
                    material_type: job.material_type,
                    quantity: job.quantity_estimate,
                    lat: job.latitude,
                    lon: job.longitude,
                    provider_id: job.provider
                }));
                setRequests(formattedRequests);
            }
        } catch (error) {
            console.error('Failed to update status', error);
            setIsOnline(!newState); // Revert on error
        }
    };

    const acceptJob = async (request) => {
        try {
            await api.post(`pickups/${request.request_id}/accept/`);
            // Remove from list and set active
            setRequests(prev => prev.filter(r => r.request_id !== request.request_id));
            setActiveJob(request);
        } catch (error) {
            console.error("Failed to accept job", error);
            alert("Failed to accept job. It might have been taken.");
        }
    };

    return (
        <div className="h-screen relative bg-gray-100 overflow-hidden flex flex-col">
            {/* Header / Status Bar */}
            <div className="bg-white p-4 shadow-sm z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="font-bold text-gray-700">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
                <button
                    onClick={() => navigate('/ride-history')}
                    className="ml-auto px-4 py-2 rounded-full font-bold bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2 border border-gray-200"
                >
                    <History size={18} />
                    History
                </button>
                <button
                    onClick={toggleOnline}
                    className={`ml-4 px-6 py-2 rounded-full font-bold transition-colors flex items-center gap-2 ${isOnline
                        ? 'bg-red-50 text-red-500 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                >
                    <Power size={18} />
                    {isOnline ? 'Go Offline' : 'Go Online'}
                </button>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative bg-gray-200">
                <MapContainer
                    center={[currentLocation.lat, currentLocation.lon]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Collector Marker (Me) */}
                    <Marker position={[currentLocation.lat, currentLocation.lon]} icon={truckIcon}>
                        <Popup>You</Popup>
                    </Marker>

                    {/* Active Job Destination */}
                    {activeJob && (
                        <Marker position={[activeJob.lat, activeJob.lon]} icon={providerIcon}>
                            <Popup>Pickup Location</Popup>
                        </Marker>
                    )}
                </MapContainer>

                {!isOnline && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-sm z-[1000]">
                        <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                            <Truck size={48} className="mx-auto text-gray-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800">You are Offline</h3>
                            <p className="text-gray-500">Go online to start receiving pickup requests.</p>
                        </div>
                    </div>
                )}

                {/* Active Job Status */}
                {activeJob && (
                    <div className="absolute top-4 left-4 right-4 bg-white p-4 rounded-xl shadow-lg border-l-4 border-blue-500 z-[1000]">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-gray-900">Navigating to Pickup</h4>
                                <p className="text-sm text-gray-500">Simulating movement...</p>
                            </div>
                            <div className="text-right">
                                <p className="font-mono text-xs text-gray-400">
                                    {currentLocation.lat.toFixed(4)}, {currentLocation.lon.toFixed(4)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Incoming Requests Overlay */}
                {isOnline && requests.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4 max-h-[60vh] overflow-y-auto z-[1000]">
                        {requests.map((req) => (
                            <div key={req.request_id} className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-primary animate-slide-up">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">New Pickup Request</h4>
                                        <p className="text-sm text-gray-500">~2.5 km away</p>
                                    </div>
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                                        {req.material_type}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-gray-600 mb-4">
                                    <Navigation size={16} />
                                    <span className="text-sm">Near Madina Market</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setRequests(prev => prev.filter(r => r.request_id !== req.request_id))}
                                        className="py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        onClick={() => acceptJob(req)}
                                        className="py-2 rounded-lg font-bold bg-primary text-white hover:bg-green-600 shadow-md"
                                    >
                                        Accept Job
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogisticsCollector;
