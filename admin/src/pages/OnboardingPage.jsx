import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { onboardingApi } from '../api/onboarding';
import { Loader2, Plus, Edit2, Trash2, Recycle, Check, X, Image as ImageIcon } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import SearchBar from '../components/common/SearchBar';
import Toast from '../components/common/Toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath === 'string' && !imagePath.startsWith('http')) {
        return `${API_URL}${imagePath}`;
    }
    return imagePath;
};

export default function OnboardingPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [editingScreen, setEditingScreen] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        button_text: 'Next',
        is_active: true,
        order: 0,
        image: null
    });

    const { data: screens, isLoading } = useQuery({
        queryKey: ['onboarding-screens'],
        queryFn: onboardingApi.getScreens,
    });

    const createMutation = useMutation({
        mutationFn: onboardingApi.createScreen,
        onSuccess: () => {
            queryClient.invalidateQueries(['onboarding-screens']);
            setToast({ type: 'success', message: 'Onboarding screen created successfully' });
            handleCloseModal();
        },
        onError: (error) => {
            console.error('Create error:', error);
            let message = 'Failed to create screen';
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

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => onboardingApi.updateScreen(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['onboarding-screens']);
            setToast({ type: 'success', message: 'Onboarding screen updated successfully' });
            handleCloseModal();
        },
        onError: (error) => {
            console.error('Update error:', error);
            let message = 'Failed to update screen';
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
        mutationFn: onboardingApi.deleteScreen,
        onSuccess: () => {
            queryClient.invalidateQueries(['onboarding-screens']);
            setToast({ type: 'success', message: 'Onboarding screen deleted successfully' });
        },
        onError: (error) => {
            setToast({ type: 'error', message: 'Failed to delete screen: ' + error.message });
        }
    });

    const handleOpenModal = (screen = null) => {
        if (screen) {
            setEditingScreen(screen);
            setFormData({
                title: screen.title,
                description: screen.description,
                button_text: screen.button_text,
                is_active: screen.is_active,
                order: screen.order,
                image: null
            });
        } else {
            setEditingScreen(null);
            setFormData({
                title: '',
                description: '',
                button_text: 'Next',
                is_active: true,
                order: 0,
                image: null
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingScreen(null);
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

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'image' && !formData[key]) return;

            let value = formData[key];
            if (key === 'is_active') value = formData[key] ? 'true' : 'false';

            data.append(key, value);
        });

        if (editingScreen) {
            updateMutation.mutate({ id: editingScreen.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this onboarding screen?')) {
            deleteMutation.mutate(id);
        }
    };

    const screensArray = Array.isArray(screens) ? screens : (screens?.results || []);

    const filteredScreens = screensArray.filter(screen =>
        screen.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screen.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {toast && (
                <div className="fixed top-4 right-4 z-50">
                    <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Onboarding Screens</h1>
                    <p className="text-sm text-gray-600 mt-1">Manage the welcoming experience for new users</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add New Screen</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <SearchBar placeholder="Search screens..." onSearch={setSearchTerm} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredScreens.length === 0 ? (
                    <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                        <Recycle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No onboarding screens found</p>
                    </div>
                ) : (
                    filteredScreens.map((screen) => (
                        <div key={screen.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow relative">
                            <div className="h-48 bg-gray-50 relative overflow-hidden">
                                {(screen.image || screen.image_url) ? (
                                    <img src={getImageUrl(screen.image || screen.image_url)} alt={screen.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-12 h-12 text-gray-200" />
                                    </div>
                                )}
                                <div className="absolute top-3 left-3 flex items-center space-x-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${screen.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                                        {screen.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">Order: {screen.order}</span>
                                </div>
                                <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(screen)} className="p-2 bg-white/90 hover:bg-white text-blue-600 rounded-lg shadow-sm">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(screen.id)} className="p-2 bg-white/90 hover:bg-white text-red-600 rounded-lg shadow-sm">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="font-bold text-gray-900 mb-1">{screen.title}</h3>
                                <p className="text-sm text-gray-600 line-clamp-3 mb-4 min-h-[60px]">{screen.description}</p>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-[10px] text-gray-400 font-medium">
                                    <span>BTN: {screen.button_text}</span>
                                    <span>UPDATED: {formatDate(screen.updated_at)}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 shrink-0">
                            <h2 className="text-xl font-bold text-gray-900">{editingScreen ? 'Edit Screen' : 'Add New Screen'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
                                <input
                                    type="text" name="title" value={formData.title} onChange={handleInputChange} required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                                <textarea
                                    name="description" value={formData.description} onChange={handleInputChange} required rows="3"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Button Text</label>
                                    <input
                                        type="text" name="button_text" value={formData.button_text} onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Display Order</label>
                                    <input
                                        type="number" name="order" value={formData.order} onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Illustration / Image</label>
                                <div className="space-y-4">
                                    {(formData.image || (editingScreen && (editingScreen.image || editingScreen.image_url))) && (
                                        <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
                                            <img
                                                src={formData.image ? URL.createObjectURL(formData.image) : getImageUrl(editingScreen.image || editingScreen.image_url)}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur-md">
                                                {formData.image ? 'New Upload' : 'Current Image'}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-center w-full">
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all">
                                            <div className="flex flex-col items-center justify-center py-5">
                                                <Plus className="w-8 h-8 text-gray-300 mb-1" />
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    {formData.image ? formData.image.name : 'Click to change image'}
                                                </p>
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                    {editingScreen && !formData.image && (editingScreen.image || editingScreen.image_url) && (
                                        <p className="text-[10px] text-gray-400 text-center italic">
                                            Keep empty to retain the current image
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 pt-2">
                                <input
                                    type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleInputChange}
                                    className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 outline-none"
                                />
                                <label htmlFor="is_active" className="text-sm font-bold text-gray-700 cursor-pointer">Set as Active</label>
                            </div>
                            <div className="pt-6 flex space-x-3">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-6 py-4 rounded-2xl border border-gray-100 text-gray-600 font-bold hover:bg-gray-50 transition-all">Cancel</button>
                                <button type="submit" disabled={createMutation.isLoading || updateMutation.isLoading} className="flex-1 px-6 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-2">
                                    {(createMutation.isLoading || updateMutation.isLoading) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    <span>{editingScreen ? 'Update Screen' : 'Save Screen'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
