import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Upload, X } from 'lucide-react';

const CreateListing = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [imagePreview, setImagePreview] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        material_type: '',
        description: '',
        quantity: '',
        price: '',
        is_free: false,
        location: '',
        image: null
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, image: file }));
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'image' && formData[key]) {
                data.append('image', formData[key]);
            } else if (key !== 'image') {
                data.append(key, formData[key]);
            }
        });

        try {
            await api.post('listings/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate('/marketplace');
        } catch (err) {
            console.error(err);
            setError('Failed to create listing. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Create Listing</h1>
                    <button onClick={() => navigate('/marketplace')} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Photo</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-colors relative">
                            {imagePreview ? (
                                <div className="relative">
                                    <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImagePreview(null);
                                            setFormData(prev => ({ ...prev, image: null }));
                                        }}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                    <p className="mt-2 text-sm text-gray-500">Click to upload photo</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. 50kg Mixed Plastics"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
                            <select
                                name="material_type"
                                value={formData.material_type}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                required
                            >
                                <option value="">Select Type</option>
                                <option value="Plastics">Plastics</option>
                                <option value="Metals">Metals</option>
                                <option value="Paper">Paper</option>
                                <option value="Glass">Glass</option>
                                <option value="Electronics">Electronics</option>
                                <option value="Organic">Organic</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                                type="text"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                placeholder="e.g. 2 Bags"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                required
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                required
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="e.g. Madina Market"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (GHS)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    disabled={formData.is_free}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                />
                                <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="is_free"
                                            checked={formData.is_free}
                                            onChange={handleChange}
                                            className="rounded text-primary focus:ring-primary"
                                        />
                                        Free
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-green-600 transition-colors shadow-md disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Post Listing'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateListing;

