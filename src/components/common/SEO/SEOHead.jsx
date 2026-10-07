import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_URL = 'https://e-legends-2k26.vercel.app';

/**
 * SEOHead Component
 * Dynamically updates document metadata, OpenGraph, Twitter, and canonical tags
 * to ensure search engines index individual SPA routes with proper self-referencing canonicals.
 */
const SEOHead = ({
    title = 'E-Legends Trophy 2K26 | Official Cricket Tournament & Live Scores',
    description = 'Official Live Cricket Tournament Dashboard for E-Legends Trophy 2K26. Real-time scores, match fixtures, team standings, and commentary.',
    canonicalPath,
    ogImage = `${BASE_URL}/logo512.png`
}) => {
    const location = useLocation();

    // Determine current canonical URL
    const targetPath = canonicalPath !== undefined 
        ? canonicalPath 
        : (location.pathname.replace(/\/+$/, '') || '/');
    const fullCanonicalUrl = targetPath === '/' ? `${BASE_URL}/` : `${BASE_URL}${targetPath}`;

    useEffect(() => {
        // 1. Update Document Title
        document.title = title;

        // 2. Update or Create Canonical Tag
        let canonicalEl = document.getElementById('canonical-tag');
        if (!canonicalEl) {
            canonicalEl = document.querySelector("link[rel='canonical']");
        }
        if (canonicalEl) {
            canonicalEl.setAttribute('href', fullCanonicalUrl);
        } else {
            canonicalEl = document.createElement('link');
            canonicalEl.setAttribute('rel', 'canonical');
            canonicalEl.setAttribute('id', 'canonical-tag');
            canonicalEl.setAttribute('href', fullCanonicalUrl);
            document.head.appendChild(canonicalEl);
        }

        // 3. Helper to update or create meta tags
        const setMeta = (nameAttr, nameVal, content) => {
            let el = document.querySelector(`meta[${nameAttr}='${nameVal}']`);
            if (el) {
                el.setAttribute('content', content);
            } else {
                el = document.createElement('meta');
                el.setAttribute(nameAttr, nameVal);
                el.setAttribute('content', content);
                document.head.appendChild(el);
            }
        };

        // Standard Meta
        setMeta('name', 'description', description);

        // OpenGraph
        setMeta('property', 'og:title', title);
        setMeta('property', 'og:description', description);
        setMeta('property', 'og:url', fullCanonicalUrl);
        setMeta('property', 'og:image', ogImage);

        // Twitter Card
        setMeta('name', 'twitter:title', title);
        setMeta('name', 'twitter:description', description);
        setMeta('name', 'twitter:image', ogImage);
    }, [title, description, fullCanonicalUrl, ogImage]);

    return null;
};

export default SEOHead;
