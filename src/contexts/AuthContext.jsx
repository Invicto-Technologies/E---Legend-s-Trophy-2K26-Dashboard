import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../components/firebase';
import {
    completeMagicLinkSignIn,
    isDeviceVerified,
    deviceVerificationRemainingMs,
    signOutAdmin,
    isAdminEmail,
} from '../services/authService';

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

/**
 * useAuth — convenience hook to consume the AuthContext.
 */
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    // isChecking: true while we validate magic link return / device stamp on mount
    const [isChecking, setIsChecking] = useState(true);
    const [authUser, setAuthUser] = useState(null);
    const expiryTimerRef = useRef(null);

    // ── Logout helper ────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
        setIsLoggedIn(false);
        setAuthUser(null);
        await signOutAdmin();
    }, []);

    // ── Schedule auto-logout when device stamp expires ───────────────────────
    const scheduleAutoLogout = useCallback(() => {
        if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
        const remaining = deviceVerificationRemainingMs();
        if (remaining > 0) {
            expiryTimerRef.current = setTimeout(() => {
                logout();
            }, remaining);
        } else {
            logout();
        }
    }, [logout]);

    // ── Login helper (called after magic link completes) ─────────────────────
    const login = useCallback((firebaseUser) => {
        setIsLoggedIn(true);
        setAuthUser(firebaseUser || null);
        scheduleAutoLogout();
    }, [scheduleAutoLogout]);

    // ── On mount: handle magic link return & device verification ─────────────
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            // 1. Check if we're returning from a magic link click
            try {
                const result = await completeMagicLinkSignIn();
                if (!cancelled && result) {
                    // completeMagicLinkSignIn already stamped the device
                    login(result.user);
                    setIsChecking(false);
                    return;
                }
            } catch (err) {
                // Magic link in URL but something failed — fall through to show login
                console.warn('[AuthContext] Magic link completion failed:', err);
                if (!cancelled) setIsChecking(false);
                return;
            }

            // 2. No magic link in URL — check if device is already verified
            //    and Firebase still has an active session
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (cancelled) return;

                if (user && isAdminEmail(user.email) && isDeviceVerified()) {
                    login(user);
                } else if (user && (!isAdminEmail(user.email) || !isDeviceVerified())) {
                    // Firebase user exists but device expired or email not admin —
                    // sign out silently
                    signOutAdmin().catch(() => {});
                    setIsLoggedIn(false);
                    setAuthUser(null);
                } else {
                    setIsLoggedIn(false);
                    setAuthUser(null);
                }

                setIsChecking(false);
                unsubscribe();
            });
        };

        init();

        return () => {
            cancelled = true;
            if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
        };
    }, [login]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Periodic expiry check (every 60 seconds) ─────────────────────────────
    useEffect(() => {
        if (!isLoggedIn) return;

        const interval = setInterval(() => {
            if (!isDeviceVerified()) {
                logout();
            }
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, [isLoggedIn, logout]);

    const value = {
        isLoggedIn,
        isChecking,
        authUser,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
