import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Package, MapPin } from 'lucide-react';
import api from '../api/axios';

const RideHistory = () => {
    const navigate = useNavigate();
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get('pickups/history/');
                setRides(response.data);
            } catch (error) {
                console.error('Failed to fetch ride history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Ride History</h1>
            </div>

            <div className="p-4 space-y-4 max-w-lg mx-auto">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : rides.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <Package size={48} className="mx-auto mb-3 opacity-30" />
                        <p>No completed rides yet.</p>
                    </div>
                ) : (
                    rides.map((ride) => (
                        <div key={ride.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                    <Calendar size={14} />
                                    <span>{formatDate(ride.created_at)}</span>
                                </div>
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase">
                                    {ride.status}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {ride.material_type}
                            </h3>

                            <div className="flex items-center gap-2 text-gray-600 mb-3">
                                <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                                    {ride.quantity_estimate}
                                </span>
                            </div>

                            {/* Location (if available in future, simple logic for now) */}
                            <div className="flex items-start gap-2 text-gray-500 text-sm">
                                <MapPin size={14} className="mt-0.5 shrink-0" />
                                <span className="line-clamp-1">
                                    Lat: {ride.latitude?.toFixed(4)}, Lon: {ride.longitude?.toFixed(4)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RideHistory;
