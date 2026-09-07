import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import logoImg from '../../../Images/e22_logo_transparent.png';

const Footer = () => {
    return (
        <footer className="cx-footer">
            <div className="cx-footer-container">
                <div className="cx-footer-top">
                    <div className="cx-footer-brand">
                        <img src={logoImg} alt="E-Legends Trophy" className="footer-logo" />
                        <p className="footer-tagline">
                            The premier faculty cricket clash. Experience the power, passion, and legacy of E-Legends 2K26.
                        </p>
                    </div>

                    <div className="cx-footer-links-group">
                        <h5>Tournament</h5>
                        <Link to="/">Home Arena</Link>
                        <Link to="/fixtures">Match Fixtures</Link>
                        <Link to="/live">Live Scorecenter</Link>
                        <Link to="/rankings">Leaderboards</Link>
                    </div>

                    <div className="cx-footer-links-group">
                        <h5>Platform</h5>
                        <Link to="/download">Mobile App</Link>
                        <Link to="/admin">Admin Gateway</Link>
                    </div>
                </div>

                <div className="cx-footer-bottom">
                    <p>&copy; {new Date().getFullYear()} E-Legends Trophy 2K26. All Rights Reserved. Powered by Faculty of Engineering, UOJ.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
