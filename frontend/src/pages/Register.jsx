import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { ArrowLeft, X, Truck, Trash2, Recycle } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useToast } from '../contexts/ToastContext';
import GoogleAuthButton from '../components/GoogleAuthButton';

const Register = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phoneNumber: '',
        city: 'Accra',
        role: 'COLLECTOR',
        termsAccepted: false,
        // Collector
        vehicle_type: '',
        license_plate: '',
        // Recycler
        recycler_type: 'INDIVIDUAL', // INDIVIDUAL or COMPANY
        company_name: '',
        tax_id: '',
        national_id: '',
    });
    const [error, setError] = useState('');
    const [loadingRole, setLoadingRole] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, login } = useAuth();
    const { showSuccess, showError } = useToast();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const selectRole = (role) => {
        setLoadingRole(role);
        setTimeout(() => {
            setFormData({ ...formData, role });
            setStep(2);
            setLoadingRole(null);
        }, 400);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.termsAccepted) {
            setError('You must accept the Terms of Service and Privacy Policy.');
            return;
        }

        setIsSubmitting(true);

        try {
            const dataToSend = {
                username: formData.username,
                email: formData.email,
                phone_number: formData.phoneNumber,
                city: formData.city,
                role: formData.role,
                password: formData.password || 'Password123!',
                ...formData
            };

            // Register the user
            await register(dataToSend);
            console.log('Registration successful');

            // Show success immediately after registration
            showSuccess('Account created successfully! Welcome to ReVesta!');

            // Try to auto-login
            try {
                const loginPassword = formData.password || 'Password123!';
                await login(formData.email, loginPassword);
                console.log('Auto-login successful');
                navigate('/');
            } catch (loginErr) {
                console.log('Auto-login failed, redirecting to login page:', loginErr);
                // If auto-login fails, just redirect to login page
                // The registration was still successful
                setTimeout(() => {
                    navigate('/login');
                }, 1500);
            }
        } catch (err) {
            console.error('Registration error:', err);
            if (err.response && err.response.data) {
                const errorData = err.response.data;
                console.log('Error Data:', errorData);
                const firstError = Object.values(errorData).flat()[0];
                const errorMessage = firstError || 'Registration failed.';
                setError(errorMessage);
                showError(`Registration Error: ${errorMessage}`);
            } else {
                setError('Registration failed. Please try again.');
                showError('Registration failed. Please check your connection.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'SELLER': return 'Disposer';
            case 'COLLECTOR': return 'Collector';
            case 'RECYCLER': return 'Recycler';
            default: return 'User';
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-white flex flex-col">
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                    <button onClick={() => step === 1 ? navigate('/intro') : setStep(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-gray-900" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">Register</h1>
                    <div className="w-8"></div>
                </div>

                <div className="flex-1 px-6 py-4 max-w-md mx-auto w-full">
                    <div className="flex justify-end mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🇬🇭</span>
                            <span className="font-bold text-gray-900">EN</span>
                        </div>
                    </div>

                    {step === 1 ? (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Choose your role</h2>
                            <div className="space-y-4">
                                <button
                                    onClick={() => selectRole('COLLECTOR')}
                                    disabled={loadingRole !== null}
                                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-2xl hover:border-primary hover:bg-green-50 transition-all group text-left disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loadingRole === 'COLLECTOR' ? (
                                        <div className="w-full flex items-center justify-center py-2">
                                            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="ml-3 font-bold text-gray-900">Selecting...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                <Truck size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">Become a Collector</h3>
                                                <p className="text-sm text-gray-500">Pick up waste and earn money</p>
                                            </div>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => selectRole('SELLER')}
                                    disabled={loadingRole !== null}
                                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-2xl hover:border-primary hover:bg-green-50 transition-all group text-left disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loadingRole === 'SELLER' ? (
                                        <div className="w-full flex items-center justify-center py-2">
                                            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="ml-3 font-bold text-gray-900">Selecting...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <Trash2 size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">Become a Disposer</h3>
                                                <p className="text-sm text-gray-500">Dispose of waste responsibly</p>
                                            </div>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => selectRole('RECYCLER')}
                                    disabled={loadingRole !== null}
                                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-2xl hover:border-primary hover:bg-green-50 transition-all group text-left disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loadingRole === 'RECYCLER' ? (
                                        <div className="w-full flex items-center justify-center py-2">
                                            <svg className="animate-spin h-8 w-8 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="ml-3 font-bold text-gray-900">Selecting...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                                <Recycle size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">Become a Recycler</h3>
                                                <p className="text-sm text-gray-500">Buy and process recyclables</p>
                                            </div>
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 mb-8">Become a {getRoleLabel(formData.role)}</h2>

                            {formData.role === 'SELLER' && (
                                <>
                                    <GoogleAuthButton mode="register" />
                                    <div className="relative my-8">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-gray-100"></span>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-2 bg-white text-gray-500">Or register with email</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {error && (
                                <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">Username</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder="Choose a username"
                                        className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Enter email address"
                                        className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password || ''}
                                        onChange={handleChange}
                                        placeholder="Create a password"
                                        className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">Phone number</label>
                                    <div className="flex gap-3">
                                        <div className="w-1/3 bg-gray-100 rounded-xl border border-transparent flex items-center justify-center gap-2 px-3">
                                            <span className="text-lg">🇬🇭</span>
                                            <span className="text-gray-700 font-medium">+233</span>
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="tel"
                                                name="phoneNumber"
                                                value={formData.phoneNumber}
                                                onChange={handleChange}
                                                placeholder="Mobile number"
                                                className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">City</label>
                                    <div className="relative">
                                        <select
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all appearance-none"
                                        >
                                            <option value="Accra">Accra</option>
                                            <option value="Kumasi">Kumasi</option>
                                            <option value="Takoradi">Takoradi</option>
                                            <option value="Tamale">Tamale</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 1.5L6 6.5L11 1.5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Role Specific Fields */}
                                {formData.role === 'COLLECTOR' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900 mb-2">Vehicle Type</label>
                                            <div className="relative">
                                                <select
                                                    name="vehicle_type"
                                                    value={formData.vehicle_type}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all appearance-none"
                                                >
                                                    <option value="">Select Vehicle</option>
                                                    <option value="TRICYCLE">Tricycle (Aboboyaa)</option>
                                                    <option value="TRUCK">Truck</option>
                                                    <option value="MOTORBIKE">Motorbike</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900 mb-2">License Plate</label>
                                            <input
                                                type="text"
                                                name="license_plate"
                                                value={formData.license_plate}
                                                onChange={handleChange}
                                                placeholder="Enter license plate"
                                                className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                            />
                                        </div>
                                    </>
                                )}

                                {formData.role === 'RECYCLER' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900 mb-2">Recycler Type</label>
                                            <div className="flex gap-4 mb-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="recycler_type"
                                                        value="INDIVIDUAL"
                                                        checked={formData.recycler_type === 'INDIVIDUAL'}
                                                        onChange={handleChange}
                                                        className="text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">Individual</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="recycler_type"
                                                        value="COMPANY"
                                                        checked={formData.recycler_type === 'COMPANY'}
                                                        onChange={handleChange}
                                                        className="text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">Company</span>
                                                </label>
                                            </div>
                                        </div>

                                        {formData.recycler_type === 'COMPANY' ? (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-900 mb-2">Company Name</label>
                                                    <input
                                                        type="text"
                                                        name="company_name"
                                                        value={formData.company_name}
                                                        onChange={handleChange}
                                                        placeholder="Enter company name"
                                                        className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-900 mb-2">Tax ID</label>
                                                    <input
                                                        type="text"
                                                        name="tax_id"
                                                        value={formData.tax_id}
                                                        onChange={handleChange}
                                                        placeholder="Enter Tax ID"
                                                        className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900 mb-2">National ID</label>
                                                <input
                                                    type="text"
                                                    name="national_id"
                                                    value={formData.national_id}
                                                    onChange={handleChange}
                                                    placeholder="Enter National ID"
                                                    className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="flex items-start gap-3 mt-8">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            name="termsAccepted"
                                            checked={formData.termsAccepted}
                                            onChange={handleChange}
                                            className="w-5 h-5 border-gray-300 rounded text-primary focus:ring-primary"
                                            id="terms"
                                        />
                                    </div>
                                    <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed">
                                        By registering, you agree to our <span className="text-green-500 font-medium">Terms of Service</span> and <span className="text-green-500 font-medium">Privacy policy</span>, commit to comply with obligations under the European Union and local legislation and provide only legal services and content on the Revesta Platform.
                                    </label>
                                </div>

                                <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                                    Once you've become a {getRoleLabel(formData.role).toLowerCase()}, we will occasionally send you offers and promotions related to our services. You can always unsubscribe by changing your communication preferences.
                                </p>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-primary text-white py-4 rounded-full font-bold text-lg hover:bg-green-600 transition-colors shadow-md mt-6 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center space-x-2">
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Registering...</span>
                                        </div>
                                    ) : (
                                        `Register as a ${getRoleLabel(formData.role)}`
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </PageTransition>
    );
};

export default Register;
