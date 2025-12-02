import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Plus, MapPin, Tag } from 'lucide-react';

const Marketplace = () => {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetchListings();
    }, []);

    const fetchListings = async () => {
        try {
            const response = await api.get('listings/');
            setListings(response.data);
        } catch (error) {
            console.error('Error fetching listings:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredListings = listings.filter(l =>
        !filter || l.material_type === filter
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
                <Link to="/marketplace/create" className="bg-primary text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-green-600 transition-colors flex items-center gap-2">
                    <Plus size={20} />
                    <span>Sell Item</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['', 'Plastics', 'Metals', 'Paper', 'Glass', 'Electronics'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === type
                                ? 'bg-primary text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        {type || 'All'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="bg-white rounded-xl shadow-sm overflow-hidden h-64 animate-pulse">
                            <div className="h-40 bg-gray-200"></div>
                            <div className="p-4 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredListings.map((listing) => (
                        <Link key={listing.id} to={`/marketplace/${listing.id}`} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                            <div className="h-40 bg-gray-100 relative overflow-hidden">
                                {listing.image ? (
                                    <img src={listing.image} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <Tag size={32} />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-gray-800 shadow-sm">
                                    {listing.is_free ? 'FREE' : `₵${listing.price}`}
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-gray-900 truncate">{listing.title}</h3>
                                <p className="text-sm text-gray-500 mb-2">{listing.quantity} • {listing.material_type}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <MapPin size={12} />
                                    <span className="truncate">{listing.location}</span>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {filteredListings.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            <p>No listings found.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Marketplace;
