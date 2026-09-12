import {
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut,
} from 'firebase/auth';
import { auth } from '../components/firebase';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEVICE_STAMP_KEY = 'elt_device_verified_at';
const PENDING_EMAIL_KEY = 'elt_pending_email';
const DEVICE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Admin Email Whitelist ────────────────────────────────────────────────────

/**
 * Reads all 4 REACT_APP_ADMIN_EMAIL_* env vars and returns
 * a cleaned array of valid, lowercased email strings.
 */
export const getAdminEmails = () => {
    return [
        process.env.REACT_APP_ADMIN_EMAIL_1,
        process.env.REACT_APP_ADMIN_EMAIL_2,
        process.env.REACT_APP_ADMIN_EMAIL_3,
        process.env.REACT_APP_ADMIN_EMAIL_4,
    ]
        .filter((e) => e && e.trim().length > 0)
        .map((e) => e.trim().toLowerCase());
};

/**
 * Returns true if the given email is in the admin whitelist.
 */
export const isAdminEmail = (email) => {
    if (!email) return false;
    return getAdminEmails().includes(email.trim().toLowerCase());
};

// ─── Device Verification ──────────────────────────────────────────────────────

/**
 * Returns true if this browser device has a valid (< 24h) verification stamp.
 */
export const isDeviceVerified = () => {
    const stamp = localStorage.getItem(DEVICE_STAMP_KEY);
    if (!stamp) return false;
    const stampedAt = parseInt(stamp, 10);
    return !isNaN(stampedAt) && Date.now() - stampedAt < DEVICE_TTL_MS;
};

/**
 * Returns how many ms remain until the device verification expires.
 * Returns 0 if not verified or already expired.
 */
export const deviceVerificationRemainingMs = () => {
    const stamp = localStorage.getItem(DEVICE_STAMP_KEY);
    if (!stamp) return 0;
    const stampedAt = parseInt(stamp, 10);
    const remaining = DEVICE_TTL_MS - (Date.now() - stampedAt);
    return remaining > 0 ? remaining : 0;
};

/**
 * Writes the current timestamp as the device verification stamp.
 */
export const stampDeviceVerification = () => {
    localStorage.setItem(DEVICE_STAMP_KEY, String(Date.now()));
};

/**
 * Clears device verification (used on logout or expiry).
 */
export const clearDeviceVerification = () => {
    localStorage.removeItem(DEVICE_STAMP_KEY);
    localStorage.removeItem(PENDING_EMAIL_KEY);
};

// ─── Magic Link ───────────────────────────────────────────────────────────────

/**
 * Builds the actionCodeSettings for Firebase magic link.
 * The redirect URL is the current page origin + /admin/login so the
 * link always returns to the login page to complete sign-in.
 */
const buildActionCodeSettings = () => ({
    url: `${window.location.origin}/admin/login`,
    handleCodeInApp: true,
});

/**
 * Sends a Firebase Email Link (magic link) to the given email.
 * Saves the email to localStorage so it can be retrieved on return.
 *
 * @param {string} email - The admin email address.
 * @returns {Promise<void>}
 */
export const sendMagicLink = async (email) => {
    const actionCodeSettings = buildActionCodeSettings();
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    localStorage.setItem(PENDING_EMAIL_KEY, email);
};

/**
 * Checks if the current URL is a magic link return URL and, if so,
 * completes the sign-in flow.
 *
 * @returns {Promise<{user: object, email: string} | null>}
 *   Returns the signed-in Firebase user and email on success, or null
 *   if the current URL is not a magic link.
 * @throws {Error} If sign-in fails (e.g. invalid/expired link).
 */
export const completeMagicLinkSignIn = async () => {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
        return null;
    }

    // Retrieve the email saved before the user left to check their inbox
    let email = localStorage.getItem(PENDING_EMAIL_KEY);

    if (!email) {
        // Fallback: throw a specific error so the UI can prompt the user
        const err = new Error('EMAIL_REQUIRED');
        err.code = 'auth/email-required';
        throw err;
    }

    const result = await signInWithEmailLink(auth, email, window.location.href);

    // Clean up the URL so the magic link tokens are not visible in the address bar
    window.history.replaceState({}, document.title, '/admin/login');

    // Stamp the device as verified for 24 hours
    stampDeviceVerification();
    localStorage.removeItem(PENDING_EMAIL_KEY);

    return { user: result.user, email };
};

// ─── Sign Out ─────────────────────────────────────────────────────────────────

/**
 * Signs the admin out of Firebase Auth and clears device verification.
 */
export const signOutAdmin = async () => {
    clearDeviceVerification();
    // Clear legacy auth flags
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin');
    try {
        await signOut(auth);
    } catch (_) {
        // Ignore sign-out errors; local state is already cleared
    }
};
