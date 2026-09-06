import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    MdDashboard,
    MdEmojiEvents,
    MdFormatListNumbered,
    MdSportsCricket,
    MdNewspaper,
    MdPeople
} from 'react-icons/md';
import './AdminSubNav.css';

const AdminSubNav = () => {
    const location = useLocation();

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
    const isDashboardActive = location.pathname === '/admin';

    return (
        <div className="admin-subnav-wrapper">
            <div className="admin-subnav-container">
                {/* Navigation Tabs */}
                <nav className="admin-subnav-tabs" aria-label="Tournament Management Tabs">
                    {/* Dashboard Tab */}
                    <Link
                        to="/admin"
                        className={`admin-subnav-tab tab-dashboard ${isDashboardActive ? 'active' : ''}`}
                        id="subnav-dashboard-tab"
                    >
                        <MdDashboard className="tab-icon" />
                        <span>Dashboard</span>
                    </Link>

                    <div className="admin-subnav-divider" aria-hidden="true" />

                    <Link
                        to="/admin/tournaments"
                        className={`admin-subnav-tab ${isActive('/admin/tournaments') ? 'active' : ''}`}
                    >
                        <MdEmojiEvents className="tab-icon" />
                        <span>Tournaments</span>
                    </Link>

                    <Link
                        to="/admin/draw"
                        className={`admin-subnav-tab ${isActive('/admin/draw') ? 'active' : ''}`}
                    >
                        <MdFormatListNumbered className="tab-icon" />
                        <span>Draw Management</span>
                    </Link>

                    <Link
                        to="/admin/scoring"
                        className={`admin-subnav-tab ${isActive('/admin/scoring') ? 'active' : ''}`}
                    >
                        <MdSportsCricket className="tab-icon" />
                        <span>Live Scoring</span>
                    </Link>

                    <Link
                        to="/admin/stories"
                        className={`admin-subnav-tab ${isActive('/admin/stories') ? 'active' : ''}`}
                    >
                        <MdNewspaper className="tab-icon" />
                        <span>Stories</span>
                    </Link>

                    <Link
                        to="/admin/teams"
                        className={`admin-subnav-tab ${isActive('/admin/teams') ? 'active' : ''}`}
                    >
                        <MdPeople className="tab-icon" />
                        <span>Teams</span>
                    </Link>
                </nav>
            </div>
        </div>
    );
};

export default AdminSubNav;
