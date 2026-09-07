import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ThreeCricketScene from '../../components/3D/ThreeCricketScene';
import TiltCard from '../../components/3D/TiltCard';
import Footer from '../../components/common/Footer/Footer';
import {
    subscribeLiveData,
    subscribeFixtures,
    subscribeStories,
    subscribeTeams,
    subscribeDownloadCount,
    subscribeWebViewsCount,
    recordWebView,
    subscribeActiveTournament,
    resolveTournamentLabels
} from '../../services/rtdbService';
import {
    MdLiveTv,
    MdSportsCricket,
    MdVisibility,
    MdEmojiEvents,
    MdPeople,
    MdDownload,
    MdCalendarToday,
    MdArrowForward,
    MdClose,
    MdFiberManualRecord,
    MdLocationOn,
    MdBolt
} from 'react-icons/md';
import MatchCard, { isMatchFinished, parseMatchDateTime } from '../../components/common/MatchCard/MatchCard';
import './Home3D.css';

/**
 * Animated number ticker that counts up from 0 to target
 * when the section first appears in viewport.
 */
const CountUpNumber = ({ target = 0, duration = 1600, shouldStart = false, suffix = '', format = true }) => {
    const [displayVal, setDisplayVal] = useState(0);
    const prevTargetRef = useRef(0);

    useEffect(() => {
        if (!shouldStart) return;

        const numTarget = typeof target === 'number' ? target : parseInt(String(target).replace(/[^0-9]/g, ''), 10) || 0;
        const startVal = prevTargetRef.current;
        prevTargetRef.current = numTarget;

        if (numTarget === startVal && displayVal === numTarget) return;

        let startTime = null;
        let animId;

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out quart: fast initial surge, smooth settle
            const easeOut = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(startVal + (numTarget - startVal) * easeOut);

            setDisplayVal(current);

            if (progress < 1) {
                animId = requestAnimationFrame(step);
            } else {
                setDisplayVal(numTarget);
            }
        };

        animId = requestAnimationFrame(step);

        return () => cancelAnimationFrame(animId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, shouldStart, duration]);

    if (!shouldStart && displayVal === 0) {
        return <span>0{suffix}</span>;
    }

    const formatted = format ? displayVal.toLocaleString() : displayVal;
    return <span>{formatted}{suffix}</span>;
};

const Home3D = () => {
    const [liveData, setLiveData] = useState(null);
    const [allMatches, setAllMatches] = useState([]);
    const [stories, setStories] = useState([]);
    const [teams, setTeams] = useState({});
    const [downloadCount, setDownloadCount] = useState(0);
    const [webViewsCount, setWebViewsCount] = useState(0);
    const [activeStoryModal, setActiveStoryModal] = useState(null);
    const [activeTournament, setActiveTournament] = useState(null);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isTournamentLive, setIsTournamentLive] = useState(false);
    const [isTournamentCompleted, setIsTournamentCompleted] = useState(false);

    // Section visibility detection for animated counter
    const statsSectionRef = useRef(null);
    const [statsAppeared, setStatsAppeared] = useState(false);

    useEffect(() => {
        const el = statsSectionRef.current;
        if (!el) return;

        if (typeof IntersectionObserver === 'undefined') {
            setStatsAppeared(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setStatsAppeared(true);
                    observer.disconnect(); // Only trigger on first appearance after page load
                }
            },
            {
                threshold: 0.15,
                rootMargin: '0px 0px -40px 0px'
            }
        );

        observer.observe(el);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        const unsubLive = subscribeLiveData((data) => setLiveData(data));
        const unsubFixtures = subscribeFixtures((data) => {
            if (data?.finishedMatches && Object.keys(data.finishedMatches).length > 0) {
                const list = Object.values(data.finishedMatches);
                // Order by ascending order of date and time as requested
                list.sort((a, b) => parseMatchDateTime(a) - parseMatchDateTime(b));
                setAllMatches(list);
            } else {
                setAllMatches([]);
            }
        });
        const unsubStories = subscribeStories((data) => {
            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                const list = Object.entries(data)
                    .filter(([id, s]) => s && (s.topic || s.description || s.ImageURL || s.imageUrl || s.image || s.coverImage))
                    .map(([id, s]) => ({ id, ...s }));
                setStories(list.reverse());
            } else {
                setStories([]);
            }
        });
        recordWebView();
        const unsubTeams = subscribeTeams((data) => setTeams(data || {}));
        const unsubCount = subscribeDownloadCount((count) => setDownloadCount(count));
        const unsubViews = subscribeWebViewsCount((count) => setWebViewsCount(count));
        const unsubTourney = subscribeActiveTournament((tourney) => setActiveTournament(tourney));

        return () => {
            unsubLive();
            unsubFixtures();
            unsubStories();
            unsubTeams();
            unsubCount();
            unsubViews();
            unsubTourney();
        };
    }, []);

    // Real-time countdown timer to active tournament's start date
    useEffect(() => {
        if (!activeTournament) return;

        const targetDateStr = activeTournament.startDate || '2026-10-10T08:00:00';
        const targetTime = new Date(targetDateStr).getTime();

        const updateTimer = () => {
            const now = Date.now();
            const diff = targetTime - now;

            if (activeTournament.status === 'completed') {
                setIsTournamentCompleted(true);
                setIsTournamentLive(false);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            if (diff <= 0 || activeTournament.status === 'active') {
                setIsTournamentLive(true);
                setIsTournamentCompleted(false);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            } else {
                setIsTournamentLive(false);
                setIsTournamentCompleted(false);
                setTimeLeft({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((diff % (1000 * 60)) / 1000)
                });
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeTournament]);

    const isMatchLive = Boolean(liveData?.isLive);
    const liveScore = liveData?.liveScore;

    const labels = resolveTournamentLabels(activeTournament);
    const completedMatches = allMatches.filter(isMatchFinished);
    const upcomingMatches = allMatches.filter((m) => !isMatchFinished(m));
    const displayedMatches = completedMatches.length > 0 ? completedMatches : upcomingMatches;
    const isShowingCompleted = completedMatches.length > 0;

    useEffect(() => {
        if (labels.webTitle) {
            document.title = labels.webTitle;
        }
    }, [labels.webTitle]);

    return (
        <div className="home-3d-page">
            {/* Hero Section */}
            <section className="hero-3d-section">
                <div className="hero-bg-glow" />
                <div className="hero-3d-container">
                    <div className="hero-content">
                        <div className="hero-badge">
                            <span>FACULTY OF ENGINEERING</span><span className="badge-glow" /><span> UNIVERSITY OF JAFFNA</span>
                        </div>
                        <h1 className="hero-title">
                            {labels.heroLine1} <br />
                            <span className="gradient-text">{labels.heroLine2}</span>
                        </h1>
                        <p className="hero-subtitle">
                            {activeTournament?.title || labels.subtitle}
                            {activeTournament?.organizers && (
                                <>
                                    <span className="badge-glow" style={{ margin: '0 8px', display: 'inline-block' }} />
                                    <span>{activeTournament.organizers}</span>
                                </>
                            )}
                        </p>

                        {/* 3D Glass Tournament Countdown / Live Status Widget */}
                        <div className="hero-countdown-widget">
                            <div className="countdown-status-line">
                                {isTournamentLive ? (
                                    <div className="status-live-beacon">
                                        <span className="live-ping-dot" />
                                        <span>TOURNAMENT COMMENCED • BATTLE IS LIVE</span>
                                    </div>
                                ) : isTournamentCompleted ? (
                                    <div className="status-completed-beacon">
                                        <MdEmojiEvents className="completed-icon" />
                                        <span>CONCLUDED • CHAMPION: {activeTournament?.champion || 'E21 Batch'}</span>
                                    </div>
                                ) : (
                                    <div className="status-countdown-beacon">
                                        <MdBolt className="beacon-bolt" />
                                        <span>TOURNAMENT COMMENCES IN</span>
                                    </div>
                                )}

                                {activeTournament?.startDate && !isTournamentCompleted && (
                                    <div className="countdown-date-chip">
                                        <MdCalendarToday />
                                        <span>
                                            {new Date(activeTournament.startDate).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {!isTournamentCompleted && !isTournamentLive && (
                                <div className="hero-countdown-grid">
                                    <div className="countdown-pedestal">
                                        <div className="pedestal-num">{String(timeLeft.days).padStart(2, '0')}</div>
                                        <div className="pedestal-label">DAYS</div>
                                    </div>
                                    <span className="pedestal-colon">:</span>
                                    <div className="countdown-pedestal">
                                        <div className="pedestal-num">{String(timeLeft.hours).padStart(2, '0')}</div>
                                        <div className="pedestal-label">HOURS</div>
                                    </div>
                                    <span className="pedestal-colon">:</span>
                                    <div className="countdown-pedestal">
                                        <div className="pedestal-num">{String(timeLeft.minutes).padStart(2, '0')}</div>
                                        <div className="pedestal-label">MINUTES</div>
                                    </div>
                                    <span className="pedestal-colon">:</span>
                                    <div className="countdown-pedestal sec-pedestal">
                                        <div className="pedestal-num sec-num">{String(timeLeft.seconds).padStart(2, '0')}</div>
                                        <div className="pedestal-label">SECONDS</div>
                                    </div>
                                </div>
                            )}

                            {activeTournament?.venue && (
                                <div className="countdown-venue-row">
                                    <MdLocationOn className="venue-icon" />
                                    <span>{activeTournament.venue}</span>
                                </div>
                            )}
                        </div>

                        <div className="hero-cta-group">
                            <Link to="/live" className="cx-btn-primary">
                                <MdLiveTv className="btn-icon" />
                                <span>{isMatchLive ? 'WATCH LIVE MATCH' : 'MATCH CENTER'}</span>
                            </Link>
                            <Link to="/fixtures" className="cx-btn-glass">
                                <MdCalendarToday className="btn-icon" />
                                <span>VIEW FIXTURES</span>
                            </Link>
                        </div>
                    </div>

                    {/* Three.js Interactive 3D Canvas */}
                    <div className="hero-canvas-wrap">
                        <ThreeCricketScene height="540px" edition={labels.editionCode || "2K26"} />
                    </div>
                </div>
            </section>

            {/* Live Match Radar Card (If match is currently live) */}
            {isMatchLive && liveScore && (
                <section className="live-radar-section">
                    <div className="home-container">
                        <div className="live-radar-banner">
                            <div className="live-radar-tag">
                                <span className="live-dot-ping" />
                                <MdFiberManualRecord className="live-icon-dot" />
                                <span>LIVE NOW • {liveScore.matchTitle || 'Active Match'}</span>
                            </div>

                            <div className="live-radar-teams">
                                <div className="radar-team">
                                    <span className="radar-team-name">{liveScore.team1?.name || 'Team 1'}</span>
                                    <span className="radar-team-score">
                                        {liveScore.team1?.score ?? 0}/{liveScore.team1?.wicket ?? 0}
                                        <small> ({liveScore.team1?.overs ?? 0} ov)</small>
                                    </span>
                                </div>
                                <div className="radar-vs">VS</div>
                                <div className="radar-team">
                                    <span className="radar-team-name">{liveScore.team2?.name || 'Team 2'}</span>
                                    <span className="radar-team-score">
                                        {liveScore.team2?.score ?? 0}/{liveScore.team2?.wicket ?? 0}
                                        <small> ({liveScore.team2?.overs ?? 0} ov)</small>
                                    </span>
                                </div>
                            </div>

                            <div className="live-radar-status">
                                <p>{liveScore.status || 'Match in progress'}</p>
                                <Link to="/live" className="radar-view-btn">
                                    Full Scorecard <MdArrowForward />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Holographic 3D Stats Pedestals */}
            <section className="stats-pedestal-section" ref={statsSectionRef}>
                <div className="home-container">
                    <div className="stats-grid">
                        <TiltCard className="stat-card" maxTilt={12} data-tooltip="Registered Batches in Faculty of Engineering">
                            <div className="stat-icon-wrap cyan">
                                <MdPeople />
                            </div>
                            <div className="stat-details">
                                <span className="stat-number">
                                    <CountUpNumber target={Object.keys(teams).length} shouldStart={statsAppeared} />
                                </span>
                                <span className="stat-label">Faculty Batches</span>
                            </div>
                            <span className="stat-glimmer" />
                        </TiltCard>

                        <TiltCard className="stat-card" maxTilt={12} data-tooltip="Total Matches Played in Selected Tournament">
                            <div className="stat-icon-wrap emerald">
                                <MdSportsCricket />
                            </div>
                            <div className="stat-details">
                                <span className="stat-number">
                                    <CountUpNumber target={completedMatches.length} shouldStart={statsAppeared} />
                                </span>
                                <span className="stat-label">Matches Played</span>
                            </div>
                            <span className="stat-glimmer" />
                        </TiltCard>

                        <TiltCard className="stat-card" maxTilt={12} data-tooltip="Total Live Web Visitors & Viewers">
                            <div className="stat-icon-wrap gold">
                                <MdVisibility />
                            </div>
                            <div className="stat-details">
                                <span className="stat-number">
                                    <CountUpNumber target={webViewsCount} shouldStart={statsAppeared} />
                                </span>
                                <span className="stat-label">Web Viewers</span>
                            </div>
                            <span className="stat-glimmer" />
                        </TiltCard>

                        <TiltCard className="stat-card" maxTilt={12} data-tooltip="Official Android Tournament App Installations">
                            <div className="stat-icon-wrap purple">
                                <MdDownload />
                            </div>
                            <div className="stat-details">
                                <span className="stat-number">
                                    <CountUpNumber
                                        target={downloadCount > 0 ? downloadCount : 1200}
                                        shouldStart={statsAppeared}
                                        suffix="+"
                                    />
                                </span>
                                <span className="stat-label">App Downloads</span>
                            </div>
                            <span className="stat-glimmer" />
                        </TiltCard>
                    </div>
                </div>
            </section>

            {/* Tournament Highlights & Results */}
            {displayedMatches && displayedMatches.length > 0 && (
                <section className="results-section">
                    <div className="home-container">
                        <div className="section-header">
                            <div>
                                <span className="section-tag">TOURNAMENT FIXTURES</span>
                                <h2 className="section-title">
                                    {isShowingCompleted ? 'Latest Match Results' : 'Upcoming Match Schedule'}
                                </h2>
                            </div>
                            <Link to="/fixtures" className="view-all-link">
                                All Fixtures <MdArrowForward />
                            </Link>
                        </div>

                        <div className="results-grid">
                            {displayedMatches.slice(0, 4).map((match, idx) => (
                                <MatchCard key={match.id || idx} match={match} teamsMap={teams} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Featured Stories Deck */}
            {stories.length > 0 && (
                <section className="stories-section">
                    <div className="home-container">
                        <div className="section-header">
                            <div>
                                <span className="section-tag">TOURNAMENT PULSE</span>
                                <h2 className="section-title">Top Stories & Highlights</h2>
                            </div>
                        </div>

                        <div className="stories-grid">
                            {stories.slice(0, 3).map((story) => {
                                const storyText = story.description || story.content || '';
                                const storyImg = story.ImageURL || story.imageUrl || story.image || story.coverImage;
                                const isLongStory = storyText.length > 100;

                                return (
                                    <TiltCard
                                        key={story.id}
                                        className={`story-card ${storyImg ? 'has-cover-image' : ''} ${isLongStory ? 'has-read-more' : ''}`}
                                        maxTilt={8}
                                        onClick={() => (isLongStory || storyImg) && setActiveStoryModal(story)}
                                        style={{ cursor: (isLongStory || storyImg) ? 'pointer' : 'default' }}
                                    >
                                        {storyImg && (
                                            <div className="story-card-cover-wrap">
                                                <img
                                                    src={storyImg}
                                                    alt={story.topic || 'Story Cover'}
                                                    className="story-card-cover-img"
                                                    loading="lazy"
                                                />
                                                <div className="story-card-cover-gradient" />
                                            </div>
                                        )}
                                        <div className="story-card-content">
                                            <div className="story-card-top">
                                                <span className="story-time">{story.time}</span>
                                            </div>
                                            <h4 className="story-topic">{story.topic}</h4>
                                            <p className="story-desc">
                                                {isLongStory
                                                    ? `${storyText.substring(0, 100)}...`
                                                    : storyText}
                                            </p>
                                            {isLongStory && (
                                                <span className="read-more-btn">
                                                    Read Story <MdArrowForward />
                                                </span>
                                            )}
                                        </div>
                                    </TiltCard>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Story Reader Modal */}
            {activeStoryModal && (
                <div className="story-modal-overlay" onClick={() => setActiveStoryModal(null)}>
                    <div className="story-modal-card" onClick={(e) => e.stopPropagation()}>
                        <button className="story-modal-close" onClick={() => setActiveStoryModal(null)}>
                            <MdClose />
                        </button>
                        <span className="modal-story-time">{activeStoryModal.time}</span>
                        <h2 className="modal-story-title">{activeStoryModal.topic}</h2>
                        {(activeStoryModal.ImageURL || activeStoryModal.imageUrl || activeStoryModal.image || activeStoryModal.coverImage) && (
                            <img
                                src={activeStoryModal.ImageURL || activeStoryModal.imageUrl || activeStoryModal.image || activeStoryModal.coverImage}
                                alt={activeStoryModal.topic}
                                className="modal-story-img"
                            />
                        )}
                        <p className="modal-story-body">{activeStoryModal.description || activeStoryModal.content}</p>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default Home3D;
