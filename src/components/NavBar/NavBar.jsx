import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './NavBar.css';

const NavBar = ({ onLogout }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await removeLoginStatus();
        onLogout();
        navigate('/login');
    };

    const removeLoginStatus = async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('loginTime');
                resolve();
            }, 100);
        });
    };

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
                    <li className={location.pathname === '/ranking' ? 'active' : ''}>
                        <Link to="/ranking">Ranking</Link>
                    </li>
                    <li className="logout-item">
                        <button onClick={handleLogout} className="logout-button">
                            Logout
                        </button>
                    </li>
                </ul>
            </nav>
            <div style={{ height: '80px' }} />
        </>
    );
};

export default NavBar;