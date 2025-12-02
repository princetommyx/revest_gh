import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import CreateListing from './pages/CreateListing';
import ListingDetail from './pages/ListingDetail';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import useAuth from './hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Home />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="marketplace/create" element={<CreateListing />} />
        <Route path="marketplace/:id" element={<ListingDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="chat" element={<Chat />} /> {/* Added Route for /chat */}
      </Route>
    </Routes>
  );
}

export default App;
