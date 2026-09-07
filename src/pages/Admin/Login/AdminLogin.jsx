import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TiltCard from '../../../components/3D/TiltCard';
import { MdLock, MdPerson, MdLogin, MdArrowBack } from 'react-icons/md';
import logoImg from '../../../Images/e22_logo_transparent.png';
import './AdminLogin.css';

const AdminLogin = ({ onLogin }) => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const envUser = process.env.REACT_APP_PREDEFINED_USERNAME || 'admin';
        const envPass = process.env.REACT_APP_PREDEFINED_PASSWORD || 'ELegends2025';

        setTimeout(() => {
            if (username === envUser && password === envPass) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('isAdmin', 'true');
                if (onLogin) onLogin();
                navigate('/admin');
            } else {
                setError('Invalid credentials. Please verify your admin username and password.');
                setLoading(false);
            }
        }, 500);
    };

    return (
        <div className="admin-login-page">
            <div className="login-bg-glow" />

            <div className="admin-login-wrap">
                <Link to="/" className="login-back-home">
                    <MdArrowBack /> Back to Website
                </Link>

                <TiltCard className="login-tilt-card" maxTilt={10}>
                    <div className="login-card-inner">
                        <div className="login-header">
                            <img src={logoImg} alt="E-Legends Logo" className="login-logo" />
                            <h2>Admin Control Portal</h2>
                            <p>Enter your authorized credentials to manage tournaments, scoring, and teams.</p>
                        </div>

                        {error && <div className="login-error-alert">{error}</div>}

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="login-input-group">
                                <label>Username</label>
                                <div className="input-with-icon">
                                    <MdPerson className="input-icon" />
                                    <input
                                        type="text"
                                        placeholder="Admin username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="login-input-group">
                                <label>Password</label>
                                <div className="input-with-icon">
                                    <MdLock className="input-icon" />
                                    <input
                                        type="password"
                                        placeholder="••••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="login-submit-btn" disabled={loading}>
                                <MdLogin />
                                <span>{loading ? 'Authenticating...' : 'Sign In to Console'}</span>
                            </button>
                        </form>
                    </div>
                </TiltCard>
            </div>
        </div>
    );
};

export default AdminLogin;
