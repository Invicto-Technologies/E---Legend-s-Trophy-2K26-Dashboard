import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Theme Context and 3D Transition Engine
import { ThemeProvider } from './contexts/ThemeContext';
import { AdminTournamentProvider } from './contexts/AdminTournamentContext';
import Theme3DTransition from './components/3D/Theme3DTransition';
import CustomTooltip from './components/common/Tooltip/CustomTooltip';
import { subscribeActiveTournament, resolveTournamentLabels, recordWebView } from './services/rtdbService';

// Navigation Headers
import UserNavbar from './components/Navigation/UserNavbar';
import AdminNavbar from './components/Navigation/AdminNavbar';

// User 3D Views
import Home3D from './pages/Home/Home3D';
import Fixtures3D from './pages/Fixtures/Fixtures3D';
import LiveScore3D from './pages/LiveScore/LiveScore3D';
import Rankings3D from './pages/Rankings/Rankings3D';
import History3D from './pages/History/History3D';
import PublishingPage from './pages/PublishingPage/PublishingPage';

// Admin Suite Views
import AdminDashboard from './pages/Admin/Dashboard/AdminDashboard';
import TournamentManagement from './pages/Admin/TournamentManagement/TournamentManagement';
import DrawManagement from './pages/Admin/DrawManagement/DrawManagement';
import ScoringConsole from './pages/Admin/Scoring/ScoringConsole';
import StoriesManagement from './pages/Admin/StoriesManagement/StoriesManagement';
import TeamManagement from './pages/Admin/TeamManagement/TeamManagement';
import AdminLogin from './pages/Admin/Login/AdminLogin';

// Scroll to top helper on route navigation
const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

// Layout Controller that switches between UserNavbar and AdminNavbar
const AppLayout = ({ isLoggedIn, onLogin, onLogout }) => {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';

    useEffect(() => {
        // Record site visitor on entry (once per session)
        recordWebView();
    }, []);

    return (
        <div className="app-root">
            {/* Header selection */}
            {isAdminRoute ? (
                <AdminNavbar onLogout={onLogout} />
            ) : (
                location.pathname !== '/admin/login' && <UserNavbar />
            )}

            <main className="app-main-content">
                <Routes>
                    {/* Public User 3D Views */}
                    <Route path="/" element={<Home3D />} />
                    <Route path="/home" element={<Home3D />} />
                    <Route path="/fixtures" element={<Fixtures3D />} />
                    <Route path="/live" element={<LiveScore3D />} />
                    <Route path="/match/:matchTitle" element={<LiveScore3D />} />
                    <Route path="/rankings" element={<Rankings3D />} />
                    <Route path="/history" element={<History3D />} />
                    <Route path="/history/:editionId" element={<History3D />} />
                    <Route path="/download" element={<PublishingPage />} />

                    {/* Admin Login & Legacy alias */}
                    <Route
                        path="/admin/login"
                        element={
                            isLoggedIn ? (
                                <Navigate to="/admin" replace />
                            ) : (
                                <AdminLogin onLogin={onLogin} />
                            )
                        }
                    />
                    <Route path="/gtpxj" element={<Navigate to="/admin/login" replace />} />

                    {/* Protected Admin Console Routes */}
                    <Route
                        path="/admin"
                        element={
                            isLoggedIn ? (
                                <AdminDashboard />
                            ) : (
                                <Navigate to="/admin/login" replace />
                            )
                        }
                    />
                    <Route
                        path="/admin/tournaments"
                        element={
                            isLoggedIn ? (
                                <TournamentManagement />
                            ) : (
                                <Navigate to="/admin/login" replace />
                            )
                        }
                    />
                    <Route
                        path="/admin/draw"
                        element={
                            isLoggedIn ? (
                                <DrawManagement />
                            ) : (
                                <Navigate to="/admin/login" replace />
                            )
                        }
                    />
                    <Route
                        path="/admin/scoring"
                        element={
                            isLoggedIn ? (
                                <ScoringConsole />
                            ) : (
                                <Navigate to="/admin/login" replace />
                            )
                        }
                    />
                    <Route
                        path="/admin/stories"
                        element={
                            isLoggedIn ? (
                                <StoriesManagement />
                            ) : (
                                <Navigate to="/admin/login" replace />
                            )
                        }
                    />
                    <Route
                        path="/admin/teams"
                        element={
                            isLoggedIn ? (
                                <TeamManagement />
                            ) : (
                                <Navigate to="/admin/login" replace />
                            )
                        }
                    />

                    {/* Catch all fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
};

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsLoggedIn(loggedIn);
        setIsChecking(false);
    }, []);

    useEffect(() => {
        const unsub = subscribeActiveTournament((tourney) => {
            const labels = resolveTournamentLabels(tourney);
            if (labels.webTitle) {
                document.title = labels.webTitle;
            }
        });
        return () => unsub();
    }, []);

    const handleLogin = () => {
        setIsLoggedIn(true);
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
    };

    if (isChecking) {
        return <div className="app-preloader" />;
    }

    return (
        <ThemeProvider>
            <Theme3DTransition />
            <CustomTooltip />
            <Router>
                <ScrollToTop />
                <AdminTournamentProvider>
                    <AppLayout
                        isLoggedIn={isLoggedIn}
                        onLogin={handleLogin}
                        onLogout={handleLogout}
                    />
                </AdminTournamentProvider>
            </Router>
        </ThemeProvider>
    );
}

export default App;