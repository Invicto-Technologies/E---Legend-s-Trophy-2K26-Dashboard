import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const logo = require("../../Images/Logo.png");

    // Predefined credentials
    const PREDEFINED_USERNAME = process.env.REACT_APP_PREDEFINED_USERNAME;
    const PREDEFINED_PASSWORD = process.env.REACT_APP_PREDEFINED_PASSWORD;

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (username === PREDEFINED_USERNAME && password === PREDEFINED_PASSWORD) {
            await storeLoginStatus(true);
            onLogin();
            navigate('/');
        } else {
            setError('Invalid username or password');
        }
    };

    const storeLoginStatus = async (isLoggedIn) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.setItem('isLoggedIn', JSON.stringify(isLoggedIn));
                localStorage.setItem('loginTime', new Date().toISOString());
                resolve();
            }, 100);
        });
    };

    return (
        <div className="login-container">
            <div className="login-left">
                <div className="logo-section">
                    <div className="logo-placeholder">
                        <img
                            src={logo}
                            alt="E-Legend's 2K25 Logo"
                            className="logo-image"
                        />
                    </div>
                    <h1>E-Legend's Trophy 2K25</h1>
                    <p>Cricket Score Dashboard</p>
                </div>
            </div>

            <div className="login-right">
                <form className="login-form" onSubmit={handleLogin}>
                    <h2>Login</h2>
                    <p>Login to access admin dashboard</p>

                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                        />
                    </div>

                    <button type="submit" className="login-button">
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;