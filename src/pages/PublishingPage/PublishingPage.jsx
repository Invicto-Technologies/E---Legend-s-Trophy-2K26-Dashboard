import React, { useState, useEffect } from 'react';
import TiltCard from '../../components/3D/TiltCard';
import Footer from '../../components/common/Footer/Footer';
import {
    subscribeDownloadCount,
    incrementDownloadCount,
    subscribeActiveTournament
} from '../../services/rtdbService';
import {
    MdDownload,
    MdAndroid,
    MdCheckCircle,
    MdSecurity,
    MdPhoneAndroid,
    MdLiveTv,
    MdEmojiEvents,
    MdSportsCricket,
    MdCall,
    MdOpenInNew,
    MdBolt,
    MdMilitaryTech,
    MdVerified
} from 'react-icons/md';
import { FaGooglePlay } from 'react-icons/fa';
import { RiFacebookFill, RiShareLine } from 'react-icons/ri';
import './PublishingPage.css';

import logoWhite from '../../Images/Logo_White.png';
import sponsorLogo from '../../Images/Support1.jpeg';
import apkFile from '../../apk/E Legends Trophy 2025.apk';
import videoBg from '../../video/videoBg.mp4';

const PublishingPage = () => {
    const [downloadCount, setDownloadCount] = useState(254);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadStarted, setDownloadStarted] = useState(false);
    const [activeTournament, setActiveTournament] = useState(null);

    useEffect(() => {
        const unsubCount = subscribeDownloadCount((count) => {
            setDownloadCount(count);
        });
        const unsubTourney = subscribeActiveTournament((tourney) => {
            setActiveTournament(tourney);
        });
        return () => {
            unsubCount();
            unsubTourney();
        };
    }, []);

    const handleDownloadClick = async () => {
        setIsDownloading(true);
        try {
            await incrementDownloadCount();
            setDownloadStarted(true);

            // Programmatically trigger download
            const link = document.createElement('a');
            link.href = apkFile;
            link.download = 'E_Legends_Trophy_2025.apk';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
                setIsDownloading(false);
            }, 1800);
        } catch (error) {
            console.error('Download trigger error:', error);
            setIsDownloading(false);
        }
    };

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

    return (
        <div className="publishing-3d-page">
            {/* Ambient Hero with Video Background */}
            <section className="pub-hero-section">
                <div className="pub-video-wrapper">
                    <video autoPlay loop muted playsInline className="pub-bg-video">
                        <source src={videoBg} type="video/mp4" />
                    </video>
                    <div className="pub-video-overlay" />
                    <div className="pub-gradient-mesh" />
                </div>

                <div className="pub-container pub-hero-grid">
                    {/* Left: App Details & Action */}
                    <div className="pub-hero-content">
                        <div className="pub-badge-tag">
                            <MdAndroid className="pub-badge-icon" />
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

                        <div className="pub-meta-strip">
                            <div className="meta-pill">
                                <span className="meta-dot live-dot" />
                                <span>Realtime RTDB Sync</span>
                            </div>
                            <div className="meta-pill">
                                <MdSecurity className="meta-icon" />
                                <span>Verified & Safe</span>
                            </div>
                            <div className="meta-pill">
                                <MdBolt className="meta-icon" />
                                <span>~74 MB APK</span>
                            </div>
                            <div className="meta-pill">
                                <span className="download-number-highlight">{downloadCount}+</span>
                                <span>Downloads</span>
                            </div>
                        </div>

                        <div className="pub-actions-group">
                            <button
                                className={`pub-download-btn ${isDownloading ? 'downloading' : ''}`}
                                onClick={handleDownloadClick}
                                disabled={isDownloading}
                                id="download-apk-btn"
                            >
                                <MdDownload className="btn-dl-icon" />
                                <div className="btn-dl-texts">
                                    <span className="btn-main-text">
                                        {isDownloading ? 'PREPARING APK...' : 'ANDROID APK'}
                                    </span>
                                    <span className="btn-sub-text">Direct download (v2.5.0)</span>
                                </div>
                            </button>

                            <a
                                href="https://play.google.com/store/apps"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pub-playstore-btn"
                                id="download-playstore-btn"
                            >
                                <FaGooglePlay className="btn-play-icon" />
                                <div className="btn-play-texts">
                                    <span className="btn-play-eyebrow">GET IT ON</span>
                                    <span className="btn-play-main">Google Play</span>
                                </div>
                            </a>

                            <button className="pub-share-btn" onClick={handleShare} data-tooltip="Share App Link">
                                <RiShareLine />
                                <span>Share</span>
                            </button>
                        </div>

                        {downloadStarted && (
                            <div className="pub-download-toast">
                                <MdCheckCircle className="toast-icon" />
                                <div>
                                    <strong>Download initiated!</strong> Check your device downloads folder to open the APK.
                                </div>
                            </div>
                        )}
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
                            <div className="feat-icon-box live-accent">
                                <MdLiveTv />
                            </div>
                            <h3>Live Ball-by-Ball Radar</h3>
                            <p>
                                Real-time ball-by-ball updates, commentary, strike rates, bowling figures, and fall of wickets powered by Firebase RTDB.
                            </p>
                        </TiltCard>

                        <TiltCard className="feature-tilt-card">
                            <div className="feat-icon-box gold-accent">
                                <MdEmojiEvents />
                            </div>
                            <h3>Batch Points & Net Run Rate</h3>
                            <p>
                                Automated tournament points standings with dynamic NRR calculations updated right as the final ball is bowled.
                            </p>
                        </TiltCard>

                        <TiltCard className="feature-tilt-card">
                            <div className="feat-icon-box emerald-accent">
                                <MdSportsCricket />
                            </div>
                            <h3>Leaderboards & Records</h3>
                            <p>
                                Comprehensive player leaderboards tracking the highest run-scorers and top wicket-takers across all batches.
                            </p>
                        </TiltCard>

                        <TiltCard className="feature-tilt-card">
                            <div className="feat-icon-box cyan-accent">
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
                            <div className="contact-avatar">SK</div>
                            <div className="contact-details">
                                <span className="contact-role">Tournament Coordinator</span>
                                <h4>Supun Krishantha</h4>
                                <a href="tel:+94769934453" className="contact-tel">
                                    <MdCall /> +94 76 993 4453
                                </a>
                            </div>
                        </div>

                        <div className="contact-card">
                            <div className="contact-avatar">VK</div>
                            <div className="contact-details">
                                <span className="contact-role">Operations & Ground Logistics</span>
                                <h4>Vishwa Karunaratne</h4>
                                <a href="tel:+94707247148" className="contact-tel">
                                    <MdCall /> +94 70 724 7148
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

            <Footer />
        </div>
    );
};

export default PublishingPage;
