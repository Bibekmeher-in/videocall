import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore, useUIStore } from './context/store';
import socketService from './socket/socket';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Chat from './pages/Chat';
import GroupChat from './pages/GroupChat';
import Stories from './pages/Stories';
import Profile from './pages/Profile';

// Components
import Layout from './components/Layout';
import CallPopup from './components/CallPopup';
import CallInterface from './components/CallInterface';
import Toast from './components/Toast';
import ThreeBackground from './components/ThreeBackground';

function PrivateRoute({ children }) {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
    const { isAuthenticated } = useAuthStore();
    return !isAuthenticated ? children : <Navigate to="/home" />;
}

function App() {
    const { isAuthenticated, user } = useAuthStore();
    const { darkMode, toasts, removeToast } = useUIStore();

    useEffect(() => {
        // Connect socket when user is authenticated
        if (isAuthenticated && user) {
            socketService.connect();
        }

        return () => {
            socketService.disconnect();
        };
    }, [isAuthenticated, user]);

    useEffect(() => {
        // Apply dark mode
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    return (
        <Router>
            <div className="app-shell min-h-screen">
                <ThreeBackground />
                <div className="app-glow-layer" />
                <div className="relative z-10">
                    <Routes>
                        {/* Public Routes */}
                        <Route
                            path="/login"
                            element={
                                <PublicRoute>
                                    <Login />
                                </PublicRoute>
                            }
                        />
                        <Route
                            path="/register"
                            element={
                                <PublicRoute>
                                    <Register />
                                </PublicRoute>
                            }
                        />

                        {/* Private Routes */}
                        <Route
                            path="/"
                            element={
                                <PrivateRoute>
                                    <Layout />
                                </PrivateRoute>
                            }
                        >
                            <Route index element={<Navigate to="/home" />} />
                            <Route path="home" element={<Home />} />
                            <Route path="chat/:contactId" element={<Chat />} />
                            <Route path="group/:groupId" element={<GroupChat />} />
                            <Route path="stories" element={<Stories />} />
                            <Route path="profile" element={<Profile />} />
                        </Route>

                        {/* Call Routes */}
                        <Route path="/call/:roomId" element={<PrivateRoute><CallInterface /></PrivateRoute>} />

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>

                    {/* Call Popup */}
                    <CallPopup />

                    {/* Toasts */}
                    <div className="fixed bottom-4 right-4 z-50 space-y-2">
                        {toasts.map((toast) => (
                            <Toast
                                key={toast.id}
                                {...toast}
                                onClose={() => removeToast(toast.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </Router>
    );
}

export default App;
