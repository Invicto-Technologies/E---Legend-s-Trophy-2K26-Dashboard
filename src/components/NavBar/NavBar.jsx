// components/Navbar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './NavBar.css';

const NavBar = () => {
    const location = useLocation();

    return (
        <>
            <nav className="navbar">
                <div className="navbar-brand">
                    <Link to="/">E-Legend's 2K25 Dashboard</Link>
                </div>
                <ul className="navbar-links">
                    <li className={location.pathname === '/' ? 'active' : ''}>
                        <Link to="/">Live Match</Link>
                    </li>
                    <li className={location.pathname === '/upcoming-matches' ? 'active' : ''}>
                        <Link to="/upcoming-matches">Upcoming Matches</Link>
                    </li>
                    <li className={location.pathname === '/fixtures' ? 'active' : ''}>
                        <Link to="/fixtures">Fixtures</Link>
                    </li>
                    <li className={location.pathname === '/top-stories' ? 'active' : ''}>
                        <Link to="/top-stories">Top Stories</Link>
                    </li>
                    <li className={location.pathname === '/teams' ? 'active' : ''}>
                        <Link to="/teams">Teams</Link>
                    </li>
                    <li className={location.pathname === '/ranking' ? 'active' : ''} style={{ marginRight: '50px' }}>
                        <Link to="/ranking">Ranking</Link>
                    </li>
                </ul>
            </nav>
            <div style={{ height: '80px' }} />
        </>
    );
};

export default NavBar;