import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Edit2, Save, X, HelpCircle, UserPlus, Settings, LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';

const Profile = () => {
    const { user, setUser, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [myListings, setMyListings] = useState([]);
    const [formData, setFormData] = useState({
        email: user?.email || '',
        vehicle_type: user?.vehicle_type || '',
        license_plate: user?.license_plate || '',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                email: user.email || '',
                vehicle_type: user.vehicle_type || '',
                license_plate: user.license_plate || '',
            });
            fetchMyListings();
        }
    }, [user]);

    const fetchMyListings = async () => {
        try {
            const response = await api.get('market/listings/my/');
            setMyListings(response.data);
        } catch (error) {
            console.error('Error fetching listings:', error);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.patch('users/me/', formData);
            setUser(response.data);
            setIsEditing(false);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* ... Profile Card ... */}
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
                    <p className="text-gray-500 font-medium">{user.email}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                            {user?.role || 'User'}
                        </span>
                        {user.is_verified && (
                            <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-bold">
                                Verified
                            </span>
                        )}
                    </div>
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
                    <div className="mt-8">
                        {/* Role Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            {user?.role === 'RECYCLER' ? (
                                <>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                        <p className="text-gray-500 text-sm font-medium">Total Buys</p>
                                        <p className="text-2xl font-bold text-gray-900">0</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                        <p className="text-gray-500 text-sm font-medium">Pending</p>
                                        <p className="text-2xl font-bold text-gray-900">0</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                        <p className="text-gray-500 text-sm font-medium">Success</p>
                                        <p className="text-2xl font-bold text-gray-900">0</p>
                                    </div>
                                </>
                            ) : user?.role === 'SELLER' ? (
                                <>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                        <p className="text-gray-500 text-sm font-medium">Total Sales</p>
                                        <p className="text-2xl font-bold text-gray-900">0</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                        <p className="text-gray-500 text-sm font-medium">Active</p>
                                        <p className="text-2xl font-bold text-gray-900">0</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                        <p className="text-gray-500 text-sm font-medium">Recycled</p>
                                        <p className="text-2xl font-bold text-gray-900">0 kg</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                        <p className="text-gray-500 text-sm font-medium">Pickups</p>
                                        <p className="text-2xl font-bold text-gray-900">0</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                        <p className="text-gray-500 text-sm font-medium">Distance</p>
                                        <p className="text-2xl font-bold text-gray-900">0 km</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                        <p className="text-gray-500 text-sm font-medium">Rating</p>
                                        <p className="text-2xl font-bold text-gray-900">5.0</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center border-t pt-8">
                            <div>
                                <p className="text-gray-500 text-sm">Email</p>
                                <p className="font-medium">{user.email}</p>
                            </div>
                            {user?.role === 'COLLECTOR' && (
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
                            {user?.role === 'RECYCLER' && (
                                <>
                                    {user.company_name && (
                                        <div>
                                            <p className="text-gray-500 text-sm">Company</p>
                                            <p className="font-medium">{user.company_name}</p>
                                        </div>
                                    )}
                                    {user.tax_id && (
                                        <div>
                                            <p className="text-gray-500 text-sm">Tax ID</p>
                                            <p className="font-medium">{user.tax_id}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>



            {/* Quick Actions Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="font-bold text-lg mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Admin Dashboard - Only for admins */}
                    {(user?.is_staff || user?.is_superuser) && (
                        <Link
                            to="/admin-dashboard"
                            className="flex items-center gap-4 p-4 border-2 border-primary bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl hover:border-primary hover:shadow-lg transition-all group"
                        >
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Settings size={24} className="text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    Admin Dashboard
                                    <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">ADMIN</span>
                                </h3>
                                <p className="text-sm text-gray-500">Manage platform & users</p>
                            </div>
                        </Link>
                    )}

                    {/* Troubleshooting */}
                    <button
                        onClick={() => alert('Troubleshooting guide coming soon! For now, please contact support.')}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <HelpCircle size={24} className="text-blue-600" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900">Troubleshooting</h3>
                            <p className="text-sm text-gray-500">Get help & support</p>
                        </div>
                    </button>

                    {/* Invite a Friend */}
                    <button
                        onClick={() => {
                            const shareUrl = window.location.origin;
                            const shareText = `Join me on ReVesta! Sign up and let's make recycling easier together. ${shareUrl}/register`;
                            if (navigator.share) {
                                navigator.share({ title: 'ReVesta Invitation', text: shareText, url: shareUrl });
                            } else {
                                navigator.clipboard.writeText(shareText);
                                alert('Invitation link copied to clipboard!');
                            }
                        }}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <UserPlus size={24} className="text-green-600" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900">Invite a Friend</h3>
                            <p className="text-sm text-gray-500">Share the app</p>
                        </div>
                    </button>

                    {/* Settings */}
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                            <Settings size={24} className="text-purple-600" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900">Settings</h3>
                            <p className="text-sm text-gray-500">Edit your profile</p>
                        </div>
                    </button>

                    {/* Exit / Logout */}
                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to log out?')) {
                                logout();
                            }
                        }}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-200 transition-colors">
                            <LogOut size={24} className="text-red-600" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900">Exit</h3>
                            <p className="text-sm text-gray-500">Log out of your account</p>
                        </div>
                    </button>
                </div>
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
