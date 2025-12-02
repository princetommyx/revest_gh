import useAuth from '../hooks/useAuth';
import LogisticsProvider from './LogisticsProvider';
import LogisticsCollector from './LogisticsCollector';

const Home = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Hello, {user?.username || 'Guest'}!
                </h1>
                <p className="text-gray-600">
                    {user?.role === 'COLLECTOR'
                        ? 'Go online to start receiving pickup jobs.'
                        : 'Ready to recycle? Request a pickup below.'}
                </p>
            </div>

            {user?.role === 'COLLECTOR' ? (
                <LogisticsCollector />
            ) : (
                <LogisticsProvider />
            )}
        </div>
    );
};

export default Home;
