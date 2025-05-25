// components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './NavBar.css';

const NavBar = () => {
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">E-Legend's 2K25 Dashboard</Link>
            </div>
            <ul className="navbar-links">
                <li><Link to="/upcoming-matches">Upcoming Matches</Link></li>
                <li><Link to="/fixtures">Fixtures</Link></li>
                <li><Link to="/top-stories">Top Stories</Link></li>
                <li><Link to="/teams">Teams</Link></li>
                <li><Link to="/ranking">Ranking</Link></li>
            </ul>
        </nav>
    ); 
};

export default NavBar;