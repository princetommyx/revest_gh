import { Link } from 'react-router-dom';

const Intro = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 relative overflow-hidden">
            {/* Background Elements (Optional for visual flair) */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-green-50 to-white -z-10"></div>

            <div className="w-full max-w-md text-center space-y-8 z-10">
                {/* Logo / Branding */}
                <div className="mb-12">
                    <h1 className="text-5xl font-extrabold text-primary tracking-tight">ReVesta</h1>
                    <p className="text-gray-500 mt-2 text-lg">Recycle. Reward. Repeat.</p>
                </div>

                {/* Actions */}
                <div className="space-y-4 w-full">
                    <Link
                        to="/login"
                        className="block w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-600 hover:shadow-xl transition-all transform hover:-translate-y-1"
                    >
                        Log in
                    </Link>

                    <Link
                        to="/register"
                        className="block w-full bg-gray-100 text-gray-800 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all"
                    >
                        Register
                    </Link>
                </div>

                {/* Footer / Terms */}
                <p className="text-xs text-gray-400 mt-8">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
};

export default Intro;
