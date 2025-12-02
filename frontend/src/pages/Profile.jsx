import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import { User, Edit2, Save, X, Package, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [myListings, setMyListings] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                email: user.email,
                vehicle_type: user.vehicle_type || '',
                license_plate: user.license_plate || '',
            });
            fetchMyListings();
        }
    }, [user]);

    const fetchMyListings = async () => {
        try {
            // Assuming we have an endpoint or filter for my listings
            // For now, fetching all and filtering client-side (not ideal for prod but works for MVP)
            const res = await api.get('listings/');
            const myItems = res.data.filter(item => item.seller === user.id);
            setMyListings(myItems);
        } catch (err) {
            console.error("Failed to fetch listings", err);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.patch('users/me/', formData);
            setIsEditing(false);
            // Ideally update auth context user here, but page refresh works for now
            window.location.reload();
        } catch (err) {
            console.error("Failed to update profile", err);
            alert("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Profile Card */}
            <div className="bg-white p-8 rounded-2xl shadow-sm relative">
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                >
                    {isEditing ? <X size={20} /> : <Edit2 size={20} />}
                </button>

                <div className="text-center">
                    <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto flex items-center justify-center text-primary text-4xl font-bold mb-4">
                        {user.username[0].toUpperCase()}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{user.username}</h1>
                    <span className="inline-block mt-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600 uppercase">
                        {user.role}
                    </span>
                </div>

                {isEditing ? (
                    <form onSubmit={handleUpdate} className="mt-8 max-w-md mx-auto space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        {user.role === 'COLLECTOR' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                                    <select
                                        value={formData.vehicle_type}
                                        onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    >
                                        <option value="TRICYCLE">Tricycle (Aboboyaa)</option>
                                        <option value="TRUCK">Truck</option>
                                        <option value="VAN">Van</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                                    <input
                                        type="text"
                                        value={formData.license_plate}
                                        onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                            </>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            Save Changes
                        </button>
                    </form>
                ) : (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center border-t pt-8">
                        <div>
                            <p className="text-gray-500 text-sm">Email</p>
                            <p className="font-medium">{user.email}</p>
                        </div>
                        {user.role === 'COLLECTOR' && (
                            <>
                                <div>
                                    <p className="text-gray-500 text-sm">Vehicle</p>
                                    <p className="font-medium">{user.vehicle_type}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-sm">License Plate</p>
                                    <p className="font-medium">{user.license_plate}</p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* My Listings Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Package className="text-primary" />
                    My Listings
                </h2>
                {myListings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {myListings.map(item => (
                            <Link to={`/marketplace/${item.id}`} key={item.id} className="flex gap-4 p-3 border rounded-xl hover:border-primary transition-colors">
                                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                    {item.image ? (
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <Package size={24} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                                    <p className="text-sm text-gray-500 mb-1">{item.quantity} • {item.material_type}</p>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.is_free ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                        {item.is_free ? 'FREE' : `₵${item.price}`}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>You haven't posted any listings yet.</p>
                        <Link to="/marketplace/create" className="text-primary font-bold hover:underline mt-2 inline-block">
                            Create your first listing
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
