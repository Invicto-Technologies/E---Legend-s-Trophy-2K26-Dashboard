import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Theme Context and 3D Transition Engine
import { ThemeProvider } from './contexts/ThemeContext';
import { AdminTournamentProvider } from './contexts/AdminTournamentContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Theme3DTransition from './components/3D/Theme3DTransition';
import CustomTooltip from './components/common/Tooltip/CustomTooltip';
import PageTransition from './components/common/PageTransition/PageTransition';
import PageLoader from './components/common/PageLoader/PageLoader';
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
import GalleryManagement from './pages/Admin/GalleryManagement/GalleryManagement';
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
const AppLayout = () => {
    const location = useLocation();
    const { isLoggedIn, isChecking, logout } = useAuth();
    const isAdminRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';

    useEffect(() => {
        // Record site visitor on entry (once per session)
        recordWebView();
    }, []);

    if (isChecking) {
        return (
            <PageLoader
                message="Initializing Tournament Engine..."
                subtitle="Verifying session credentials and telemetry config"
            />
        );
    }

    return (
        <div className="app-root">
            {/* Header selection */}
            {isAdminRoute ? (
                <AdminNavbar onLogout={logout} />
            ) : (
                location.pathname !== '/admin/login' && <UserNavbar />
            )}

            <main className="app-main-content">
                <PageTransition>
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
                                    <AdminLogin />
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
                            path="/admin/gallery"
                            element={
                                isLoggedIn ? (
                                    <GalleryManagement />
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
                </PageTransition>
            </main>
        </div>
    );
};

function App() {
    useEffect(() => {
        const unsub = subscribeActiveTournament((tourney) => {
            const labels = resolveTournamentLabels(tourney);
            if (labels.webTitle) {
                document.title = labels.webTitle;
            }
        });
        return () => unsub();
    }, []);

    return (
        <ThemeProvider>
            <Theme3DTransition />
            <CustomTooltip />
            <Router>
                <AuthProvider>
                    <ScrollToTop />
                    <AdminTournamentProvider>
                        <AppLayout />
                    </AdminTournamentProvider>
                </AuthProvider>
            </Router>
        </ThemeProvider>
    );
}

export default App;
