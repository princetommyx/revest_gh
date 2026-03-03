import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { promosApi } from '../api/promos';
import { Loader2, Plus, Edit2, Trash2, Megaphone, Check, X, Image as ImageIcon } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import SearchBar from '../components/common/SearchBar';
import FilterDropdown from '../components/common/FilterDropdown';
import Toast from '../components/common/Toast';

const roleOptions = [
    { value: 'ALL', label: 'All Users' },
    { value: 'SELLER', label: 'Sellers/Disposers' },
    { value: 'COLLECTOR', label: 'Collectors' },
    { value: 'RECYCLER', label: 'Recyclers' },
];

export default function PromoCardsPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [editingPromo, setEditingPromo] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        target_role: 'ALL',
        badge_text: '',
        badge_color: '#2E7D32',
        action_type: 'NAVIGATE',
        action_value: '',
        is_active: true,
        order: 0,
        image: null
    });

    const { data: promos, isLoading, error } = useQuery({
        queryKey: ['promos'],
        queryFn: promosApi.getPromos,
    });

    const createMutation = useMutation({
        mutationFn: promosApi.createPromo,
        onSuccess: () => {
            queryClient.invalidateQueries(['promos']);
            setToast({ type: 'success', message: 'Promo created successfully' });
            handleCloseModal();
        },
        onError: (error) => {
            console.error('Create error:', error);
            let message = 'Failed to create promo';
            if (error.response?.data) {
                if (typeof error.response.data === 'object') {
                    // Extract field errors
                    const errors = error.response.data;
                    const errorDetails = Object.keys(errors)
                        .map(key => `${key}: ${Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key]}`)
                        .join(' | ');
                    message += `: ${errorDetails}`;
                } else if (error.response.data.message) {
                    message += `: ${error.response.data.message}`;
                }
            } else {
                message += `: ${error.message}`;
            }
            setToast({ type: 'error', message });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => promosApi.updatePromo(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['promos']);
            setToast({ type: 'success', message: 'Promo updated successfully' });
            handleCloseModal();
        },
        onError: (error) => {
            console.error('Update error:', error);
            let message = 'Failed to update promo';
            if (error.response?.data) {
                if (typeof error.response.data === 'object') {
                    const errors = error.response.data;
                    const errorDetails = Object.keys(errors)
                        .map(key => `${key}: ${Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key]}`)
                        .join(' | ');
                    message += `: ${errorDetails}`;
                } else if (error.response.data.message) {
                    message += `: ${error.response.data.message}`;
                }
            } else {
                message += `: ${error.message}`;
            }
            setToast({ type: 'error', message });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: promosApi.deletePromo,
        onSuccess: () => {
            queryClient.invalidateQueries(['promos']);
            setToast({ type: 'success', message: 'Promo deleted successfully' });
        },
        onError: (error) => {
            setToast({ type: 'error', message: 'Failed to delete promo: ' + error.message });
        }
    });

    const handleOpenModal = (promo = null) => {
        if (promo) {
            setEditingPromo(promo);
            setFormData({
                title: promo.title,
                subtitle: promo.subtitle,
                target_role: promo.target_role,
                badge_text: promo.badge_text,
                badge_color: promo.badge_color,
                action_type: promo.action_type,
                action_value: promo.action_value,
                is_active: promo.is_active,
                order: promo.order,
                image: null // Don't reset image unless changed
            });
        } else {
            setEditingPromo(null);
            setFormData({
                title: '',
                subtitle: '',
                target_role: 'ALL',
                badge_text: '',
                badge_color: '#2E7D32',
                action_type: 'NAVIGATE',
                action_value: '',
                is_active: true,
                order: 0,
                image: null
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPromo(null);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        setFormData(prev => ({
            ...prev,
            image: e.target.files[0]
        }));
    };

    const handleCloseToast = () => {
        setToast(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'image' && !formData[key]) return;

            // Handle specific types for Django API
            let value = formData[key];
            if (key === 'is_active') value = formData[key] ? 'true' : 'false';
            if (key === 'order' && (value === '' || value === null)) value = '0';

            data.append(key, value);
        });

        if (editingPromo) {
            updateMutation.mutate({ id: editingPromo.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this promo card?')) {
            deleteMutation.mutate(id);
        }
    };

    const promosArray = Array.isArray(promos) ? promos : (promos?.results || []);

    const filteredPromos = promosArray.filter(promo => {
        const matchesSearch = promo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            promo.subtitle.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !roleFilter || promo.target_role === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-4 right-4 z-50">
                    <Toast
                        type={toast.type}
                        message={toast.message}
                        onClose={handleCloseToast}
                    />
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Promo Cards Management</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Manage dynamic banners and offers for the mobile app
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create New Promo</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <SearchBar
                            placeholder="Find promos by title..."
                            onSearch={setSearchTerm}
                        />
                    </div>
                    <div>
                        <FilterDropdown
                            label="Target Role"
                            value={roleFilter}
                            options={roleOptions}
                            onChange={setRoleFilter}
                            placeholder="All Roles"
                        />
                    </div>
                </div>
            </div>

            {/* Promos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPromos.length === 0 ? (
                    <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
                        <Megaphone className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500">No promo cards found</p>
                    </div>
                ) : (
                    filteredPromos.map((promo) => (
                        <div key={promo.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group hover:shadow-md transition-shadow relative">
                            {/* Promo Image Preview */}
                            <div className="h-40 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                                {promo.image ? (
                                    <img
                                        src={promo.image}
                                        alt={promo.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-12 h-12 text-gray-300" />
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 flex items-center space-x-2">
                                    {promo.is_active ? (
                                        <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Active</span>
                                    ) : (
                                        <span className="bg-gray-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Inactive</span>
                                    )}
                                    <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{promo.target_role}</span>
                                </div>
                                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenModal(promo)}
                                        className="p-1.5 bg-white/90 hover:bg-white text-indigo-600 rounded-lg shadow-sm"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(promo.id)}
                                        className="p-1.5 bg-white/90 hover:bg-white text-red-600 rounded-lg shadow-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4 space-y-2">
                                <div className="flex items-start justify-between">
                                    <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{promo.title}</h3>
                                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 rounded">Order: {promo.order}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[32px]">{promo.subtitle}</p>

                                <div className="pt-2 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
                                    <div className="flex items-center space-x-1">
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: promo.badge_color }}
                                        />
                                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 uppercase">{promo.badge_text || 'No Badge'}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400">{formatDate(promo.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Management Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingPromo ? 'Edit Promo Card' : 'Create New Promo'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Get 20% Extra Cash"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Subtitle</label>
                                    <textarea
                                        name="subtitle"
                                        value={formData.subtitle}
                                        onChange={handleInputChange}
                                        placeholder="Brief description for users"
                                        rows="2"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Target Role</label>
                                        <select
                                            name="target_role"
                                            value={formData.target_role}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none"
                                        >
                                            <option value="ALL">All Users</option>
                                            <option value="SELLER">Sellers</option>
                                            <option value="COLLECTOR">Collectors</option>
                                            <option value="RECYCLER">Recyclers</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Order Index</label>
                                        <input
                                            type="number"
                                            name="order"
                                            value={formData.order}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Badge Text</label>
                                        <input
                                            type="text"
                                            name="badge_text"
                                            value={formData.badge_text}
                                            onChange={handleInputChange}
                                            placeholder="Special, Hot, etc."
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Badge Color</label>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="color"
                                                name="badge_color"
                                                value={formData.badge_color}
                                                onChange={handleInputChange}
                                                className="h-9 w-12 rounded border border-gray-200 bg-transparent p-0 overflow-hidden cursor-pointer"
                                            />
                                            <span className="text-xs font-mono text-gray-500 uppercase">{formData.badge_color}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Action Type</label>
                                        <select
                                            name="action_type"
                                            value={formData.action_type}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none"
                                        >
                                            <option value="NAVIGATE">Navigate (App Screen)</option>
                                            <option value="URL">External URL</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Target Value</label>
                                        <input
                                            type="text"
                                            name="action_value"
                                            value={formData.action_value}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Wallet, Pickups"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none"
                                            required
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1 italic">
                                            Valid: Home, Marketplace, Pickups, Chat, Wallet, Profile, Help, TopUp
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Promo Image</label>
                                    <div className="flex items-center justify-center w-full">
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-all">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                                                    {formData.image ? formData.image.name : 'Click to upload image'}
                                                </p>
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                    {editingPromo && !formData.image && editingPromo.image && (
                                        <p className="text-[10px] text-gray-400 mt-1 italic text-center">Leave empty to keep existing image</p>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">Make this promo active immediately</label>
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex space-x-3">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={createMutation.isLoading || updateMutation.isLoading}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/30"
                            >
                                {(createMutation.isLoading || updateMutation.isLoading) ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Check className="w-5 h-5" />
                                )}
                                <span>{editingPromo ? 'Save Changes' : 'Create Promo'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
