import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    MdEmojiEvents,
    MdLogout,
    MdPublic,
    MdKeyboardArrowDown,
    MdCheck,
    MdCheckCircle,
    MdDashboard
} from 'react-icons/md';
import ThemeToggle from '../3D/ThemeToggle';
import { useAdminTournament } from '../../contexts/AdminTournamentContext';
import { resolveTournamentKey } from '../../services/rtdbService';
import './AdminNavbar.css';
import '../../components/common/ConfirmationModal.css';
import logoImg from '../../Images/Logo_White.png';

const AdminNavbar = ({ onLogout }) => {
    const navigate = useNavigate();
    const {
        tournaments,
        selectedTournamentId,
        selectTournament,
        activeTournamentId,
        isSelectionActive
    } = useAdminTournament();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside and escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDropdownOpen]);

    const currentTournament = selectedTournamentId
        ? (tournaments.find(
            (t) => resolveTournamentKey(t.id) === resolveTournamentKey(selectedTournamentId)
        ) || { id: selectedTournamentId, name: selectedTournamentId })
        : null;
    const currentDisplayName = currentTournament ? (currentTournament.name || currentTournament.id) : 'Select Tournament';

    const handleSelectTournament = (tourneyId) => {
        selectTournament(tourneyId);
        setIsDropdownOpen(false);
        if (!tourneyId) {
            navigate('/admin');
        } else {
            navigate('/admin/tournaments');
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('adminSelectedTournamentId');
        localStorage.removeItem('adminSelectedTournamentId');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('isAdmin');
        if (onLogout) onLogout();
        navigate('/admin/login');
    };

    return (
        <header className="admin-nav-header">
            <div className="admin-nav-inner">
                {/* Brand and Dashboard Nav */}
                <div className="admin-left-group">
                    <Link to="/admin" className="admin-brand-link">
                        <img src={logoImg} alt="Logo" className="admin-logo-img" />
                        <div className="admin-brand-text">
                            <span className="admin-brand-name">E-LEGEND'S TROPHY</span>
                            <span className="admin-console-badge">CONTROL PANEL</span>
                        </div>
                    </Link>
                </div>

                {/* Tournament Selector Custom Dropdown in Header */}
                <div className="admin-tourney-selector-wrap" ref={dropdownRef}>
                    <button
                        type="button"
                        className={`custom-select-trigger ${isDropdownOpen ? 'menu-open' : ''}`}
                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                        aria-expanded={isDropdownOpen}
                        aria-haspopup="listbox"
                        id="admin-header-tourney-select"
                        title={selectedTournamentId ? "Click to change target tournament" : "Click to select a tournament"}
                    >
                        <div className={`selector-icon-bubble ${!selectedTournamentId ? 'neutral' : ''}`}>
                            {selectedTournamentId ? (
                                <MdEmojiEvents className="selector-trophy-icon" />
                            ) : (
                                <MdDashboard className="selector-trophy-icon" />
                            )}
                        </div>
                        <div className="selector-field">
                            <span className="selector-caption">Target Tournament</span>
                            <span className={`selected-tourney-name ${!selectedTournamentId ? 'is-placeholder' : ''}`} title={currentDisplayName}>
                                {currentDisplayName}
                            </span>
                        </div>
                        <MdKeyboardArrowDown className={`select-dropdown-arrow ${isDropdownOpen ? 'rotated' : ''}`} />
                    </button>

                    {isSelectionActive && (
                        <span className="selector-active-badge" title="Live edition displayed on public website">
                            <MdCheckCircle className="badge-icon" />
                            Active
                        </span>
                    )}

                    {/* Custom Styled Selection Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="custom-dropdown-panel" role="listbox" aria-labelledby="admin-header-tourney-select">
                            <div className="dropdown-panel-header">
                                <span className="dropdown-panel-title">CHOOSE TOURNAMENT</span>
                                <span className="dropdown-panel-count">{tournaments.length} Editions</span>
                            </div>

                            <div className="dropdown-options-list">
                                {/* Option 0: Select Tournament / Dashboard Master Overview */}
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={!selectedTournamentId}
                                    className={`dropdown-option-item ${!selectedTournamentId ? 'selected' : ''}`}
                                    onClick={() => handleSelectTournament(null)}
                                >
                                    <div className="option-trophy-bubble neutral">
                                        <MdDashboard />
                                    </div>

                                    <div className="option-details">
                                        <div className="option-title-row">
                                            <span className="option-name">Select Tournament</span>
                                            <span className="option-meta-pill">DASHBOARD</span>
                                        </div>
                                        <span className="option-sub">Return to Master Hub & Tournament Registry</span>
                                    </div>
                                    {!selectedTournamentId && <MdCheck className="option-check-icon" />}
                                </button>

                                {tournaments.map((t) => {
                                    const isSelected = selectedTournamentId && resolveTournamentKey(t.id) === resolveTournamentKey(selectedTournamentId);
                                    const isTourneyActive = resolveTournamentKey(t.id) === resolveTournamentKey(activeTournamentId);
                                    const status = t.status || (isTourneyActive ? 'active' : 'historical');

                                    return (
                                        <button
                                            type="button"
                                            key={t.id}
                                            role="option"
                                            aria-selected={isSelected}
                                            className={`dropdown-option-item ${isSelected ? 'selected' : ''} ${isTourneyActive ? 'active-edition' : ''}`}
                                            onClick={() => handleSelectTournament(t.id)}
                                        >
                                            <div className="option-trophy-bubble">
                                                <MdEmojiEvents />
                                            </div>

                                            <div className="option-details">
                                                <div className="option-title-row">
                                                    <span className="option-name">{t.name || t.id}</span>
                                                    {isTourneyActive && (
                                                        <span className="option-live-pill">
                                                            <span className="option-live-dot" /> LIVE
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="option-meta-row">
                                                    <span className={`option-status-pill status-${status}`}>
                                                        {status.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <div className="option-check-icon">
                                                    <MdCheck />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right controls */}
                <div className="admin-nav-actions">
                    <ThemeToggle showLabel={false} />
                    <Link to="/" className="view-site-btn" target="_blank" rel="noreferrer" data-tooltip="Open User Website in New Tab">
                        <MdPublic />
                        <span>User View</span>
                    </Link>
                    <button className="admin-logout-btn" onClick={handleLogout} data-tooltip="Log Out">
                        <MdLogout />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default AdminNavbar;
