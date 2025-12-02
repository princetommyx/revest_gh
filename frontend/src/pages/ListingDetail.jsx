import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, MapPin, User, MessageSquare, Tag } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const ListingDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchListing();
    }, [id]);

    const fetchListing = async () => {
        try {
            const response = await api.get(`listings/${id}/`);
            setListing(response.data);
        } catch (error) {
            console.error('Error fetching listing:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!listing) return <div className="p-8 text-center">Listing not found</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6"
            >
                <ArrowLeft size={20} />
                Back to Marketplace
            </button>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
                {/* Image Section */}
                <div className="h-64 md:h-auto bg-gray-100 relative">
                    {listing.image ? (
                        <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Tag size={64} />
                        </div>
                    )}
                </div>

                {/* Details Section */}
                <div className="p-8 space-y-6">
                    <div>
                        <div className="flex justify-between items-start">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${listing.is_free ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                {listing.is_free ? 'FREE' : `₵${listing.price}`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 mb-4">
                            <MapPin size={18} />
                            <span>{listing.location}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-medium text-gray-600">
                                {listing.material_type}
                            </span>
                            <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-medium text-gray-600">
                                {listing.quantity}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                        <p className="text-gray-600 leading-relaxed">
                            {listing.description}
                        </p>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                    <User size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{listing.seller_name}</p>
                                    <p className="text-xs text-gray-500">Seller</p>
                                </div>
                            </div>
                        </div>

                        {user?.username !== listing.seller_name && (
                            <button
                                onClick={() => navigate('/chat', {
                                    state: {
                                        startChatWith: {
                                            id: listing.seller,
                                            username: listing.seller_name,
                                            role: 'SELLER'
                                        }
                                    }
                                })}
                                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-md"
                            >
                                <MessageSquare size={20} />
                                Contact Seller
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ListingDetail;
