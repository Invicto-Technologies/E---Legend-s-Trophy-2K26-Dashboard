import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TiltCard from '../../../components/3D/TiltCard';
import { MdMail, MdLogin, MdArrowBack, MdRefresh, MdShield, MdCheckCircle } from 'react-icons/md';
import logoImg from '../../../Images/e22_logo_transparent.png';
import { isAdminEmail, sendMagicLink } from '../../../services/authService';
import { useAuth } from '../../../contexts/AuthContext';
import './AdminLogin.css';

// Cooldown (seconds) before the resend button becomes available
const RESEND_COOLDOWN_S = 60;

const AdminLogin = () => {
    const navigate = useNavigate();
    const { isLoggedIn } = useAuth();

    const [email, setEmail] = useState('');
    const [stage, setStage] = useState('input'); // 'input' | 'sent' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Redirect if already authenticated
    useEffect(() => {
        if (isLoggedIn) navigate('/admin', { replace: true });
    }, [isLoggedIn, navigate]);

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const handleSendLink = async (targetEmail) => {
        const trimmedEmail = (targetEmail || email).trim();
        setErrorMsg('');

        if (!trimmedEmail) {
            setErrorMsg('Please enter your email address.');
            return;
        }

        if (!isAdminEmail(trimmedEmail)) {
            setErrorMsg('This email is not authorized to access the admin panel.');
            setStage('error');
            return;
        }

        setLoading(true);
        try {
            await sendMagicLink(trimmedEmail);
            setEmail(trimmedEmail);
            setStage('sent');
            setResendCooldown(RESEND_COOLDOWN_S);
        } catch (err) {
            console.error('[AdminLogin] sendMagicLink error:', err);
            setErrorMsg('Failed to send the magic link. Please try again in a moment.');
            setStage('input');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = () => {
        if (resendCooldown > 0) return;
        handleSendLink(email);
    };

    const handleTryDifferent = () => {
        setStage('input');
        setErrorMsg('');
        setEmail('');
    };

    return (
        <div className="admin-login-page">
            <div className="login-bg-glow" />
            <div className="login-bg-particles">
                {[...Array(6)].map((_, i) => (
                    <span key={i} className={`particle particle-${i + 1}`} />
                ))}
            </div>

            <div className="admin-login-wrap">
                <Link to="/" className="login-back-home">
                    <MdArrowBack /> Back to Website
                </Link>

                <TiltCard className="login-tilt-card" maxTilt={8}>
                    <div className="login-card-inner">

                        {/* Header */}
                        <div className="login-header">
                            <img src={logoImg} alt="E-Legends Logo" className="login-logo" />
                            <h2>Admin Control Portal</h2>
                            {stage === 'input' && (
                                <p>Enter your authorized admin email to receive a secure magic link.</p>
                            )}
                            {stage === 'sent' && (
                                <p>Magic link dispatched — check your inbox.</p>
                            )}
                            {stage === 'error' && (
                                <p>Access verification failed.</p>
                            )}
                        </div>

                        {/* Email Input Stage */}
                        {stage === 'input' && (
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSendLink(); }}
                                className="login-form"
                            >
                                {errorMsg && (
                                    <div className="login-error-alert">{errorMsg}</div>
                                )}

                                <div className="login-input-group">
                                    <label htmlFor="admin-email">Admin Email</label>
                                    <div className="input-with-icon">
                                        <MdMail className="input-icon" />
                                        <input
                                            id="admin-email"
                                            type="email"
                                            placeholder="your@admin.email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoFocus
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="login-submit-btn"
                                    disabled={loading}
                                    id="send-magic-link-btn"
                                >
                                    {loading ? (
                                        <>
                                            <span className="btn-spinner" />
                                            <span>Sending Link...</span>
                                        </>
                                    ) : (
                                        <>
                                            <MdLogin />
                                            <span>Send Magic Link</span>
                                        </>
                                    )}
                                </button>

                                <p className="login-security-note">
                                    Passwordless — a one time link is sent to your inbox.
                                    Link is valid for 1 hour
                                </p>
                            </form>
                        )}

                        {/* Link Sent Stage */}
                        {stage === 'sent' && (
                            <div className="login-sent-state">
                                <div className="sent-icon-wrap">
                                    <MdMail className="sent-mail-icon" />
                                    <MdCheckCircle className="sent-check-icon" />
                                </div>
                                <h3 className="sent-title">Check Your Inbox</h3>
                                <p className="sent-desc">
                                    A magic link has been sent to<br />
                                    <strong className="sent-email">{email}</strong>
                                </p>
                                <p className="sent-hint">
                                    Click the link in the email to verify this device and
                                    gain access for <strong>24 hours</strong>.
                                </p>

                                <div className="sent-actions">
                                    <button
                                        className="login-resend-btn"
                                        onClick={handleResend}
                                        disabled={resendCooldown > 0}
                                        id="resend-magic-link-btn"
                                    >
                                        <MdRefresh className={resendCooldown <= 0 ? 'spin-on-hover' : ''} />
                                        {resendCooldown > 0
                                            ? `Resend in ${resendCooldown}s`
                                            : 'Resend Link'}
                                    </button>

                                    <button
                                        className="login-ghost-btn"
                                        onClick={handleTryDifferent}
                                        id="try-different-email-btn"
                                    >
                                        Try a different email
                                    </button>
                                </div>

                                <div className="sent-expiry-note">
                                    <MdShield className="security-icon" />
                                    Device access expires after <strong>24 hours</strong>.
                                </div>
                            </div>
                        )}

                        {/* Error Stage */}
                        {stage === 'error' && (
                            <div className="login-error-state">
                                <div className="error-icon-wrap">🚫</div>
                                <h3 className="error-state-title">Not Authorized</h3>
                                <p className="error-state-desc">
                                    <strong>{email}</strong> is not registered as an admin email.
                                    Contact the system administrator.
                                </p>
                                <button
                                    className="login-ghost-btn"
                                    onClick={handleTryDifferent}
                                    id="try-different-email-error-btn"
                                >
                                    <MdArrowBack /> Try a different email
                                </button>
                            </div>
                        )}

                    </div>
                </TiltCard>
            </div>
        </div>
    );
};

export default AdminLogin;

