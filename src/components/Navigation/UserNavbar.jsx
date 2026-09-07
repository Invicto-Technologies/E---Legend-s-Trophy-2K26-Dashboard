import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { subscribeLiveData, subscribeActiveTournament, resolveTournamentLabels } from '../../services/rtdbService';
import ThemeToggle from '../3D/ThemeToggle';
import {
    MdLiveTv,
    MdAdminPanelSettings,
    MdMenu,
    MdClose,
    MdEmojiEvents,
    MdCalendarToday,
    MdHome,
    MdDownload,
    MdHistoryEdu
} from 'react-icons/md';
import './UserNavbar.css';
import logoImg from '../../Images/e22_logo_transparent.png';

const UserNavbar = () => {
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [tourneyData, setTourneyData] = useState(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 30);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });

        const unsub = subscribeLiveData((data) => {
            setIsLive(Boolean(data?.isLive));
        });

        const unsubTourney = subscribeActiveTournament((tourney) => {
            setTourneyData(tourney);
        });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            unsub();
            unsubTourney();
        };
    }, []);

    const labels = resolveTournamentLabels(tourneyData);

    const isActive = (path) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <header className={`user-nav-header ${isScrolled ? 'scrolled' : ''}`}>
            <div className="user-nav-inner">
                {/* Brand */}
                <Link to="/" className="user-nav-brand" data-tooltip={labels.fullName}>
                    <img src={logoImg} alt="E-Legends Logo" className="brand-logo-img" />
                    <span className="brand-text">
                        {labels.headerPrefix}{' '}
                        <span className="brand-accent">{labels.headerAccent}</span>
                    </span>
                </Link>

                {/* Desktop Nav Links */}
                <nav className="user-nav-links">
                    <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                        <MdHome className="nav-icon" /> Home
                    </Link>
                    <Link to="/fixtures" className={`nav-link ${isActive('/fixtures') ? 'active' : ''}`}>
                        <MdCalendarToday className="nav-icon" /> Fixtures
                    </Link>
                    <Link to="/live" className={`nav-link live-link ${isActive('/live') ? 'active' : ''}`}>
                        <MdLiveTv className="nav-icon" />
                        <span>Live Score</span>
                        {isLive && <span className="live-pulse-dot" />}
                    </Link>
                    <Link to="/rankings" className={`nav-link ${isActive('/rankings') ? 'active' : ''}`}>
                        <MdEmojiEvents className="nav-icon" /> Rankings
                    </Link>
                    <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>
                        <MdHistoryEdu className="nav-icon" /> History
                    </Link>
                    <Link to="/download" className={`nav-link ${isActive('/download') ? 'active' : ''}`}>
                        <MdDownload className="nav-icon" /> App
                    </Link>
                </nav>

                {/* Right Action */}
                <div className="user-nav-right">
                    <ThemeToggle />
                    <Link to="/admin" className="admin-portal-btn">
                        <MdAdminPanelSettings />
                        <span>Admin</span>
                    </Link>
                    <button
                        className="mobile-toggle-btn"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle Navigation"
                    >
                        {mobileMenuOpen ? <MdClose /> : <MdMenu />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav Overlay */}
            {mobileMenuOpen && (
                <div className="mobile-nav-menu">
                    <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`}>
                        <MdHome /> Home
                    </Link>
                    <Link to="/fixtures" onClick={() => setMobileMenuOpen(false)} className={`mobile-nav-link ${isActive('/fixtures') ? 'active' : ''}`}>
                        <MdCalendarToday /> Fixtures
                    </Link>
                    <Link to="/live" onClick={() => setMobileMenuOpen(false)} className={`mobile-nav-link live-link ${isActive('/live') ? 'active' : ''}`}>
                        <MdLiveTv /> Live Score {isLive && <span className="live-pulse-dot" />}
                    </Link>
                    <Link to="/rankings" onClick={() => setMobileMenuOpen(false)} className={`mobile-nav-link ${isActive('/rankings') ? 'active' : ''}`}>
                        <MdEmojiEvents /> Rankings
                    </Link>
                    <Link to="/history" onClick={() => setMobileMenuOpen(false)} className={`mobile-nav-link ${isActive('/history') ? 'active' : ''}`}>
                        <MdHistoryEdu /> History
                    </Link>
                    <Link to="/download" onClick={() => setMobileMenuOpen(false)} className={`mobile-nav-link ${isActive('/download') ? 'active' : ''}`}>
                        <MdDownload /> App Download
                    </Link>
                    <div className="mobile-nav-theme-row">
                        <span className="mobile-theme-text">Display Mode</span>
                        <ThemeToggle />
                    </div>
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link admin-link">
                        <MdAdminPanelSettings /> Admin Console
                    </Link>
                </div>
            )}
        </header>
    );
};

export default UserNavbar;
