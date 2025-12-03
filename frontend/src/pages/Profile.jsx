// import WalletCard from '../components/WalletCard';
// import TransactionHistory from '../components/TransactionHistory';

// ... existing imports ...

const Profile = () => {
    // ... existing code ...

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* ... Profile Card ... */}
            <div className="bg-white p-8 rounded-2xl shadow-sm relative">
                {/* ... existing profile card content ... */}
            </div>

            {/* Wallet Section - Temporarily Disabled */}
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <WalletCard />
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm h-full">
                    <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
                    <TransactionHistory />
                </div>
            </div> */}
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
                    {/* ... (Editing form remains same, just ensuring context) ... */}
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
