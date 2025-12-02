import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Truck, Package, Eye, EyeOff } from 'lucide-react';

const Register = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: '',
        vehicle_type: '',
        license_plate: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const selectRole = (role) => {
        setFormData({ ...formData, role });
        if (role === 'PROVIDER') {
            // Skip vehicle details for provider
            handleSubmit(null, role);
        } else {
            setStep(2);
        }
    };

    const handleSubmit = async (e, roleOverride) => {
        if (e) e.preventDefault();
        setError('');

        const dataToSend = { ...formData };
        if (roleOverride) dataToSend.role = roleOverride;

        try {
            await register(dataToSend);
            navigate('/login');
        } catch (err) {
            if (err.response && err.response.data) {
                const errorData = err.response.data;
                if (typeof errorData === 'string') {
                    // Likely HTML response (500/404)
                    setError('Server error. Please try again later.');
                } else {
                    // JSON response
                    const firstError = Object.values(errorData).flat()[0];
                    setError(firstError || 'Registration failed. Please check your inputs.');
                }
            } else {
                setError('Registration failed. Please try again.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2">Join ReVesta</h1>
                    <p className="text-gray-500">
                        {step === 1 ? 'Create your account' : 'Collector Details'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4">
                            <p className="text-center text-sm font-medium text-gray-700 mb-4">I want to...</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => selectRole('PROVIDER')}
                                    className="flex flex-col items-center justify-center p-4 border-2 border-gray-100 rounded-xl hover:border-primary hover:bg-green-50 transition-all group"
                                >
                                    <Package size={32} className="text-gray-400 group-hover:text-primary mb-2" />
                                    <span className="font-bold text-gray-600 group-hover:text-primary">Dispose Waste</span>
                                </button>
                                <button
                                    onClick={() => selectRole('COLLECTOR')}
                                    className="flex flex-col items-center justify-center p-4 border-2 border-gray-100 rounded-xl hover:border-primary hover:bg-green-50 transition-all group"
                                >
                                    <Truck size={32} className="text-gray-400 group-hover:text-primary mb-2" />
                                    <span className="font-bold text-gray-600 group-hover:text-primary">Collect Waste</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                            <select
                                name="vehicle_type"
                                value={formData.vehicle_type}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">Select Vehicle</option>
                                <option value="TRICYCLE">Tricycle (Aboboyaa)</option>
                                <option value="TRUCK">Truck</option>
                                <option value="MOTORBIKE">Motorbike</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                            <input
                                type="text"
                                name="license_plate"
                                value={formData.license_plate}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-green-600 transition-colors shadow-md"
                        >
                            Complete Registration
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-gray-500 py-2 hover:text-gray-800"
                        >
                            Back
                        </button>
                    </form>
                )}

                <p className="mt-6 text-center text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-bold hover:underline">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
