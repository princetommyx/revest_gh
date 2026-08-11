import useAuth from '../hooks/useAuth';
import LogisticsProvider from './LogisticsProvider';
import LogisticsCollector from './LogisticsCollector';

const Home = () => {
    const { user } = useAuth();

    return (
        <div className="h-full">
            {user?.role === 'COLLECTOR' ? (
                <LogisticsCollector />
            ) : (
                <LogisticsProvider />
            )}
        </div>
    );
};

export default Home;
