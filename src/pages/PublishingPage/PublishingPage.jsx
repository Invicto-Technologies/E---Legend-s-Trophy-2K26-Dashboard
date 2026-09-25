import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import TiltCard from '../../components/3D/TiltCard';
import Footer from '../../components/common/Footer/Footer';
import {
    subscribeActiveTournament,
    incrementDownloadCount,
    subscribeDownloadCount
} from '../../services/rtdbService';
import {
    MdDownload,
    MdAndroid,
    MdSecurity,
    MdPhoneAndroid,
    MdLiveTv,
    MdEmojiEvents,
    MdSportsCricket,
    MdCall,
    MdOpenInNew,
    MdBolt,
    MdMilitaryTech,
    MdVerified,
    MdPolicy,
    MdLock,
    MdShield,
    MdPrivacyTip,
    MdCheckCircleOutline,
    MdSupportAgent,
    MdShoppingBag,
    MdLocalShipping,
    MdChevronRight,
    MdClose,
    MdNotificationsActive,
    MdTimeline,
    MdExpandMore
} from 'react-icons/md';
import { FaGooglePlay, FaLinkedin } from 'react-icons/fa';
import { RiFacebookFill, RiShareLine } from 'react-icons/ri';
import { SiAppgallery } from 'react-icons/si';
import PageLoader from '../../components/common/PageLoader/PageLoader';
import './PublishingPage.css';

import logoWhite from '../../Images/e22_logo_transparent.png';
import sponsorLogo from '../../Images/Support1.jpeg';
import invictoLogo from '../../Images/Invicto Technologies Logo.png';
import developer from '../../Images/developer.png';
import stadiumBg from '../../Images/cricket_stadium_bg.jpg';

const PublishingPage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [activeTournament, setActiveTournament] = useState(null);
    const [showComingSoonModal, setShowComingSoonModal] = useState(false);
    const [comingSoonPlatform, setComingSoonPlatform] = useState('Android APK');
    const [expandedPrivacyCards, setExpandedPrivacyCards] = useState({});
    const [apkDownloadUrl, setApkDownloadUrl] = useState(null);
    const [apkFileName, setApkFileName] = useState('');
    const [apkReleaseTag, setApkReleaseTag] = useState('');
    const [isDownloadingApk, setIsDownloadingApk] = useState(false);
    const [downloadCount, setDownloadCount] = useState(0);
    const [ghDownloadCount, setGhDownloadCount] = useState(0);
    const [hasJoinedTestersGroup, setHasJoinedTestersGroup] = useState(() => {
        try {
            return localStorage.getItem('eltrophy_joined_testers_group') === 'true';
        } catch {
            return false;
        }
    });

    const markGroupJoined = (val) => {
        setHasJoinedTestersGroup(prev => {
            const next = typeof val === 'function' ? val(prev) : (typeof val === 'boolean' ? val : !prev);
            try {
                localStorage.setItem('eltrophy_joined_testers_group', String(next));
            } catch { }
            return next;
        });
    };

    // Realtime download count subscription
    useEffect(() => {
        const unsub = subscribeDownloadCount((count) => {
            if (typeof count === 'number' && !isNaN(count)) {
                setDownloadCount(count);
            }
        });
        return () => unsub && unsub();
    }, []);

    // Auto-detect latest release .apk from this GitHub repository
    useEffect(() => {
        let isMounted = true;
        const fetchLatestReleaseApk = async () => {
            try {
                const res = await fetch('https://api.github.com/repos/Invicto-Technologies/E---Legend-s-Trophy-2K26-Dashboard/releases');
                if (!res.ok) return;
                const releases = await res.json();
                if (Array.isArray(releases) && isMounted) {
                    for (const rel of releases) {
                        const apkAsset = (rel.assets || []).find(a => a.name && a.name.toLowerCase().endsWith('.apk'));
                        if (apkAsset) {
                            setApkDownloadUrl(apkAsset.browser_download_url);
                            setApkFileName(apkAsset.name);
                            setApkReleaseTag(rel.tag_name || rel.name);
                            if (typeof apkAsset.download_count === 'number' && apkAsset.download_count > 0) {
                                setGhDownloadCount(apkAsset.download_count);
                            }
                            break;
                        }
                    }
                }
            } catch (err) {
                console.warn('Could not auto-fetch GitHub release APK:', err);
            }
        };

        fetchLatestReleaseApk();
        return () => { isMounted = false; };
    }, []);

    const handleDownloadApk = async () => {
        setIsDownloadingApk(true);
        try {
            let targetUrl = apkDownloadUrl;
            let targetName = apkFileName;

            // If not cached yet, query GitHub API on click
            if (!targetUrl) {
                const res = await fetch('https://api.github.com/repos/Invicto-Technologies/E---Legend-s-Trophy-2K26-Dashboard/releases');
                if (res.ok) {
                    const releases = await res.json();
                    if (Array.isArray(releases)) {
                        for (const rel of releases) {
                            const apkAsset = (rel.assets || []).find(a => a.name && a.name.toLowerCase().endsWith('.apk'));
                            if (apkAsset) {
                                targetUrl = apkAsset.browser_download_url;
                                targetName = apkAsset.name;
                                setApkDownloadUrl(targetUrl);
                                setApkFileName(targetName);
                                setApkReleaseTag(rel.tag_name || rel.name);
                                if (typeof apkAsset.download_count === 'number' && apkAsset.download_count > 0) {
                                    setGhDownloadCount(apkAsset.download_count);
                                }
                                break;
                            }
                        }
                    }
                }
            }

            if (targetUrl) {
                setDownloadCount(prev => prev + 1);
                incrementDownloadCount();
                const link = document.createElement('a');
                link.href = targetUrl;
                link.setAttribute('download', targetName || 'e-legends-trophy.apk');
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            }

            // If no APK asset is found on any GitHub release yet, show the Coming Soon popup
            handleOpenComingSoon('Android APK');
        } catch (error) {
            console.warn('Error downloading release APK:', error);
            handleOpenComingSoon('Android APK');
        } finally {
            setIsDownloadingApk(false);
        }
    };

    const togglePrivacyCard = (id) => {
        setExpandedPrivacyCards(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setShowComingSoonModal(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleOpenComingSoon = (platform) => {
        setComingSoonPlatform(platform);
        setShowComingSoonModal(true);
    };

    useEffect(() => {
        const unsubTourney = subscribeActiveTournament((tourney) => {
            setActiveTournament(tourney);
            setIsLoading(false);
        });
        const timer = setTimeout(() => setIsLoading(false), 900);
        return () => {
            clearTimeout(timer);
            unsubTourney();
        };
    }, []);

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: "E-Legends Mobile App",
                text: "Download the official E-Legends Trophy Android App for real-time live scores!",
                url: window.location.href
            }).catch(() => { });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("App link copied to clipboard!");
        }
    };

    const totalDirectDownloads = Math.max(downloadCount, ghDownloadCount);

    if (isLoading && !activeTournament) {
        return (
            <PageLoader
                message="Loading App Download Portal..."
                subtitle="Fetching verified build signatures & package assets"
                tournamentName="Mobile Hub"
            />
        );
    }

    return (
        <div className="publishing-3d-page">
            {/* Single fixed background image layer across the entire page matching Home page */}
            <div
                className="pub-fixed-bg-layer"
                style={{ backgroundImage: `url(${stadiumBg})` }}
                aria-hidden="true"
            >
                <div className="pub-fixed-bg-overlay" />
            </div>

            {/* Ambient Hero with Video Background */}
            <section className="pub-hero-section">
                <div className="pub-video-wrapper">
                    <div className="pub-video-overlay" />
                    <div className="pub-gradient-mesh" />
                </div>

                <div className="pub-container pub-hero-grid">
                    {/* Left: App Details & Action */}
                    <div className="pub-hero-content">
                        <div className="pub-badge-tag">
                            <span>OFFICIAL ANDROID APP • {activeTournament?.name || "E-Legend's Trophy 2K26"}</span>
                        </div>

                        <h1 className="pub-title">
                            E-LEGENDS <br />
                            <span className="gradient-text">MOBILE EXPERIENCE</span>
                        </h1>

                        <p className="pub-description">
                            Experience the Prof. A. Thurairajah Memorial Cricket Tournament in realtime.
                            Get lightning fast ball by ball commentary, live batting wagon wheels,
                            instant boundary alerts, batch standings, and tournament news right in your pocket.
                        </p>

                        <div className="pub-actions-group">
                            <button
                                type="button"
                                className="pub-appgallery-btn"
                                id="download-appgallery-btn"
                                onClick={() => handleOpenComingSoon('Huawei AppGallery')}
                            >
                                <SiAppgallery className="btn-appgallery-icon" />
                                <div className="btn-play-texts">
                                    <span className="btn-play-eyebrow">EXPLORE IT ON</span>
                                    <span className="btn-play-main">AppGallery</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                className="pub-playstore-btn"
                                id="download-playstore-btn"
                                onClick={() => handleOpenComingSoon('Google Play Store')}
                            >
                                <FaGooglePlay className="btn-play-icon" />
                                <div className="btn-play-texts">
                                    <span className="btn-play-eyebrow">GET IT ON</span>
                                    <span className="btn-play-main">Google Play</span>
                                </div>
                            </button>

                            <button
                                className={`pub-download-btn ${isDownloadingApk ? 'downloading' : ''}`}
                                onClick={handleDownloadApk}
                                id="download-apk-btn"
                                type="button"
                                title={apkDownloadUrl ? `Download ${apkFileName || 'APK'} (${apkReleaseTag}) • ${totalDirectDownloads.toLocaleString()} direct downloads` : `Download Android APK • ${totalDirectDownloads.toLocaleString()} direct downloads`}
                            >
                                <MdDownload className="btn-dl-icon" />
                                <div className="btn-dl-texts">
                                    <span className="btn-main-text">ANDROID APK</span>
                                    <span className="btn-sub-text">
                                        {apkDownloadUrl
                                            ? `Direct install (${apkReleaseTag || '.apk'})`
                                            : 'Direct install (.apk)'}
                                    </span>
                                    <span className="btn-downloads-count">
                                        <span>{totalDirectDownloads.toLocaleString()}+ downloads</span>
                                    </span>
                                </div>
                            </button>

                            <button className="pub-share-btn" onClick={handleShare} data-tooltip="Share App Link">
                                <RiShareLine />
                                <span>Share</span>
                            </button>

                            <a href="#privacy-policy" className="pub-privacy-btn" title="View App Privacy Policy" id="view-privacy-btn">
                                <MdPrivacyTip />
                                <span>Privacy Policy</span>
                            </a>
                        </div>
                    </div>

                    {/* Right: 3D Floating Mockup Device */}
                    <div className="pub-hero-mockup-col">
                        <div className="device-mockup-card">
                            <div className="device-glare" />
                            <div className="device-outer-frame">
                                <div className="device-notch">
                                    <span className="notch-speaker" />
                                    <span className="notch-cam" />
                                </div>
                                <div className="device-screen">
                                    <div className="screen-header">
                                        <img src={logoWhite} alt="E-Legends" className="screen-logo" />
                                        <div className="screen-live-chip">
                                            <span className="pulse-circle" /> LIVE
                                        </div>
                                    </div>
                                    <div className="screen-hero-card">
                                        <div className="screen-tag">MATCH 01 • LIVE INNINGS</div>
                                        <div className="screen-match-teams">
                                            <div className="screen-team">
                                                <span className="team-badge-sm">E22</span>
                                                <span className="team-score">168/5</span>
                                            </div>
                                            <span className="screen-vs">VS</span>
                                            <div className="screen-team">
                                                <span className="team-badge-sm">E23</span>
                                                <span className="team-score">142/7</span>
                                            </div>
                                        </div>
                                        <div className="screen-status-bar">
                                            <span>2nd Innings • Required 27 runs in 18 balls</span>
                                        </div>
                                    </div>

                                    {/* Mini commentary feed in screen */}
                                    <div className="screen-mini-feed">
                                        <div className="mini-feed-row">
                                            <span className="mini-ball">16.6</span>
                                            <span className="mini-event six">SIX!</span>
                                            <span className="mini-desc">Massive hit sails over deep mid-wicket!</span>
                                        </div>
                                        <div className="mini-feed-row">
                                            <span className="mini-ball">16.5</span>
                                            <span className="mini-event dot">0</span>
                                            <span className="mini-desc">Beaten by pace and swing outside off</span>
                                        </div>
                                        <div className="mini-feed-row">
                                            <span className="mini-ball">16.4</span>
                                            <span className="mini-event four">FOUR!</span>
                                            <span className="mini-desc">Cracking drive through backward point!</span>
                                        </div>
                                    </div>

                                    <div className="screen-dock">
                                        <span>Matches</span>
                                        <span className="active-tab">Live</span>
                                        <span>Standings</span>
                                        <span>News</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* App Features Grid */}
            <section className="pub-features-section">
                <div className="pub-container">
                    <div className="section-title-wrap">
                        <span className="section-eyebrow">BUILT FOR SPEED & ACCURACY</span>
                        <h2 className="section-heading">
                            ENGINEERED FOR <span className="gradient-text">CRICKET LOVERS</span>
                        </h2>
                        <p className="section-subtext">
                            A dedicated companion designed exclusively for the Faculty of Engineering community.
                        </p>
                    </div>

                    <div className="features-tilt-grid">
                        <TiltCard className="feature-tilt-card">
                            <div className="feat-icon-box">
                                <MdLiveTv />
                            </div>
                            <h3>Live Ball-by-Ball Radar</h3>
                            <p>
                                Real-time ball-by-ball updates, commentary, strike rates, bowling figures, and fall of wickets powered by Firebase RTDB.
                            </p>
                        </TiltCard>

                        <TiltCard className="feature-tilt-card">
                            <div className="feat-icon-box">
                                <MdEmojiEvents />
                            </div>
                            <h3>Batch Points & Net Run Rate</h3>
                            <p>
                                Automated tournament points standings with dynamic NRR calculations updated right as the final ball is bowled.
                            </p>
                        </TiltCard>

                        <TiltCard className="feature-tilt-card">
                            <div className="feat-icon-box">
                                <MdSportsCricket />
                            </div>
                            <h3>Leaderboards & Records</h3>
                            <p>
                                Comprehensive player leaderboards tracking the highest run-scorers and top wicket-takers across all batches.
                            </p>
                        </TiltCard>

                        <TiltCard className="feature-tilt-card">
                            <div className="feat-icon-box">
                                <MdPhoneAndroid />
                            </div>
                            <h3>Adaptive Dark & Light Themes</h3>
                            <p>
                                Flawless contrast indoors and under bright outdoor sun on the cricket grounds with fluid transitions.
                            </p>
                        </TiltCard>
                    </div>
                </div>
            </section>

            {/* App Privacy & Policy Section */}
            <section className="pub-privacy-section" id="privacy-policy">
                <div className="pub-container">
                    <div className="section-title-wrap">
                        <span className="section-eyebrow">
                            <MdShield className="eyebrow-icon" /> DATA TRANSPARENCY & PROTECTION
                        </span>
                        <h2 className="section-heading">
                            APP PRIVACY & <span className="gradient-text">POLICY</span>
                        </h2>
                        <p className="section-subtext">
                            Official privacy disclosure and data governance statement for the <strong>E-Legends Trophy</strong> Android Application (<code>com.eltrophy.app.e_legends_trophy</code>). We are committed to safeguarding user trust with complete transparency and zero unnecessary data collection.
                        </p>
                    </div>

                    {/* Trust Highlights Grid */}
                    <div className="privacy-trust-grid">
                        <div className="trust-pill-card">
                            <MdCheckCircleOutline className="trust-icon" />
                            <div>
                                <h4>100% Free & No Ads</h4>
                                <p>No commercial monetization, ad trackers, or third-party marketing SDKs.</p>
                            </div>
                        </div>
                        <div className="trust-pill-card">
                            <MdCheckCircleOutline className="trust-icon" />
                            <div>
                                <h4>No Account Required</h4>
                                <p>Instant score access without signing up, passwords, or personal profiles.</p>
                            </div>
                        </div>
                        <div className="trust-pill-card">
                            <MdCheckCircleOutline className="trust-icon" />
                            <div>
                                <h4>TLS / HTTPS Encrypted</h4>
                                <p>All match data and live commentary streams securely over HTTPS/TLS.</p>
                            </div>
                        </div>
                        <div className="trust-pill-card">
                            <MdCheckCircleOutline className="trust-icon" />
                            <div>
                                <h4>Google Play Compliant</h4>
                                <p>Strict adherence to Google Play Developer Program and User Data Policies.</p>
                            </div>
                        </div>
                    </div>

                    {/* Policy Detailed Cards Grid */}
                    <div className="privacy-cards-grid">
                        <div className={`privacy-card ${expandedPrivacyCards['card-1'] ? 'expanded' : 'collapsed'}`}>
                            <div
                                className="privacy-card-header clickable"
                                onClick={() => togglePrivacyCard('card-1')}
                                role="button"
                                tabIndex={0}
                                aria-expanded={!!expandedPrivacyCards['card-1']}
                            >
                                <div className="p-header-main">
                                    <div className="p-icon-box">
                                        <MdPolicy />
                                    </div>
                                    <div>
                                        <h3>Information Collection &amp; Use</h3>
                                        <span className="p-card-tag">Strictly Minimal &amp; Anonymous</span>
                                    </div>
                                </div>
                                <div className="p-collapse-toggle">
                                    <MdExpandMore className={`p-chevron ${expandedPrivacyCards['card-1'] ? 'open' : ''}`} />
                                </div>
                            </div>
                            {expandedPrivacyCards['card-1'] && (
                                <div className="privacy-card-body">
                                    <p>
                                        The <strong>E-Legends Trophy</strong> application is designed solely as a live collegiate cricket companion for undergraduates, faculty, and alumni.
                                    </p>
                                    <ul>
                                        <li><strong>Personal Information:</strong> We do <em>not</em> collect, store, or solicit personal details such as your legal name, email address, phone number, physical address, contacts, or financial details.</li>
                                        <li><strong>Anonymous Diagnostics:</strong> Standard non-identifying telemetry (such as crash stack traces and device model performance) may be processed anonymously via Google Play Services to ensure stability across various Android releases.</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className={`privacy-card ${expandedPrivacyCards['card-2'] ? 'expanded' : 'collapsed'}`}>
                            <div
                                className="privacy-card-header clickable"
                                onClick={() => togglePrivacyCard('card-2')}
                                role="button"
                                tabIndex={0}
                                aria-expanded={!!expandedPrivacyCards['card-2']}
                            >
                                <div className="p-header-main">
                                    <div className="p-icon-box">
                                        <MdSecurity />
                                    </div>
                                    <div>
                                        <h3>Device Permissions Explained</h3>
                                        <span className="p-card-tag">Essential Access Only</span>
                                    </div>
                                </div>
                                <div className="p-collapse-toggle">
                                    <MdExpandMore className={`p-chevron ${expandedPrivacyCards['card-2'] ? 'open' : ''}`} />
                                </div>
                            </div>
                            {expandedPrivacyCards['card-2'] && (
                                <div className="privacy-card-body">
                                    <p>
                                        Our application requests only the essential system permissions necessary to deliver a live scoreboard experience:
                                    </p>
                                    <ul>
                                        <li><code>android.permission.INTERNET</code>: Enables communication with Google Firebase Realtime Database to receive instant ball-by-ball commentary, team standings, and match updates.</li>
                                        <li><code>android.permission.ACCESS_NETWORK_STATE</code>: Detects internet availability to notify users when network connectivity is lost.</li>
                                        <li><code>android.permission.POST_NOTIFICATIONS</code> (Optional): Used solely to alert users when a scheduled match commences or milestone events occur. Users may toggle notifications on or off at any time in system settings.</li>
                                        <li><strong>Zero Sensitive Permissions:</strong> We do <em>not</em> access your camera, microphone, gallery, storage, GPS location, or contact list.</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className={`privacy-card ${expandedPrivacyCards['card-3'] ? 'expanded' : 'collapsed'}`}>
                            <div
                                className="privacy-card-header clickable"
                                onClick={() => togglePrivacyCard('card-3')}
                                role="button"
                                tabIndex={0}
                                aria-expanded={!!expandedPrivacyCards['card-3']}
                            >
                                <div className="p-header-main">
                                    <div className="p-icon-box">
                                        <MdLock />
                                    </div>
                                    <div>
                                        <h3>Third Party Services &amp; Cloud Security</h3>
                                        <span className="p-card-tag">Google Infrastructure</span>
                                    </div>
                                </div>
                                <div className="p-collapse-toggle">
                                    <MdExpandMore className={`p-chevron ${expandedPrivacyCards['card-3'] ? 'open' : ''}`} />
                                </div>
                            </div>
                            {expandedPrivacyCards['card-3'] && (
                                <div className="privacy-card-body">
                                    <p>
                                        To provide reliable and instantaneous score synchronization, the app leverages verified cloud infrastructure provided by <strong>Google LLC</strong>:
                                    </p>
                                    <ul>
                                        <li><strong>Google Firebase Realtime Database:</strong> Cloud database synchronizing official match scores and tournament fixtures. All network communications are encrypted in transit via TLS 1.3 / HTTPS.</li>
                                        <li><strong>Google Play Services:</strong> Manages application deployment, integrity validation, and automatic release distribution.</li>
                                        <li><strong>No Data Brokering:</strong> We do not sell, rent, trade, or share user data with any advertisers or third-party marketing entities.</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className={`privacy-card ${expandedPrivacyCards['card-4'] ? 'expanded' : 'collapsed'}`}>
                            <div
                                className="privacy-card-header clickable"
                                onClick={() => togglePrivacyCard('card-4')}
                                role="button"
                                tabIndex={0}
                                aria-expanded={!!expandedPrivacyCards['card-4']}
                            >
                                <div className="p-header-main">
                                    <div className="p-icon-box">
                                        <MdShield />
                                    </div>
                                    <div>
                                        <h3>Children's Privacy &amp; Data Retention</h3>
                                        <span className="p-card-tag">Family Safe (All Ages)</span>
                                    </div>
                                </div>
                                <div className="p-collapse-toggle">
                                    <MdExpandMore className={`p-chevron ${expandedPrivacyCards['card-4'] ? 'open' : ''}`} />
                                </div>
                            </div>
                            {expandedPrivacyCards['card-4'] && (
                                <div className="privacy-card-body">
                                    <p>
                                        Our application provides public sporting information suitable for cricket fans of all ages, including collegiate students and youth:
                                    </p>
                                    <ul>
                                        <li>We do not knowingly collect or solicit personal information from children under 13 years of age.</li>
                                        <li>Because no user accounts or persistent profiles exist, we retain zero personal records on our servers.</li>
                                        <li>Users can clear temporary offline cached match cards anytime via Android Settings <MdChevronRight className="path-arrow" /> Apps <MdChevronRight className="path-arrow" /> E-Legends Trophy <MdChevronRight className="path-arrow" /> Storage <MdChevronRight className="path-arrow" /> Clear Cache.</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Policy Metadata & Contact Bar */}
                    <div className="privacy-meta-bar">
                        <div className="privacy-meta-info">
                            <span className="p-meta-item">
                                <strong>Application:</strong> E-Legends Trophy 2K26
                            </span>
                            <span className="p-meta-item">
                                <strong>Package ID:</strong> <code>com.eltrophy.app.e_legends_trophy</code>
                            </span>
                            <span className="p-meta-item">
                                <strong>Last Updated:</strong> September 2026
                            </span>
                            <span className="p-meta-item">
                                <strong>Compliance:</strong> Google Play Policies
                            </span>
                        </div>
                        <div className="privacy-contact-action">
                            <span>Inquiries regarding our privacy policy?</span>
                            <a href="mailto:pramudakulathunga@gmail.com" className="p-contact-btn">
                                Contact Developer
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tribute to Prof. A. Thurairajah Section */}
            <section className="pub-tribute-section">
                <div className="pub-container">
                    <div className="tribute-glass-card">
                        <div className="tribute-badge">
                            <MdMilitaryTech /> THE THURAIRAJAH LEGACY
                        </div>
                        <h2 className="tribute-title">
                            Honoring Professor A. Thurairajah
                        </h2>
                        <div className="tribute-content">
                            <p>
                                The <strong>E Legends' Trophy</strong> was established by the <strong>E15 batch</strong> of the Faculty of Engineering, University of Jaffna, to honor the enduring legacy of <strong>Professor A. Thurairajah</strong>. Widely recognized as the foundational figure and original driving force behind the creation of the Faculty of Engineering at Kilinochchi, this tournament stands as a tribute to his pioneering vision and service to higher education and community development.
                            </p>
                            <p>
                                Envisioned to accelerate the development of standard hard-ball cricket infrastructure within the faculty grounds and cultivate professional sporting spirit among engineering undergraduates, the tournament has been proudly sustained across generations by the <strong>E18</strong>, <strong>E19</strong>, <strong>E21</strong>, and <strong>E22</strong> batches.
                            </p>
                            <p>
                                The tournament's credibility and reach received invaluable patronage from the <strong>Hartley College Past Pupils' Association UK</strong>, underscoring our global alumni community's support for celebrating the Legendary Prof. A. Thurairajah.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Hartley College Past Pupils' Association UK Main Sponsorship Section */}
            <section className="pub-sponsorship-section">
                <div className="pub-container">
                    <div className="sponsorship-premium-card">
                        <div className="sponsorship-top-badge">
                            <MdVerified className="sp-badge-icon" />
                            <span>OFFICIAL TOURNAMENT PATRON &amp; MAIN SPONSOR</span>
                        </div>

                        <div className="sponsorship-two-col-layout">
                            {/* Left Column: Official Sponsor Logo */}
                            <div className="sponsorship-logo-col">
                                <div className="sponsorship-logo-frame">
                                    <img
                                        src={sponsorLogo}
                                        alt="Hartley College Past Pupils' Association UK"
                                        className="sponsorship-logo-img"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Sponsor Content */}
                            <div className="sponsorship-content-col">
                                <div className="sponsorship-main-header">
                                    <h2 className="sponsorship-title">
                                        Hartley College Past Pupils' Association <span className="uk-pill">UK</span>
                                    </h2>
                                    <p className="sponsorship-tagline">
                                        Proud Main Sponsor of the Prof. A. Thurairajah Memorial Cricket Tournament
                                    </p>
                                </div>

                                <div className="sponsorship-body">
                                    <p>
                                        The <strong>Hartley College Past Pupils' Association (UK)</strong> proudly serves as the
                                        <strong> Main Tournament Sponsor</strong> of the <strong>E-Legend's Trophy</strong>, commemorating
                                        the enduring ideals of their most celebrated alumnus, <strong>Professor Alagiah Thurairajah</strong>.
                                    </p>
                                    <p>
                                        Through this dedicated sponsorship, HCPPA UK champions the advancement of collegiate cricket infrastructure
                                        at the Faculty of Engineering grounds in Kilinochchi, empowers undergraduate sportsmanship, and unites generations
                                        of engineering scholars and alumni across the globe.
                                    </p>
                                </div>

                                <div className="sponsorship-action-row">
                                    <a
                                        href="https://hartleycollege.com/hweb/ppa/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cx-btn-primary sp-link-btn"
                                    >
                                        <MdOpenInNew /> Visit HCPPA UK Official Website
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Organizing Committee & Support */}
            <section className="pub-contact-section">
                <div className="pub-container">
                    <div className="section-title-wrap">
                        <span className="section-eyebrow">ASSISTANCE & INQUIRIES</span>
                        <h2 className="section-heading">
                            ORGANIZING <span className="gradient-text">COMMITTEE</span>
                        </h2>
                        <p className="section-subtext">
                            Reach out to our tournament coordinators for app support, fixtures queries, or batch registration.
                        </p>
                    </div>

                    <div className="contact-cards-grid">
                        <div className="contact-card">
                            <div className="contact-avatar"><MdSupportAgent /></div>
                            <div className="contact-details">
                                <span className="contact-role">Tournament Coordinator</span>
                                <h4>Ravindu Shavishka Pussekumbura</h4>
                                <a href="tel:+94760164090" className="contact-tel">
                                    <MdCall /> +94 76 016 4090
                                </a>
                            </div>
                        </div>

                        <div className="contact-card">
                            <div className="contact-avatar"><MdLocalShipping /></div>
                            <div className="contact-details">
                                <span className="contact-role">Operations and ground logistics</span>
                                <h4>Gaurawa Mihiranga</h4>
                                <a href="tel:+94778189165" className="contact-tel">
                                    <MdCall /> +94 77 818 9165
                                </a>
                            </div>
                        </div>

                        <div className="contact-card">
                            <div className="contact-avatar"><MdShoppingBag /></div>
                            <div className="contact-details">
                                <span className="contact-role">Merchandise coordinator</span>
                                <h4>Sithum Sathmina</h4>
                                <a href="tel:+94716665173" className="contact-tel">
                                    <MdCall /> +94 71 666 5173
                                </a>
                            </div>
                        </div>

                        <div className="contact-card social-card">
                            <div className="contact-avatar social-avatar"><RiFacebookFill /></div>
                            <div className="contact-details">
                                <span className="contact-role">Official Media Coverage</span>
                                <h4>E-Legends Facebook</h4>
                                <a
                                    href="https://web.facebook.com/profile.php?id=100063745324292"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="contact-tel"
                                >
                                    <MdOpenInNew /> Visit Official Page
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Developer & Engineering Details Section */}
            <section className="pub-developer-section" id="developer-details">
                <div className="pub-container">
                    <div className="section-title-wrap">
                        <span className="section-eyebrow">ENGINEERING & TECHNOLOGY</span>
                        <h2 className="section-heading">
                            DEVELOPED BY <span className="gradient-text">INVICTO TECHNOLOGIES</span>
                        </h2>
                        <p className="section-subtext">
                            Architected, engineered, and powered with high-performance real-time score streaming, mobile synchronicity, and cloud infrastructure.
                        </p>
                    </div>

                    <div className="developer-cards-grid">
                        {/* Company Card */}
                        <div className="developer-card company-card">
                            <div className="dev-card-top">
                                <div className="dev-logo-container">
                                    <img
                                        src={invictoLogo}
                                        alt="Invicto Technologies"
                                        className="invicto-brand-logo"
                                    />
                                </div>
                                <span className="dev-badge-tag">
                                    <MdVerified className="dev-badge-icon" /> Official Technology Partner
                                </span>
                            </div>

                            <div className="dev-card-body">
                                <span className="dev-role-label">Software Architecture & Cloud Systems</span>
                                <h3 className="dev-name-title">Invicto Technologies</h3>
                                <p className="dev-desc-text">
                                    Pioneering intelligent software solutions, cloud services, and interactive mobile applications for collegiate, enterprise, and sporting ecosystems.
                                </p>
                            </div>

                            <div className="dev-card-footer">
                                <a
                                    href="https://play.google.com/store/apps/dev?id=7196369130676240359"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="dev-link-button playstore-link"
                                    title="Android Apps by Invicto Technologies on Google Play"
                                >
                                    <div className="dev-btn-content">
                                        <FaGooglePlay className="dev-platform-icon play-icon" />
                                        <div className="dev-btn-titles">
                                            <span className="dev-btn-subtitle">Google Play Store</span>
                                            <span className="dev-btn-title">Android Apps by Invicto Technologies</span>
                                        </div>
                                    </div>
                                    <MdOpenInNew className="dev-arrow-icon" />
                                </a>
                            </div>
                        </div>

                        {/* Developer Card */}
                        <div className="developer-card engineer-card">
                            <div className="dev-card-top">
                                <div className="dev-logo-container">
                                    <img
                                        src={developer}
                                        alt="Pramuda Kulathunga"
                                        className="invicto-brand-logo dev-portrait-img"
                                    />
                                </div>
                                <span className="dev-badge-tag engineer-tag">
                                    <MdVerified className="dev-badge-icon" /> Lead Software Engineer
                                </span>
                            </div>

                            <div className="dev-card-body">
                                <span className="dev-role-label">BSc. (Hons) in Computer Engineering | Full Stack & Mobile App Developer</span>
                                <h3 className="dev-name-title">Pramuda Kulathunga</h3>
                                <p className="dev-desc-text">
                                    Architected the E-Legends Trophy Android mobile application, realtime ball by ball scoring pipeline, and web portal for the Faculty of Engineering.
                                </p>
                            </div>

                            <div className="dev-card-footer">
                                <a
                                    href="https://www.linkedin.com/in/pramuda-kulathunga/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="dev-link-button linkedin-link"
                                    title="Pramuda Kulathunga | LinkedIn"
                                >
                                    <div className="dev-btn-content">
                                        <FaLinkedin className="dev-platform-icon linkedin-icon" />
                                        <div className="dev-btn-titles">
                                            <span className="dev-btn-subtitle">Professional Profile</span>
                                            <span className="dev-btn-title">Pramuda Kulathunga | LinkedIn</span>
                                        </div>
                                    </div>
                                    <MdOpenInNew className="dev-arrow-icon" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Custom Coming Soon Modal for Android APK & Google Play */}
            {showComingSoonModal && createPortal(
                <div className="pub-modal-overlay" onClick={() => setShowComingSoonModal(false)}>
                    <div className="pub-modal-card" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="pub-modal-close-btn"
                            onClick={() => setShowComingSoonModal(false)}
                            aria-label="Close"
                        >
                            <MdClose />
                        </button>

                        {comingSoonPlatform === 'Google Play Store' ? (
                            <div className="pub-modal-playstore-flow">
                                <div className="pub-modal-hero">
                                    <div className="pub-modal-icon-glow play-glow">
                                        <FaGooglePlay className="pub-modal-platform-icon" />
                                    </div>
                                    <h2 className="pub-modal-title">Install via Google Play Store</h2>
                                    <p className="pub-modal-subtitle">
                                        Follow these 2 quick steps to install directly through Google Play and have your download officially counted by Google!
                                    </p>
                                </div>

                                <div className="pub-modal-steps-list">
                                    <div className={`pub-modal-step-card ${hasJoinedTestersGroup ? 'step-completed' : ''}`}>
                                        <div className="step-num-badge">
                                            {hasJoinedTestersGroup ? <MdCheckCircleOutline /> : '1'}
                                        </div>
                                        <div className="step-card-content">
                                            <div className="step-card-header">
                                                <strong>Join Google Group</strong>
                                                {hasJoinedTestersGroup && (
                                                    <span className="step-verified-pill">
                                                        <MdCheckCircleOutline /> Joined
                                                    </span>
                                                )}
                                            </div>
                                            <p className="step-card-desc">
                                                Google Play requires your Google account to belong to our official group:
                                                <code className="step-group-email">e-legends-trophy-2k26@googlegroups.com</code>
                                            </p>
                                            <div className="step-mail-note">
                                                <MdPrivacyTip className="mail-note-icon" />
                                                <span><strong>Important:</strong> Use the <em>same Google account</em> (Gmail) for both this group and your Google Play Store app.</span>
                                            </div>
                                            <div className="step-actions-row">
                                                <a
                                                    href="https://groups.google.com/g/e-legends-trophy-2k26"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="pub-modal-step-btn group-link"
                                                    onClick={() => markGroupJoined(true)}
                                                >
                                                    <span>Join Google Group</span>
                                                    <MdOpenInNew />
                                                </a>
                                                <button
                                                    type="button"
                                                    className={`step-toggle-joined-btn ${hasJoinedTestersGroup ? 'active' : ''}`}
                                                    onClick={() => markGroupJoined(prev => !prev)}
                                                >
                                                    {hasJoinedTestersGroup ? '✓ Group Joined' : 'I Already Joined'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`pub-modal-step-card primary-step ${!hasJoinedTestersGroup ? 'is-locked' : 'is-unlocked'}`}>
                                        <div className="step-num-badge">2</div>
                                        <div className="step-card-content">
                                            <div className="step-card-header">
                                                <strong>Click "Become a Tester" to Download</strong>
                                                {!hasJoinedTestersGroup ? (
                                                    <span className="step-locked-pill">
                                                        <MdLock /> Locked
                                                    </span>
                                                ) : (
                                                    <span className="step-verified-pill">
                                                        <MdCheckCircleOutline /> Ready
                                                    </span>
                                                )}
                                            </div>
                                            <p className="step-card-desc">
                                                {hasJoinedTestersGroup ? (
                                                    <>Tap below, click <strong>"BECOME A TESTER"</strong>, and then tap <strong>"Download it on Google Play"</strong>.</>
                                                ) : (
                                                    <>Join the Google Group in <strong>Step 1</strong> above to unlock the Google Play testing track.</>
                                                )}
                                            </p>
                                            {hasJoinedTestersGroup ? (
                                                <a
                                                    href="https://play.google.com/apps/testing/com.eltrophy.app.e_legends_trophy"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="pub-modal-step-btn play-cta-btn enabled-active"
                                                >
                                                    <FaGooglePlay className="btn-play-ico" />
                                                    <span>Click "Become a Tester"</span>
                                                    <MdOpenInNew />
                                                </a>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled
                                                    className="pub-modal-step-btn play-cta-btn disabled-locked"
                                                    title="Please join the Google Group in Step 1 first to unlock"
                                                >
                                                    <MdLock className="btn-play-ico" />
                                                    <span>Join Group in Step 1 to Unlock</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="pub-modal-hero">
                                    <div className="pub-modal-icon-glow">
                                        {comingSoonPlatform === 'Huawei AppGallery' ? (
                                            <SiAppgallery className="pub-modal-platform-icon" style={{ color: '#ef4444' }} />
                                        ) : (
                                            <MdAndroid className="pub-modal-platform-icon" />
                                        )}
                                    </div>
                                    <span className="pub-modal-tag">OFFICIAL RELEASE IN PROGRESS</span>
                                    <h2 className="pub-modal-title">E-Legends Mobile App Releasing Soon!</h2>
                                    <p className="pub-modal-subtitle">
                                        {comingSoonPlatform === 'Huawei AppGallery' ? (
                                            <>
                                                The official tournament mobile app for <strong>Huawei AppGallery</strong> is currently undergoing final staging and store verification. AppGallery listing will unlock soon!
                                            </>
                                        ) : (
                                            <>
                                                The official <strong>Android APK</strong> is being built and prepared for this repository. Once a release with the .apk asset is published in this repository, clicking the Android APK button will download it automatically.
                                            </>
                                        )}
                                    </p>
                                </div>

                                <div className="pub-modal-features-grid">
                                    <div className="pub-modal-feat-item">
                                        <div className="feat-icon-box"><MdBolt /></div>
                                        <div className="feat-texts">
                                            <strong>Ultra-Fast Live Scores</strong>
                                            <span>Real-time ball-by-ball synchronization</span>
                                        </div>
                                    </div>
                                    <div className="pub-modal-feat-item">
                                        <div className="feat-icon-box"><MdTimeline /></div>
                                        <div className="feat-texts">
                                            <strong>Interactive Wagon Wheels</strong>
                                            <span>3D shot placement charts &amp; boundary replays</span>
                                        </div>
                                    </div>
                                    <div className="pub-modal-feat-item">
                                        <div className="feat-icon-box"><MdNotificationsActive /></div>
                                        <div className="feat-texts">
                                            <strong>Instant Match Alerts</strong>
                                            <span>Wickets, sixes, milestones &amp; DLS alerts</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pub-modal-footer">
                                    <div className="pub-modal-badge-info">
                                        <span className="pub-live-dot" /> Tournament Ready
                                    </div>
                                    <button
                                        type="button"
                                        className="pub-modal-btn-confirm"
                                        onClick={() => setShowComingSoonModal(false)}
                                    >
                                        Got It, Keep Me Posted!
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}

            <Footer />
        </div>
    );
};

export default PublishingPage;
