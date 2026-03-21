import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { loading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen label="Loading chat..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (adminOnly && !user?.isAdmin) {
    return <Navigate to="/chat" replace />;
  }

  if (!adminOnly && user?.isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
