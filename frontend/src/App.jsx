import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import UserChatPage from './pages/UserChatPage.jsx';
import AdminChatPage from './pages/AdminChatPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';

function HomeRedirect() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen label="Loading chat..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user?.isAdmin ? '/admin' : '/chat'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <UserChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminChatPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
