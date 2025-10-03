import React, { useState, useEffect } from "react";
import "./PublishingPage.css";
import {
    RiMenu4Line,
    RiCloseLine,
    RiFacebookFill,
    RiWebhookFill
} from "react-icons/ri";
import { ref, get, update } from 'firebase/database';
import { database } from '../../components/firebase';

import logo from "../../Images/Logo_White.png";
import apk from "../../apk/E Legends Trophy 2025.apk"
import videoBg from "../../video/videoBg.mp4"

const PublishingPage = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [downloadCount, setDownloadCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState({});

    // Countdown target date (set your tournament registration end date)
    const countdownTarget = new Date('2025-10-06T18:59:59').getTime();

    useEffect(() => {
        // Load download count from Firebase
        const loadDownloadCount = async () => {
            try {
                const countRef = ref(database, 'downloadCount');
                const snapshot = await get(countRef);
                if (snapshot.exists()) {
                    setDownloadCount(snapshot.val());
                } else {
                    setDownloadCount(0);
                }
            } catch (error) {
                console.error("Error loading download count:", error);
            }
        };

        loadDownloadCount();

        const ScrollReveal = require("scrollreveal").default;

        const scrollRevealOption = {
            distance: "50px",
            origin: "bottom",
            duration: 1000,
        };

        ScrollReveal().reveal(".header__content h2", {
            ...scrollRevealOption,
            delay: 300,
        });
        ScrollReveal().reveal(".header__content h1", {
            ...scrollRevealOption,
            delay: 600,
        });
        ScrollReveal().reveal(".header__content p", {
            ...scrollRevealOption,
            delay: 900,
        });
        ScrollReveal().reveal(".header__btn", {
            ...scrollRevealOption,
            delay: 1200,
        });
        ScrollReveal().reveal(".header__socials li", {
            ...scrollRevealOption,
            delay: 1500,
            interval: 300,
        });
    }, []);

    // Countdown timer effect
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const difference = countdownTarget - now;

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((difference % (1000 * 60)) / 1000)
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [countdownTarget]);

    const handleDownload = async () => {
        try {
            const rootRef = ref(database);
            const snapshot = await get(ref(database, "downloadCount"));
            let currentCount = snapshot.exists() ? snapshot.val() : 0;

            await update(rootRef, { downloadCount: currentCount + 1 });

            setDownloadCount(currentCount + 1);
        } catch (error) {
            console.error("Error updating download count:", error);
        }
    };

    const handleNavClick = () => {
        setMenuOpen(false);
    };

    return (
        <div className="yoga__container">
            {/* Navbar */}
            <nav className="nav">
                <div className="nav__header">
                    <div className="nav__logo">
                        <a href="https://web.facebook.com/profile.php?id=100063745324292">
                            <img src={logo} alt="logo" className="logo-white" />
                        </a>
                        <text style={{ marginLeft: '25px', fontWeight: 'bold', color: 'rgba(218, 218, 218, 1)' }}>E Legends' Trophy 2025</text>
                    </div>
                    <div
                        className="nav__menu__btn"
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <RiCloseLine /> : <RiMenu4Line />}
                    </div>
                </div>
                <ul
                    className={`nav__links ${menuOpen ? "open" : ""}`}
                    onClick={handleNavClick}
                >
                    <li>
                        <a href="#home">HOME</a>
                    </li>
                    <li>
                        <a href="#history">HISTORY</a>
                    </li>
                    <li>
                        <a href="#contact">CONTACT US</a>
                    </li>
                </ul>
            </nav>

            {/* Header with background video */}
            <header className="header" id="home">
                <video autoPlay loop muted playsInline className="bg-video">
                    <source src={videoBg} type="video/mp4" />
                </video>
                <div className="header__overlay"></div>

                <div className="header__content">
                    <h2>JOIN WITH US</h2>
                    <h1>E Legends' Trophy 2025</h1>
                    <p>
                        Where Legends Are Forged! Join E Legends' Trophy 2025 - University of Jaffna premier Engineering
                        cricket tournament. Compete with the best, honor tradition, and carve your name in gaming history.
                    </p>
                    <div className="header__btn">
                        <button onClick={() => handleDownload()}>
                            <a href={apk} download>
                                <button>Download App</button>
                            </a>
                        </button>
                        <div className="download__count">
                            <span>{downloadCount}+ Downloads</span>
                        </div>
                    </div>
                    <ul className="header__socials">
                        <li>
                            <a href="https://web.facebook.com/profile.php?id=100063745324292">
                                <RiFacebookFill />
                            </a>
                        </li>
                        <li>
                            <a href="https://web.facebook.com/UoJMedia">
                                <RiWebhookFill />
                            </a>
                        </li>
                    </ul>
                </div>
            </header>

            {/* Countdown Section */}
            <section id="countdown" className="section countdown__section">
                <h2>E Legends' Trophy 2025 Ends In</h2>
                <div className="countdown__container">
                    <div className="countdown__item">
                        <span className="countdown__number">{timeLeft.days || 0}</span>
                        <span className="countdown__label">Days</span>
                    </div>
                    <div className="countdown__item">
                        <span className="countdown__number">{timeLeft.hours || 0}</span>
                        <span className="countdown__label">Hours</span>
                    </div>
                    <div className="countdown__item">
                        <span className="countdown__number">{timeLeft.minutes || 0}</span>
                        <span className="countdown__label">Minutes</span>
                    </div>
                    <div className="countdown__item">
                        <span className="countdown__number">{timeLeft.seconds || 0}</span>
                        <span className="countdown__label">Seconds</span>
                    </div>
                </div>
                <p className="countdown__message">
                    Don't miss your chance to be part of the legacy!
                </p>
            </section>

            {/* History Section */}
            <section id="history" className="section">
                <h2>Our History</h2>
                <p>
                    The E Legends' Trophy was established by the E15 batch of the Faculty of Engineering, University of Jaffna, to honor the legacy of Professor Thurairajah. He is widely recognized as the foundational figure and original driving force behind the creation of the Faculty of Engineering, University of Jaffna, making this tournament a fitting tribute to his vision and contributions. The event serves as a means to perpetuate his memory while supporting a cause aligned with the development of the faculty's community.
                </p>
                <p><br />This tournament envisions the rapid infrastructure development in the sports facilities within the premises specifically for Hard ball cricket and develop students' skills in professional sports coping with the standards. Having successfully completed three editions, the initiative has been sustained by subsequent batches, E18 and E19, demonstrating its enduring value. The tournament's growth and credibility were further underscored in its most recent edition, which received significant funding support from the Hartley college Past Pupils' Association UK, highlighting its expanding base of community backing in honoring the Legendary prof. A. Thurairajah.</p>
            </section>

            {/* Contact Section */}
            <section id="contact" className="section">
                <h2>Contact Us</h2>
                <p>Phone: +94 76 993 4453 (Supun) | +94 70 724 7148 (Vishwa)</p>
            </section>

            <footer className="footer">
                <p>© 2025 E Legends' Trophy | Developed by <a href="https://www.linkedin.com/in/pramuda-kulathunga" style={{ textDecoration: 'none', cursor: 'pointer', color: 'white' }}>Pramuda Kulathunga</a></p>
            </footer>
        </div>
    );
};

export default PublishingPage;
