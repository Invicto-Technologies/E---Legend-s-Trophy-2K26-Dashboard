import { useState, useEffect, useRef, useCallback } from 'react';
import {
    generateDuoBallCommentary,
    getOccasionalDuoFiller,
    generateNewBowlerIntro,
    generateNewBatterArrival,
    generateMatchVictoryAnnouncement,
    generateInningsChangeAnnouncement,
    generatePowerplayAnnouncement,
    generatePowerplayEndedAnnouncement,
    cleanPlayerNameForSpeech,
    generateDlsAnnouncement,
    generateFreeHitOutcomeCommentary,
    generateDismissedBatterStats,
    generateFiftyMilestoneAnnouncement,
    generateCenturyMilestoneAnnouncement,
    generateTeamMilestoneAnnouncement,
    generateHatTrickAnnouncement,
    generateHatTrickBallPrompt,
    generateBowlerWicketsMilestone,
    generateMaidenOverAnnouncement,
    generateOverEndAnnouncement
} from '../utils/voiceCommentaryPhrases';
import { emotionAudio } from '../utils/audioEmotionFx';

function isPlaceholderName(name) {
    if (!name || typeof name !== 'string') return true;
    const lower = name.trim().toLowerCase();
    return !lower ||
        lower === 'striker' ||
        lower === 'non-striker' ||
        lower === 'non striker' ||
        lower === 'bowler' ||
        lower === 'batter' ||
        lower === 'batsman' ||
        lower === 'null' ||
        lower === 'undefined' ||
        lower === 'player' ||
        lower === 'tba';
}


const STORAGE_KEY = 'e_legends_voice_commentary_enabled';
const VOLUME_KEY = 'e_legends_voice_commentary_volume';
const VOLUME_ARTHUR_KEY = 'e_legends_voice_volume_arthur';
const VOLUME_DAVID_KEY = 'e_legends_voice_volume_david';
const VOLUME_FX_KEY = 'e_legends_voice_volume_fx';
const DYNAMIC_VOL_KEY = 'e_legends_voice_dynamic_vol';
const DUO_KEY = 'e_legends_voice_commentary_duo';
const FX_KEY = 'e_legends_voice_commentary_fx';
const PACING_KEY = 'e_legends_voice_commentary_pacing';
const VOICE_ARTHUR_KEY = 'e_legends_voice_arthur_name';
const VOICE_DAVID_KEY = 'e_legends_voice_david_name';

// Female voice keywords to filter out when selecting default male cricket commentator voices
const FEMALE_VOICE_KEYWORDS = [
    'female', 'woman', 'zira', 'hazel', 'susan', 'catherine', 'libby',
    'sonia', 'jenny', 'aria', 'ana', 'samantha', 'victoria', 'karen',
    'fiona', 'moira', 'tessa', 'neerja', 'heera', 'eva', 'clara',
    'emma', 'mia', 'zoe', 'natasha', 'stephanie', 'sarah', 'lisa',
    'alice', 'helena', 'elena', 'yuna', 'ayumi', 'salli', 'kimberly',
    'kendra', 'joanna', 'ivy', 'allison', 'ava', 'priti'
];

/**
 * Score voices to prioritize authentic male cricket commentator tones:
 * - Arthur: UK English male (classic BBC / Sky Sports lead caller like Atherton, Gower)
 * - David: Commonwealth / US English male (deep analyst tone like Benaud, Holding)
 */
function scoreMaleCricketVoice(voice, preferUK = true) {
    if (!voice || !voice.name) return -1000;
    const name = voice.name.toLowerCase();
    const lang = (voice.lang || '').toLowerCase();

    // 1. Disqualify known female voice names
    if (FEMALE_VOICE_KEYWORDS.some(kw => name.includes(kw))) {
        return -1000;
    }

    let score = 0;
    if (lang.startsWith('en')) score += 50;

    // UK English strongly preferred for Arthur (classic BBC / Sky Sports cricket broadcast)
    if (preferUK && lang.startsWith('en-gb')) {
        score += 80;
    } else if (!preferUK && (lang.startsWith('en-us') || lang.startsWith('en-au') || lang.startsWith('en-in'))) {
        score += 60;
    }

    // High-priority male cricket commentator voice profiles
    // Windows / Desktop
    if (name.includes('george')) score += 120; // Microsoft George (UK Male classic)
    if (name.includes('ryan')) score += 115;   // Microsoft Ryan (UK Natural Male)
    if (name.includes('oliver')) score += 110; // Microsoft Oliver (UK Male)
    if (name.includes('daniel')) score += 110; // Daniel (Apple UK Male)
    if (name.includes('arthur')) score += 110; // Arthur (Apple UK Male)
    if (name.includes('uk english male')) score += 105; // Google UK English Male
    if (name.includes('david')) score += 95;   // Microsoft David (US Male classic)
    if (name.includes('guy')) score += 95;     // Microsoft Guy (US Natural Male)
    if (name.includes('mark')) score += 90;    // Microsoft Mark (US Male)
    if (name.includes('peter')) score += 85;   // AU Male
    if (name.includes('william')) score += 85; // AU Male
    if (name.includes('james')) score += 85;   // UK Male
    if (name.includes('brian')) score += 80;   // UK Male
    if (name.includes('ravi')) score += 80;    // Indian Male
    if (name.includes('alex')) score += 80;    // Apple Alex (US Male)
    if (name.includes('fred')) score += 75;    // Apple Fred (US Male)

    // Android (Google TTS / Samsung TTS)
    if (name.includes('google') && name.includes('male')) score += 110;
    if (name.includes('male_1') || name.includes('male-1') || name.includes('#male')) score += 75;
    if (name.includes('samsung') && lang.startsWith('en')) score += 40;

    // Generic keywords
    if (name.includes('male')) score += 60;
    if (name.includes('natural') || name.includes('enhanced') || name.includes('premium')) score += 25;

    return score;
}

/**
 * Advanced 2-Person Cricket Commentary Hook with Real-World Broadcast Volumes
 * - Person 1: Arthur (Lead Play-by-Play Broadcaster)
 * - Person 2: David (Color Expert Analyst & Banter)
 * - Real-World Dynamic Volume Modulation: High intensity for boundaries/wickets, softer for dots
 * - Individual Mic Levels: Master, Arthur Mic, David Mic, Stadium FX
 * - Natural Silences: Lets the stadium breathe between deliveries
 * - Emotional Sound FX: Bat cracks, crowd gasps, chuckles, and sighs
 */
export function useVoiceCommentary({
    latestDelivery = null,
    matchContext = {},
    enabledDefault = false
}) {
    const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    // Master enabled
    const [isEnabled, setIsEnabled] = useState(() => {
        if (typeof window === 'undefined') return false;
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved !== null ? saved === 'true' : enabledDefault;
    });

    // Master Volume
    const [volume, setVolumeState] = useState(() => {
        if (typeof window === 'undefined') return 0.9;
        const saved = localStorage.getItem(VOLUME_KEY);
        return saved !== null ? Number(saved) : 0.9;
    });

    // Real-World Individual Mic Volumes
    const [volumeArthur, setVolumeArthurState] = useState(() => {
        if (typeof window === 'undefined') return 1.0;
        const saved = localStorage.getItem(VOLUME_ARTHUR_KEY);
        return saved !== null ? Number(saved) : 1.0;
    });

    const [volumeDavid, setVolumeDavidState] = useState(() => {
        if (typeof window === 'undefined') return 0.88;
        const saved = localStorage.getItem(VOLUME_DAVID_KEY);
        return saved !== null ? Number(saved) : 0.88;
    });

    const [volumeFx, setVolumeFxState] = useState(() => {
        if (typeof window === 'undefined') return 0.75;
        const saved = localStorage.getItem(VOLUME_FX_KEY);
        return saved !== null ? Number(saved) : 0.75;
    });

    // Real-world dynamic volume auto-modulation (excited for 6s/wickets, quiet for dots)
    const [dynamicVolume, setDynamicVolumeState] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem(DYNAMIC_VOL_KEY);
        return saved !== null ? saved === 'true' : true;
    });

    const [isDuoEnabled, setIsDuoEnabledState] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem(DUO_KEY);
        return saved !== null ? saved === 'true' : true;
    });

    const [soundFxEnabled, setSoundFxEnabledState] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem(FX_KEY);
        return saved !== null ? saved === 'true' : true;
    });

    // Pacing: 'relaxed' (default: 70% silences), 'moderate' (50% silences), 'balls_only' (100% silence between balls)
    const [pacingMode, setPacingModeState] = useState(() => {
        if (typeof window === 'undefined') return 'relaxed';
        return localStorage.getItem(PACING_KEY) || 'relaxed';
    });

    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [activeSpeaker, setActiveSpeaker] = useState(null); // 'Arthur' | 'David' | null
    const [currentEmotion, setCurrentEmotion] = useState(null); // 'bat_crack' | 'surprise' | 'laughter' | 'sad' | 'roar' | null
    const [currentSpokenText, setCurrentSpokenText] = useState('');
    const [speechType, setSpeechType] = useState('idle'); // 'ball' | 'analyst' | 'filler' | 'idle'
    const [availableVoices, setAvailableVoices] = useState([]);
    const [voice1, setVoice1] = useState(null); // Arthur's voice
    const [voice2, setVoice2] = useState(null); // David's voice
    const [dialogueFeed, setDialogueFeed] = useState([]);

    // Stable references
    const isEnabledRef = useRef(isEnabled);
    isEnabledRef.current = isEnabled;

    const isMutedRef = useRef(isMuted);
    isMutedRef.current = isMuted;

    const volumeRef = useRef(volume);
    volumeRef.current = volume;

    const volumeArthurRef = useRef(volumeArthur);
    volumeArthurRef.current = volumeArthur;

    const volumeDavidRef = useRef(volumeDavid);
    volumeDavidRef.current = volumeDavid;

    const volumeFxRef = useRef(volumeFx);
    volumeFxRef.current = volumeFx;

    const dynamicVolumeRef = useRef(dynamicVolume);
    dynamicVolumeRef.current = dynamicVolume;

    const isDuoEnabledRef = useRef(isDuoEnabled);
    isDuoEnabledRef.current = isDuoEnabled;

    const soundFxEnabledRef = useRef(soundFxEnabled);
    soundFxEnabledRef.current = soundFxEnabled;

    const pacingModeRef = useRef(pacingMode);
    pacingModeRef.current = pacingMode;

    const matchContextRef = useRef(matchContext);
    matchContextRef.current = matchContext;

    const lastBallKeyRef = useRef(null);
    const isInitialMountRef = useRef(true);
    const isSpeakingRef = useRef(isSpeaking);
    isSpeakingRef.current = isSpeaking;
    const deliveryTurnCountRef = useRef(0);
    const fillerTimerRef = useRef(null);
    const analystTimerRef = useRef(null);  // for filler co-commentator scheduling
    const queueDelayTimerRef = useRef(null); // for inter-queue item delays (must NOT be cleared by priority path)
    const keepAliveTimerRef = useRef(null);
    const priorityTransitionTimerRef = useRef(null);
    const isTransitioningRef = useRef(false);
    const activeUtteranceRef = useRef(null);
    const speechWatchdogTimerRef = useRef(null);
    // Speech queue: pending utterances to play sequentially
    const speechQueueRef = useRef([]);
    const isPlayingQueueRef = useRef(false);
    const speechTypeRef = useRef(speechType);
    speechTypeRef.current = speechType;

    // Batters & Milestones trackers
    const knownInningsBattersRef = useRef(new Set());
    const batterMilestonesRef = useRef({});
    const teamMilestonesRef = useRef({});
    const bowlerConsecutiveWicketsRef = useRef({});
    const bowlerMilestonesRef = useRef({});
    const currentOverRunsRef = useRef({ over: null, runs: 0, balls: 0 });

    // Anti-repetition rolling buffers for quiet moments voice commentary
    const recentFillerTextsRef = useRef([]);
    const recentFillerTypesRef = useRef([]);
    const inningsTrackerRef = useRef(matchContext?.activeInnings || 1);

    // Tracks last known bowler name and striker name to detect changes
    const lastBowlerNameRef = useRef(null);
    const lastStrikerNameRef = useRef(null);
    const lastWicketCountRef = useRef(null);
    const lastPowerplayActiveRef = useRef(null);
    const lastDeliveryTimestampRef = useRef(0);

    const voice1Ref = useRef(voice1);
    voice1Ref.current = voice1;

    const voice2Ref = useRef(voice2);
    voice2Ref.current = voice2;

    // Tracks if the last delivery was a no ball (to detect free hit next delivery)
    const lastBallWasNoBallRef = useRef(false);

    // Synchronize FX volume & enabled status
    useEffect(() => {
        emotionAudio.setEnabled(soundFxEnabled && !isMuted && isEnabled);
        emotionAudio.setVolume(volume * volumeFx);
    }, [soundFxEnabled, isMuted, isEnabled, volume, volumeFx]);

    // Discover and assign duo voices
    useEffect(() => {
        if (!isSupported) return;

        const updateVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
                setAvailableVoices(voices);

                const savedV1Name = localStorage.getItem(VOICE_ARTHUR_KEY);
                const savedV2Name = localStorage.getItem(VOICE_DAVID_KEY);

                const englishVoices = voices.filter(v => (v.lang || '').toLowerCase().startsWith('en'));
                const nonFemaleVoices = (englishVoices.length > 0 ? englishVoices : voices)
                    .filter(v => !FEMALE_VOICE_KEYWORDS.some(kw => v.name.toLowerCase().includes(kw)));
                const pool = nonFemaleVoices.length > 0 ? nonFemaleVoices : voices;

                // Assign Lead (Arthur): Default to top-rated UK Male cricket commentator voice
                let v1 = savedV1Name ? voices.find(v => v.name === savedV1Name) : null;
                if (!v1) {
                    const sortedForArthur = [...pool].sort((a, b) => scoreMaleCricketVoice(b, true) - scoreMaleCricketVoice(a, true));
                    v1 = sortedForArthur[0] || voices[0];
                }

                // Assign Analyst (David): Default to top-rated distinct male voice
                let v2 = savedV2Name ? voices.find(v => v.name === savedV2Name) : null;
                if (!v2) {
                    const sortedForDavid = [...pool]
                        .filter(v => v.name !== v1.name)
                        .sort((a, b) => scoreMaleCricketVoice(b, false) - scoreMaleCricketVoice(a, false));
                    v2 = sortedForDavid[0] || pool.find(v => v.name !== v1.name) || v1;
                }

                setVoice1(v1);
                setVoice2(v2);
            }
        };

        updateVoices();
        window.speechSynthesis.onvoiceschanged = updateVoices;
        const retry1 = setTimeout(updateVoices, 300);
        const retry2 = setTimeout(updateVoices, 1000);

        return () => {
            clearTimeout(retry1);
            clearTimeout(retry2);
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, [isSupported]);

    // Keep-alive workaround for Chrome speech synthesis pauses
    const startKeepAlive = useCallback(() => {
        if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
        keepAliveTimerRef.current = setInterval(() => {
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            } else {
                clearInterval(keepAliveTimerRef.current);
            }
        }, 10000);
    }, []);

    const stopKeepAlive = useCallback(() => {
        if (keepAliveTimerRef.current) {
            clearInterval(keepAliveTimerRef.current);
            keepAliveTimerRef.current = null;
        }
    }, []);

    // Stop speaking & clear queued fillers
    const stopSpeaking = useCallback(() => {
        if (fillerTimerRef.current) {
            clearTimeout(fillerTimerRef.current);
            fillerTimerRef.current = null;
        }
        if (analystTimerRef.current) {
            clearTimeout(analystTimerRef.current);
            analystTimerRef.current = null;
        }
        if (queueDelayTimerRef.current) {
            clearTimeout(queueDelayTimerRef.current);
            queueDelayTimerRef.current = null;
        }
        if (priorityTransitionTimerRef.current) {
            clearTimeout(priorityTransitionTimerRef.current);
            priorityTransitionTimerRef.current = null;
        }
        if (speechWatchdogTimerRef.current) {
            clearTimeout(speechWatchdogTimerRef.current);
            speechWatchdogTimerRef.current = null;
        }
        speechQueueRef.current = [];
        isPlayingQueueRef.current = false;
        if (activeUtteranceRef.current) {
            activeUtteranceRef.current.onend = null;
            activeUtteranceRef.current.onerror = null;
            activeUtteranceRef.current.onstart = null;
        }
        activeUtteranceRef.current = null;
        isSpeakingRef.current = false;
        isTransitioningRef.current = false;
        stopKeepAlive();
        if (isSupported && typeof window !== 'undefined') {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {}
        }
        setIsSpeaking(false);
        setActiveSpeaker(null);
        setCurrentEmotion(null);
        setSpeechType('idle');
        speechTypeRef.current = 'idle';
        setCurrentSpokenText('');
    }, [isSupported, stopKeepAlive]);

    // Play emotion sound effect based on tag with audio ducking and dynamic boost
    const triggerEmotionFx = useCallback((emotion) => {
        if (!soundFxEnabledRef.current || !isEnabledRef.current || isMutedRef.current) return;
        if (!emotion || emotion === 'none' || emotion === 'neutral') return;

        const isSpecial = emotion === 'celebration' || emotion === 'milestone' || emotion === 'hat_trick';
        if (isSpecial) {
            emotionAudio.setVolume(Math.min(1.0, volumeRef.current * volumeFxRef.current * 1.35));
        }

        switch (emotion) {
            case 'bat_crack':
                emotionAudio.playBatCrack();
                break;
            case 'roar':
                emotionAudio.playBatCrack();
                setTimeout(() => emotionAudio.playCrowdRoar(), 100);
                break;
            case 'celebration':
            case 'milestone':
            case 'hat_trick':
                emotionAudio.playCelebrationCheer();
                break;
            case 'maiden':
                emotionAudio.playMaidenApplause();
                break;
            case 'surprise':
                emotionAudio.playSurpriseGasp();
                break;
            case 'laughter':
                emotionAudio.playLaughterChuckle();
                break;
            case 'sad':
                emotionAudio.playSadSigh();
                break;
            default:
                break;
        }
    }, []);

    // Speak single utterance with specific commentator persona and dynamic real-world volume
    const speakCommentator = useCallback(({
        speaker = 'Arthur',
        text = '',
        emotion = 'neutral',
        type = 'ball',
        onDone
    }) => {
        if (!isSupported || !isEnabledRef.current || isMutedRef.current || !text) {
            if (onDone && isEnabledRef.current && !isMutedRef.current) onDone();
            return;
        }

        // ── Text pre-processing for natural TTS quality ──────────────────────────
        // Cleanse any null, undefined, NaN, or raw variable placeholders so TTS never speaks them!
        const cleanText = text
            .replace(/\b(null|undefined|NaN)\b/gi, '')
            .replace(/\b0\.00?\b/g, '')
            .replace(/\b(towards\s+null|towards\s+undefined)\b/gi, '')
            .replace(/by\s+(null|undefined)/gi, 'in the field')
            .replace(/\{[a-zA-Z0-9_]+\}/g, '')
            .replace(/\s*\((?:c|wk|c\s*&?\s*wk|sub|rhb|lhb|\d+)\)/gi, '') // strip roles like (c), (wk)
            .replace(/[*#]/g, '')                                         // strip asterisks, numbers
            .replace(/([A-Za-z])\.(?=[A-Za-z]|\s|$)/g, '$1 ')            // turn dotted initials like P.K. into P K for clear spelling
            .replace(/\b[A-Z]{3,}\b/g, (match) => match.charAt(0) + match.slice(1).toLowerCase())
            .replace(/—/g, ', ')        // em-dash → comma pause (better TTS rhythm)
            .replace(/\.{3}/g, '.')       // ellipsis → full stop (avoid dragged-out pauses)
            .replace(/!{2,}/g, '.')       // multiple exclamation → period (prevent shouting)
            .replace(/\s+/g, ' ')         // collapse any double spaces
            .trim();

        if (!cleanText) {
            if (onDone && isEnabledRef.current && !isMutedRef.current) onDone();
            return;
        }

        // Trigger emotional sound effect AFTER speech starts (150ms delay avoids
        // Web Audio API / SpeechSynthesis init conflict that causes crashes)
        const utterance = new SpeechSynthesisUtterance(cleanText);
        activeUtteranceRef.current = utterance;
        if (typeof window !== 'undefined') {
            window.__activeVoiceUtterance = utterance;
        }

        const clearWatchdog = () => {
            if (speechWatchdogTimerRef.current) {
                clearTimeout(speechWatchdogTimerRef.current);
                speechWatchdogTimerRef.current = null;
            }
        };

        // Safety watchdog: Max 12s per utterance to prevent stuck SpeechSynthesis state
        clearWatchdog();
        speechWatchdogTimerRef.current = setTimeout(() => {
            if (isSpeakingRef.current) {
                console.warn('[VoiceCommentary] Utterance watchdog timeout — resetting speech state');
                activeUtteranceRef.current = null;
                isSpeakingRef.current = false;
                setIsSpeaking(false);
                setActiveSpeaker(null);
                setCurrentEmotion(null);
                setSpeechType('idle');
                speechTypeRef.current = 'idle';
                stopKeepAlive();
                if (!isTransitioningRef.current && isEnabledRef.current && !isMutedRef.current && onDone) {
                    onDone();
                }
            }
        }, 12000);

        const isDavid = speaker === 'David';
        const chosenVoice = isDavid ? voice2Ref.current : voice1Ref.current;

        if (chosenVoice) {
            utterance.voice = chosenVoice;
        }

        // ── Persona & Outcome-Driven Broadcast Speech Modulation ────────────
        // Add random pitch and pace differences on 4s, 6s, OUTs & Milestones
        const randomPitchDelta = (Math.random() * 0.08) - 0.04;
        const randomRateDelta = (Math.random() * 0.06) - 0.03;
        const isSpecialMoment = emotion === 'celebration' || emotion === 'milestone' || emotion === 'hat_trick' || emotion === 'roar';

        if (isDavid) {
            utterance.rate = 0.86 + randomRateDelta;
            utterance.pitch = (chosenVoice === voice1Ref.current ? 0.82 : 0.85) + randomPitchDelta;
            if (isSpecialMoment) {
                utterance.rate = 0.95 + (Math.random() * 0.05);
                utterance.pitch = 0.96 + (Math.random() * 0.06);
            } else if (emotion === 'bat_crack') {
                utterance.rate = 0.92 + (Math.random() * 0.04);
                utterance.pitch = 0.90 + (Math.random() * 0.06);
            } else if (emotion === 'surprise') {
                utterance.rate = 0.90 + (Math.random() * 0.05);
                utterance.pitch = 0.93 + (Math.random() * 0.07);
            }
        } else {
            // Arthur (Lead Commentator)
            if (isSpecialMoment) {
                // Maximum 6s, 50s, 100s, Hat-tricks & dramatic game moments: Elevated energy & pitch!
                utterance.rate = 1.04 + (Math.random() * 0.06);
                utterance.pitch = 1.08 + (Math.random() * 0.08);
            } else if (emotion === 'bat_crack') {
                // Four boundaries
                utterance.rate = 0.95 + (Math.random() * 0.06);
                utterance.pitch = 0.95 + (Math.random() * 0.07);
            } else if (emotion === 'surprise') {
                // Wickets / shock breakthroughs
                utterance.rate = 0.96 + (Math.random() * 0.08);
                utterance.pitch = 1.03 + (Math.random() * 0.09);
            } else {
                // Measured ball call or filler
                utterance.rate = type === 'ball' ? (0.91 + randomRateDelta) : (type === 'analyst' ? 0.88 : 0.86);
                utterance.pitch = 0.90 + randomPitchDelta;
            }
        }

        // Real-World Broadcast Dynamic Volume Modulation:
        // 1. Base master volume & individual mic levels
        let calculatedVolume = volumeRef.current * (isDavid ? volumeDavidRef.current : volumeArthurRef.current);

        // 2. Real-World Intensity Modulation (louder for boundaries & special moments, calmer for dot balls)
        if (dynamicVolumeRef.current) {
            if (isSpecialMoment) {
                // Peak broadcast volume on 50s, 100s, Hat-tricks & maximum moments
                calculatedVolume = 1.0;
            } else if (type === 'ball') {
                if (emotion === 'bat_crack') {
                    calculatedVolume = Math.min(1.0, calculatedVolume * 1.15);
                } else if (emotion === 'surprise') {
                    calculatedVolume = Math.min(1.0, calculatedVolume * 1.10);
                } else if (emotion === 'neutral' || emotion === 'none') {
                    calculatedVolume = calculatedVolume * 0.74;
                }
            } else if (type === 'analyst') {
                calculatedVolume = calculatedVolume * 0.88;
            } else if (type === 'filler') {
                calculatedVolume = calculatedVolume * 0.78;
            }
        }

        utterance.volume = Math.max(0.01, Math.min(1.0, calculatedVolume));

        utterance.onstart = () => {
            isSpeakingRef.current = true;
            setIsSpeaking(true);
            setActiveSpeaker(speaker);
            setCurrentEmotion(emotion);
            setSpeechType(type);
            speechTypeRef.current = type;
            setCurrentSpokenText(cleanText);
            startKeepAlive();

            // Trigger FX 150 ms after speech starts to avoid audio-context conflicts
            setTimeout(() => triggerEmotionFx(emotion), 150);

            // Append to live dialogue feed (keep last 6 entries)
            setDialogueFeed(prev => [
                {
                    id: Date.now() + Math.random(),
                    speaker,
                    role: isDavid ? 'Expert Analyst' : 'Lead Commentator',
                    text: cleanText,
                    emotion,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                },
                ...prev.slice(0, 5)
            ]);
        };

        utterance.onend = () => {
            clearWatchdog();
            activeUtteranceRef.current = null;
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            setActiveSpeaker(null);
            setCurrentEmotion(null);
            setSpeechType('idle');
            speechTypeRef.current = 'idle';
            stopKeepAlive();
            // Strictly guard onDone so callback never runs if user disabled or muted voice commentary!
            if (!isTransitioningRef.current && isEnabledRef.current && !isMutedRef.current && onDone) {
                onDone();
            }
        };

        utterance.onerror = (e) => {
            clearWatchdog();
            activeUtteranceRef.current = null;
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
                console.warn('SpeechSynthesis error:', e.error);
            }
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            setActiveSpeaker(null);
            setCurrentEmotion(null);
            setSpeechType('idle');
            speechTypeRef.current = 'idle';
            stopKeepAlive();
            // Do NOT trigger onDone completion callback if utterance was canceled, interrupted, or commentary disabled!
            if (!isTransitioningRef.current && isEnabledRef.current && !isMutedRef.current && e.error !== 'canceled' && e.error !== 'interrupted' && onDone) {
                onDone();
            }
        };

        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
    }, [isSupported, triggerEmotionFx, startKeepAlive, stopKeepAlive]);

    const playNextInQueueRef = useRef(null);

    // Schedule natural inter-ball silence & occasional commentary
    // Respects USER REQUEST: "Every silent moments no need speech about stats. Give some time to stay also"
    const scheduleOccasionalFiller = useCallback((customDelay = null) => {
        if (fillerTimerRef.current) {
            clearTimeout(fillerTimerRef.current);
            fillerTimerRef.current = null;
        }

        // Strictly verify commentary is enabled and not muted before scheduling ANY filler!
        if (!isEnabledRef.current || isMutedRef.current) {
            return;
        }

        // If user selected 'balls_only', 100% silence between deliveries!
        if (pacingModeRef.current === 'balls_only') {
            return;
        }

        // Realistic natural pauses: 12 to 22 seconds of stadium quiet (or customDelay for prompt starts)
        const silenceDelay = customDelay !== null
            ? customDelay
            : (pacingModeRef.current === 'relaxed'
                ? Math.floor(Math.random() * 8000) + 12000 // 12 - 20 seconds silence
                : Math.floor(Math.random() * 5000) + 8000); // 8 - 13 seconds silence

        fillerTimerRef.current = setTimeout(() => {
            if (!isEnabledRef.current || isMutedRef.current) return;
            // Never start a quiet moment filler if speech or queue is currently active!
            if (isSpeakingRef.current || isPlayingQueueRef.current || speechQueueRef.current.length > 0 || (typeof window !== 'undefined' && window.speechSynthesis?.speaking)) {
                scheduleOccasionalFiller(5000);
                return;
            }

            const ctx = matchContextRef.current;
            const status = String(ctx?.matchStatus || '').toLowerCase();
            if (status.includes('concluded') || status.includes('completed') || status.includes('abandoned')) {
                return;
            }

            // In 'relaxed' mode, 70% probability to STAY SILENT (unless customDelay was explicitly requested)
            const silenceProbability = customDelay !== null
                ? 0.0
                : (pacingModeRef.current === 'relaxed' ? 0.70 : 0.45);
            const duoFiller = getOccasionalDuoFiller(ctx, silenceProbability, recentFillerTextsRef.current, recentFillerTypesRef.current);

            if (!duoFiller) {
                // Stayed silent! Give another healthy pause before even considering speaking again
                scheduleOccasionalFiller();
                return;
            }

            // Record spoken filler to rolling buffers to prevent repeating same sentence in near times
            recentFillerTextsRef.current = [...recentFillerTextsRef.current, duoFiller.text].slice(-50);
            if (duoFiller.type) {
                recentFillerTypesRef.current = [...recentFillerTypesRef.current, duoFiller.type].slice(-8);
            }

            // Speak occasional conversational remark
            speakCommentator({
                speaker: isDuoEnabledRef.current ? duoFiller.speaker : 'Arthur',
                text: duoFiller.text,
                emotion: duoFiller.emotion,
                type: 'filler',
                onDone: () => {
                    if (!isEnabledRef.current || isMutedRef.current) return;
                    // Check if queued speech arrived during filler!
                    if (speechQueueRef.current.length > 0 && playNextInQueueRef.current) {
                        playNextInQueueRef.current();
                        return;
                    }

                    // Co-commentator follow-up reaction if available (ensure it does NOT repeat lead utterance)
                    const followText = duoFiller.coFollowup?.text;
                    const leadClean = String(duoFiller.text).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                    const followClean = String(followText || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                    const isDuplicate = !followClean || leadClean === followClean || (followClean.length > 20 && leadClean.includes(followClean.slice(0, 20))) || recentFillerTextsRef.current.some(r => {
                        const rC = String(r).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                        return rC === followClean || (followClean.length > 20 && rC.includes(followClean.slice(0, 20)));
                    });

                    if (isDuoEnabledRef.current && duoFiller.coFollowup && !isDuplicate) {
                        // Record follow-up into recent filler texts buffer as well!
                        recentFillerTextsRef.current = [...recentFillerTextsRef.current, followText].slice(-50);
                        if (analystTimerRef.current) clearTimeout(analystTimerRef.current);
                        analystTimerRef.current = setTimeout(() => {
                            if (!isEnabledRef.current || isMutedRef.current) return;
                            if (speechQueueRef.current.length > 0 && playNextInQueueRef.current) {
                                playNextInQueueRef.current();
                                return;
                            }
                            speakCommentator({
                                speaker: duoFiller.speaker === 'Arthur' ? 'David' : 'Arthur',
                                text: followText,
                                emotion: duoFiller.coFollowup.emotion || 'neutral',
                                type: 'analyst',
                                onDone: () => {
                                    if (!isEnabledRef.current || isMutedRef.current) return;
                                    if (speechQueueRef.current.length > 0 && playNextInQueueRef.current) {
                                        playNextInQueueRef.current();
                                    } else {
                                        scheduleOccasionalFiller();
                                    }
                                }
                            });
                        }, 500);
                    } else {
                        scheduleOccasionalFiller();
                    }
                }
            });
        }, silenceDelay);
    }, [speakCommentator]);

    // Unified Speech Queue Player: Plays pending items in sequence
    const playNextInQueue = useCallback(() => {
        if (!isEnabledRef.current || isMutedRef.current || !isSupported) {
            speechQueueRef.current = [];
            isPlayingQueueRef.current = false;
            return;
        }

        if (speechQueueRef.current.length === 0) {
            isPlayingQueueRef.current = false;
            scheduleOccasionalFiller();
            return;
        }

        isPlayingQueueRef.current = true;
        const item = speechQueueRef.current.shift();

        const execute = () => {
            speakCommentator({
                speaker: item.speaker,
                text: item.text,
                emotion: item.emotion || 'neutral',
                type: item.type || 'ball',
                onDone: () => {
                    if (speechQueueRef.current.length > 0) {
                        const nextItem = speechQueueRef.current[0];
                        const nextDelay = nextItem?.delay ?? 350;
                        if (nextDelay > 0) {
                            queueDelayTimerRef.current = setTimeout(() => {
                                playNextInQueue();
                            }, nextDelay);
                        } else {
                            playNextInQueue();
                        }
                    } else {
                        isPlayingQueueRef.current = false;
                        scheduleOccasionalFiller();
                    }
                }
            });
        };

        if (item.delay && item.delay > 0) {
            queueDelayTimerRef.current = setTimeout(execute, item.delay);
        } else {
            execute();
        }
    }, [isSupported, speakCommentator, scheduleOccasionalFiller]);

    playNextInQueueRef.current = playNextInQueue;

    // Enqueue a sequence of utterances with intelligent broadcast priority & smooth shifting
    const enqueueSequence = useCallback((items, { interruptFiller = true, priority = false, interruptAll = false } = {}) => {
        if (!items || items.length === 0) return;
        if (!isEnabledRef.current || isMutedRef.current) return;

        // Clear any pending filler timers so filler doesn't fire while commentary is active
        if (priority || interruptAll || interruptFiller) {
            if (fillerTimerRef.current) {
                clearTimeout(fillerTimerRef.current);
                fillerTimerRef.current = null;
            }
            if (analystTimerRef.current) {
                clearTimeout(analystTimerRef.current);
                analystTimerRef.current = null;
            }
        }

        if (priority) {
            // ── HIGH PRIORITY: Live Scoring Commentary Available ──────────────────
            // 1. Immediately drop any low-priority / filler chat waiting in queue
            speechQueueRef.current = speechQueueRef.current.filter(item => item.type === 'ball' || item.type === 'analyst');

            const currentType = speechTypeRef.current;
            const isCurrentlySpeaking = isSpeakingRef.current || (isSupported && window.speechSynthesis.speaking);

            // Case A: Filler / general chatter OR previous analyst remark is currently ongoing
            // Smoothly shift over to the live scoring action!
            if (isCurrentlySpeaking && (currentType === 'filler' || currentType === 'analyst')) {
                // Clear any intermediate delay timer
                if (queueDelayTimerRef.current) {
                    clearTimeout(queueDelayTimerRef.current);
                    queueDelayTimerRef.current = null;
                }

                // Stage the new scoring commentary at the front
                speechQueueRef.current = [...items];

                // Smoothly interrupt non-scoring speech cleanly
                isTransitioningRef.current = true;
                if (isSupported) {
                    try {
                        window.speechSynthesis.cancel();
                    } catch (e) {}
                }

                // Micro-delay (50ms) to allow browser audio engine to settle smoothly
                if (priorityTransitionTimerRef.current) clearTimeout(priorityTransitionTimerRef.current);
                priorityTransitionTimerRef.current = setTimeout(() => {
                    isTransitioningRef.current = false;
                    isPlayingQueueRef.current = false;
                    isSpeakingRef.current = false;
                    if (isSupported && window.speechSynthesis.paused) {
                        window.speechSynthesis.resume();
                    }
                    playNextInQueue();
                }, 50);

                return;
            }

            // Case B: Another ball commentary sentence is already speaking
            // Let the current delivery finish its brief sentence cleanly without chopping words mid-breath,
            // and shift smoothly into this new scoring delivery directly next!
            if (isCurrentlySpeaking || isPlayingQueueRef.current) {
                // Replace any stale pending queue items with this latest scoring sequence
                speechQueueRef.current = [...items];
                return;
            }

            // Case C: Idle — start immediately!
            speechQueueRef.current = [...items];
            playNextInQueue();
            return;
        }

        // Standard non-priority queuing (e.g. idle filler remarks)
        if (isPlayingQueueRef.current || isSpeakingRef.current || (isSupported && window.speechSynthesis.speaking)) {
            speechQueueRef.current.push(...items);
            return;
        }

        speechQueueRef.current = [...items];
        playNextInQueue();
    }, [isSupported, playNextInQueue]);

    // React to innings change (e.g. 1st innings to 2nd innings chase)
    const prevInningsRef = useRef(matchContext?.activeInnings || 1);
    const lastAnnouncedInningsRef = useRef(1);

    useEffect(() => {
        const currentInnings = matchContext?.activeInnings;
        if (!isEnabledRef.current || isMutedRef.current) return;

        if (currentInnings && prevInningsRef.current && currentInnings !== prevInningsRef.current) {
            prevInningsRef.current = currentInnings;
            inningsTrackerRef.current = currentInnings;
            knownInningsBattersRef.current = new Set();
            batterMilestonesRef.current = {};
            teamMilestonesRef.current = {};
            bowlerConsecutiveWicketsRef.current = {};
            bowlerMilestonesRef.current = {};
            currentOverRunsRef.current = { over: null, runs: 0, balls: 0 };

            if (lastAnnouncedInningsRef.current !== currentInnings) {
                lastAnnouncedInningsRef.current = currentInnings;
                const ctx = matchContextRef.current;
                const ann = generateInningsChangeAnnouncement({
                    firstInningsRuns: ctx?.firstInningsScore ?? ctx?.runs ?? 0,
                    firstInningsWickets: ctx?.firstInningsWickets ?? ctx?.wickets ?? 0,
                    target: ctx?.target,
                    battingTeam: ctx?.firstInningsTeam || ctx?.bowlingTeam || 'The 1st innings side',
                    chasingTeam: ctx?.secondInningsTeam || ctx?.battingTeam || 'The chasing side',
                    overLimit: ctx?.overLimit || 20
                });

                enqueueSequence([
                    { speaker: 'Arthur', text: ann.lead, emotion: 'neutral', type: 'ball', delay: 800 },
                    ...(isDuoEnabledRef.current && ann.analyst ? [{
                        speaker: 'David', text: ann.analyst, emotion: 'neutral', type: 'analyst', delay: 500
                    }] : [])
                ], { interruptFiller: true });
            }
        } else if (currentInnings) {
            prevInningsRef.current = currentInnings;
        }
    }, [matchContext?.activeInnings, enqueueSequence]);

    // ─── Match Victory & Concluded Announcement ─────────────────────────────
    const victoryAnnouncedRef = useRef(false);
    useEffect(() => {
        if (!isEnabledRef.current || isMutedRef.current || victoryAnnouncedRef.current) return;

        const isFinished = Boolean(matchContext?.finished);
        const result = (matchContext?.result || '').trim();
        const winner = (matchContext?.winner || '').trim();

        if (isFinished) {
            victoryAnnouncedRef.current = true;
            const ctx = matchContextRef.current;
            const victory = generateMatchVictoryAnnouncement({ result, winner, ...ctx });

            enqueueSequence([
                { speaker: 'Arthur', text: victory.lead, emotion: 'celebration', type: 'ball', delay: 600 },
                ...(isDuoEnabledRef.current && victory.analyst ? [{
                    speaker: 'David', text: victory.analyst, emotion: 'celebration', type: 'analyst', delay: 450
                }] : [])
            ], { interruptFiller: true });
        }
    }, [matchContext?.finished, matchContext?.result, matchContext?.winner, enqueueSequence]);

    // ─── Powerplay Announcement ─────────────────────────────────────────────
    const powerplayAnnouncedRef = useRef(false);
    useEffect(() => {
        if (!isEnabledRef.current || isMutedRef.current || powerplayAnnouncedRef.current) return;

        const isPowerplay = Boolean(matchContext?.powerplay?.active || matchContext?.powerplay?.isActive);
        const currentOvers = Number(matchContext?.overs || 0);

        if ((isPowerplay || currentOvers === 0) && currentOvers < 1 && matchContext?.matchStatus !== 'scheduled') {
            powerplayAnnouncedRef.current = true;
            const ppText = generatePowerplayAnnouncement();
            enqueueSequence([{
                speaker: 'Arthur', text: ppText, emotion: 'neutral', type: 'filler', delay: 1500
            }], { interruptFiller: true });
        }
    }, [matchContext?.powerplay, matchContext?.overs, matchContext?.matchStatus, enqueueSequence]);

    // ─── DLS Method Announcement ────────────────────────────────────────────
    const dlsAnnouncedRef = useRef(false);
    useEffect(() => {
        if (!isEnabledRef.current || isMutedRef.current || dlsAnnouncedRef.current) return;

        const dlsData = matchContext?.dls;
        const isDls = Boolean(dlsData?.isApplied);
        if (isDls) {
            dlsAnnouncedRef.current = true;
            const dlsText = generateDlsAnnouncement(dlsData);
            enqueueSequence([{
                speaker: 'Arthur', text: dlsText, emotion: 'surprise', type: 'filler', delay: 1000
            }], { interruptFiller: true });
        }
    }, [matchContext?.dls, enqueueSequence]);

    // ─── Detect New Batsman Arrival Between Deliveries ───────────────────────
    // Scorer assigns the new batter in the dashboard during the wicket interval.
    // This effect ensures their name is announced and queued even before the next ball is bowled!
    useEffect(() => {
        if (!isEnabledRef.current || isMutedRef.current) return;
        const ctx = matchContextRef.current;
        if (!ctx) return;

        const checkAndAnnounceNewBatter = (batterObj) => {
            const rawName = batterObj?.name;
            if (!rawName || isPlaceholderName(rawName)) return;
            if (batterObj?.id == null || batterObj?.isPending || /select|incoming|waiting/i.test(String(rawName))) return;
            const cleanName = rawName.trim();
            const key = cleanName.toLowerCase();

            if (!knownInningsBattersRef.current.has(key)) {
                knownInningsBattersRef.current.add(key);
                // Don't announce if match hasn't started (overs 0 and wickets 0)
                if (Number(ctx.overs || 0) === 0 && Number(ctx.wickets || 0) === 0) return;

                const arrivalText = generateNewBatterArrival(
                    cleanName,
                    ctx.wickets ?? 0,
                    ctx.runs ?? 0,
                    ctx.overs ?? 0,
                    ctx.overLimit ?? 20,
                    batterObj?.hand || batterObj?.battingStyle || ctx?.strikerHand,
                    ctx?.bowler?.bowlingStyle || ctx?.bowlerType || ctx?.bowler?.bowlingType
                );
                if (arrivalText) {
                    enqueueSequence([{
                        speaker: 'Arthur',
                        text: arrivalText,
                        emotion: 'neutral',
                        type: 'ball',
                        delay: 600
                    }], { interruptFiller: true });
                }
            }
        };

        checkAndAnnounceNewBatter(ctx.striker);
        checkAndAnnounceNewBatter(ctx.nonStriker);
    }, [matchContext?.striker?.name, matchContext?.striker?.id, matchContext?.nonStriker?.name, matchContext?.nonStriker?.id, matchContext?.wickets, enqueueSequence]);

    // ─── Detect New Bowler Coming Into Attack Between Deliveries ─────────────
    // When the scorer assigns or changes the bowler before or during an over,
    // this effect ensures the incoming bowler is announced immediately with their bowling style!
    useEffect(() => {
        if (!isEnabledRef.current || isMutedRef.current) return;
        const ctx = matchContextRef.current;
        if (!ctx) return;

        const rawBowler = ctx?.bowler?.name;
        if (!rawBowler || isPlaceholderName(rawBowler)) return;
        const cleanName = cleanPlayerNameForSpeech(rawBowler);
        const key = cleanName.toLowerCase();

        if (lastBowlerNameRef.current === null) {
            lastBowlerNameRef.current = key;
            return;
        }

        if (lastBowlerNameRef.current !== key) {
            lastBowlerNameRef.current = key;
            const bowlerType = ctx?.bowler?.bowlingStyle || ctx?.bowlerType || ctx?.bowler?.bowlingType || '';
            const strikerName = ctx?.striker?.name || ctx?.strikerName || '';
            const strikerHand = ctx?.striker?.hand || ctx?.striker?.battingStyle || ctx?.strikerHand || '';
            const overNum = ctx?.overs != null ? Math.floor(Number(ctx.overs)) + 1 : null;
            const bowlerIntro = generateNewBowlerIntro(cleanName, bowlerType, strikerName, strikerHand, overNum);
            if (bowlerIntro) {
                enqueueSequence([{
                    speaker: 'Arthur',
                    text: bowlerIntro,
                    emotion: 'neutral',
                    type: 'ball',
                    delay: 500
                }], { interruptFiller: true });
            }
        }
    }, [matchContext?.bowler?.name, matchContext?.bowler?.id, matchContext?.bowler?.bowlingStyle, enqueueSequence]);

    // ─── Detect Powerplay Activation & Deactivation (Voice Commentary) ───────
    useEffect(() => {
        if (!isEnabledRef.current || isMutedRef.current) return;
        const ctx = matchContextRef.current;
        if (!ctx) return;

        const pp = ctx?.powerplay;
        const isPpActive = Boolean(pp?.active || pp?.isActive || ctx?.isPowerplay);
        const overs = pp?.overs || '';

        if (lastPowerplayActiveRef.current === null) {
            lastPowerplayActiveRef.current = isPpActive;
            return;
        }

        if (isPpActive !== lastPowerplayActiveRef.current) {
            lastPowerplayActiveRef.current = isPpActive;
            const announcement = isPpActive
                ? generatePowerplayAnnouncement(overs)
                : generatePowerplayEndedAnnouncement(overs);

            if (announcement) {
                enqueueSequence([{
                    speaker: 'David',
                    text: announcement,
                    emotion: isPpActive ? 'roar' : 'neutral',
                    type: 'ball',
                    delay: 550
                }], { interruptFiller: true });
            }
        }
    }, [matchContext?.powerplay?.active, matchContext?.powerplay?.isActive, matchContext?.isPowerplay, matchContext?.powerplay?.overs, enqueueSequence]);

    // ─── React to new ball delivery ─────────────────────────────────────────
    useEffect(() => {
        if (!latestDelivery) {
            // When commentary is empty (e.g. at match start or if balls were undone),
            // rewind the delivery tracking pointers so subsequent deliveries are announced immediately.
            lastBallKeyRef.current = null;
            lastDeliveryTimestampRef.current = 0;
            return;
        }

        const ballKey = latestDelivery._id ||
            latestDelivery.id ||
            latestDelivery.timestamp ||
            `${latestDelivery.over || '0.0'}_${latestDelivery.runs}_${latestDelivery.isWicket ? 'w' : 'r'}`;

        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            lastBallKeyRef.current = ballKey;
            lastDeliveryTimestampRef.current = Number(latestDelivery.timestamp || latestDelivery._id || latestDelivery.id || 0);
            // Seed initial tracker values without triggering commentary
            const ctx = matchContextRef.current;
            lastBowlerNameRef.current = ctx?.bowler?.name || null;
            lastStrikerNameRef.current = ctx?.striker?.name || null;
            lastWicketCountRef.current = ctx?.wickets ?? null;
            if (ctx?.striker?.name && !isPlaceholderName(ctx.striker.name)) {
                knownInningsBattersRef.current.add(ctx.striker.name.trim().toLowerCase());
                batterMilestonesRef.current[ctx.striker.name.trim()] = {
                    reached50: Number(ctx.striker.runs || 0) >= 50,
                    reached100: Number(ctx.striker.runs || 0) >= 100
                };
            }
            if (ctx?.nonStriker?.name && !isPlaceholderName(ctx.nonStriker.name)) {
                knownInningsBattersRef.current.add(ctx.nonStriker.name.trim().toLowerCase());
                batterMilestonesRef.current[ctx.nonStriker.name.trim()] = {
                    reached50: Number(ctx.nonStriker.runs || 0) >= 50,
                    reached100: Number(ctx.nonStriker.runs || 0) >= 100
                };
            }
            if (ctx?.bowler?.name && !isPlaceholderName(ctx.bowler.name)) {
                bowlerMilestonesRef.current[ctx.bowler.name.trim()] = {
                    reached3w: Number(ctx.bowler.wickets || 0) >= 3,
                    reached5w: Number(ctx.bowler.wickets || 0) >= 5
                };
            }
            const initialRuns = Number(ctx?.runs || 0);
            [50, 100, 150, 200, 250, 300, 350, 400].forEach(m => {
                if (initialRuns >= m) teamMilestonesRef.current[m] = true;
            });
            return;
        }

        // New ball has arrived or delivery state shifted!
        if (ballKey !== lastBallKeyRef.current) {
            const currentDeliveryTs = Number(latestDelivery.timestamp || latestDelivery._id || latestDelivery.id || 0);
            const ctx = matchContextRef.current;

            // Detect if this update was triggered by an undo (timestamp shifted backward)
            const isDeliveryRewound = lastDeliveryTimestampRef.current > 0 && currentDeliveryTs < lastDeliveryTimestampRef.current;

            if (isDeliveryRewound) {
                // When an undo occurs, rewind tracking pointers to the previous delivery.
                // Keep the ball-by-ball voice commentary process running continuously and smoothly without stopping!
                lastBallKeyRef.current = ballKey;
                lastDeliveryTimestampRef.current = currentDeliveryTs;
                const curBowler = (ctx?.bowler?.name || latestDelivery.bowler || '').trim();
                if (curBowler && bowlerConsecutiveWicketsRef.current[curBowler]) {
                    bowlerConsecutiveWicketsRef.current[curBowler] = 0;
                }
                return;
            }

            lastBallKeyRef.current = ballKey;
            lastDeliveryTimestampRef.current = Math.max(lastDeliveryTimestampRef.current, currentDeliveryTs);

            if (!isEnabledRef.current || isMutedRef.current) return;

            const isWicket = Boolean(latestDelivery.isWicket);
            const currentWickets = ctx?.wickets ?? null;
            const currentBowlerName = (ctx?.bowler?.name || latestDelivery.bowler || '').trim();
            const currentStrikerName = (ctx?.striker?.name || latestDelivery.batsman || '').trim();

            // Detect free hit: current ball is a free hit if the previous delivery was a no ball
            const currentIsNoBall = Boolean(latestDelivery.isExtra) &&
                (latestDelivery.extraType || '').toLowerCase().includes('no ball');
            const isFreeHitBall = lastBallWasNoBallRef.current && !currentIsNoBall;
            lastBallWasNoBallRef.current = currentIsNoBall;

            // ── Build the speech sequence for this delivery ──────────────────
            const sequence = [];

            // 1. Primary ball commentary
            let leadSpeaker = 'Arthur';
            let analystSpeaker = 'David';

            if (latestDelivery.voiceText) {
                // Synchronized path: text came from RTDB
                leadSpeaker = latestDelivery.voiceSpeaker || 'Arthur';
                analystSpeaker = leadSpeaker === 'David' ? 'Arthur' : 'David';

                sequence.push({
                    speaker: leadSpeaker,
                    text: latestDelivery.voiceText,
                    emotion: latestDelivery.voiceEmotion || 'neutral',
                    type: 'ball'
                });

                if (isDuoEnabledRef.current && latestDelivery.analystText) {
                    sequence.push({
                        speaker: analystSpeaker,
                        text: latestDelivery.analystText,
                        emotion: latestDelivery.analystEmotion || 'none',
                        type: 'analyst',
                        delay: 450
                    });
                }
            } else {
                // Fallback path: local random generation
                if (isDuoEnabledRef.current) {
                    const overNum = latestDelivery.over != null ? Math.floor(parseFloat(latestDelivery.over)) : null;
                    if (overNum !== null && !isNaN(overNum)) {
                        leadSpeaker = overNum % 2 === 0 ? 'Arthur' : 'David';
                    } else {
                        leadSpeaker = deliveryTurnCountRef.current % 2 === 0 ? 'Arthur' : 'David';
                    }
                    deliveryTurnCountRef.current += 1;
                    analystSpeaker = leadSpeaker === 'Arthur' ? 'David' : 'Arthur';
                }

                const duo = generateDuoBallCommentary(
                    latestDelivery,
                    ctx,
                    leadSpeaker,
                    false
                );

                if (duo) {
                    sequence.push({ speaker: duo.lead.speaker, text: duo.lead.text, emotion: duo.lead.emotion, type: 'ball' });
                    if (isDuoEnabledRef.current && duo.analyst) {
                        sequence.push({ speaker: duo.analyst.speaker, text: duo.analyst.text, emotion: duo.analyst.emotion, type: 'analyst', delay: 450 });
                    }
                }
            }

            // 2. Batter 50 & 100 Runs Milestones Check
            const strikerObj = ctx?.striker;
            const strikerScore = Number(latestDelivery.batsmanRuns ?? strikerObj?.runs ?? 0);
            const strikerBalls = Number(latestDelivery.batsmanBalls ?? strikerObj?.balls ?? 0);
            const cleanStriker = currentStrikerName || 'The batter';

            if (cleanStriker && !isPlaceholderName(cleanStriker)) {
                if (!batterMilestonesRef.current[cleanStriker]) {
                    batterMilestonesRef.current[cleanStriker] = { reached50: false, reached100: false };
                }

                // 100 Runs Century Milestone
                if (strikerScore >= 100 && !batterMilestonesRef.current[cleanStriker].reached100) {
                    batterMilestonesRef.current[cleanStriker].reached100 = true;
                    batterMilestonesRef.current[cleanStriker].reached50 = true;
                    const century = generateCenturyMilestoneAnnouncement(cleanStriker, strikerScore, strikerBalls);
                    sequence.push({
                        speaker: leadSpeaker,
                        text: century.lead,
                        emotion: 'celebration',
                        type: 'ball',
                        delay: 400
                    });
                    if (isDuoEnabledRef.current && century.analyst) {
                        sequence.push({
                            speaker: analystSpeaker,
                            text: century.analyst,
                            emotion: 'celebration',
                            type: 'analyst',
                            delay: 450
                        });
                    }
                }
                // 50 Runs Half-Century Milestone
                else if (strikerScore >= 50 && !batterMilestonesRef.current[cleanStriker].reached50) {
                    batterMilestonesRef.current[cleanStriker].reached50 = true;
                    const fifty = generateFiftyMilestoneAnnouncement(cleanStriker, strikerScore, strikerBalls);
                    sequence.push({
                        speaker: leadSpeaker,
                        text: fifty.lead,
                        emotion: 'celebration',
                        type: 'ball',
                        delay: 400
                    });
                    if (isDuoEnabledRef.current && fifty.analyst) {
                        sequence.push({
                            speaker: analystSpeaker,
                            text: fifty.analyst,
                            emotion: 'celebration',
                            type: 'analyst',
                            delay: 450
                        });
                    }
                }
            }

            // 2b. Team Total Milestones (50, 100, 150, 200, 250, 300, 350, 400)
            const teamTotalRuns = Number(ctx?.runs ?? 0);
            const teamMilestones = [400, 350, 300, 250, 200, 150, 100, 50];
            const reachedTeamMilestone = teamMilestones.find(m => teamTotalRuns >= m && !teamMilestonesRef.current[m]);

            if (reachedTeamMilestone) {
                teamMilestones.forEach(m => {
                    if (m <= reachedTeamMilestone) teamMilestonesRef.current[m] = true;
                });

                const teamAnn = generateTeamMilestoneAnnouncement(
                    reachedTeamMilestone,
                    ctx?.battingTeam || 'The batting side',
                    ctx?.overs ?? 0,
                    ctx?.wickets ?? 0
                );

                if (teamAnn) {
                    sequence.push({
                        speaker: leadSpeaker,
                        text: teamAnn.lead,
                        emotion: 'celebration',
                        type: 'ball',
                        delay: 400
                    });
                    if (isDuoEnabledRef.current && teamAnn.analyst) {
                        sequence.push({
                            speaker: analystSpeaker,
                            text: teamAnn.analyst,
                            emotion: 'celebration',
                            type: 'analyst',
                            delay: 450
                        });
                    }
                }
            }

            // 3. Wicket Moments: Hat-Trick, 2-in-2 prompt, Hauls & Dismissal Stats
            if (isWicket) {
                // 3a. Bowler Hat-trick & Consecutive Wickets tracking
                if (currentBowlerName && !isPlaceholderName(currentBowlerName)) {
                    const streak = (bowlerConsecutiveWicketsRef.current[currentBowlerName] || 0) + 1;
                    bowlerConsecutiveWicketsRef.current[currentBowlerName] = streak;

                    if (streak === 3) {
                        // HAT-TRICK!
                        const ht = generateHatTrickAnnouncement(currentBowlerName);
                        sequence.push({
                            speaker: leadSpeaker,
                            text: ht.lead,
                            emotion: 'hat_trick',
                            type: 'ball',
                            delay: 400
                        });
                        if (isDuoEnabledRef.current && ht.analyst) {
                            sequence.push({
                                speaker: analystSpeaker,
                                text: ht.analyst,
                                emotion: 'hat_trick',
                                type: 'analyst',
                                delay: 450
                            });
                        }
                    } else if (streak === 2) {
                        // 2 in 2! Hat-trick ball coming up!
                        const htPrompt = generateHatTrickBallPrompt(currentBowlerName);
                        sequence.push({
                            speaker: analystSpeaker,
                            text: htPrompt,
                            emotion: 'surprise',
                            type: 'analyst',
                            delay: 400
                        });
                    }
                }

                // 3b. Dismissed batter stats readout
                const dName = latestDelivery.batsman;
                const dRuns = latestDelivery.dismissedBatterRuns;
                const dBalls = latestDelivery.dismissedBatterBalls;
                const dFours = latestDelivery.dismissedBatterFours ?? 0;
                const dSixes = latestDelivery.dismissedBatterSixes ?? 0;

                if (dName && dRuns != null && !latestDelivery.isGoldenDuck && !latestDelivery.isDuck) {
                    const statsText = generateDismissedBatterStats(dName, dRuns, dBalls, dFours, dSixes);
                    if (statsText) {
                        sequence.push({
                            speaker: analystSpeaker,
                            text: statsText,
                            emotion: Number(dRuns) >= 50 ? 'laughter' : 'neutral',
                            type: 'analyst',
                            delay: 500
                        });
                    }
                }

                // 3c. Bowler 3-Wicket & 5-Wicket Haul Milestone Check
                if (currentBowlerName && !isPlaceholderName(currentBowlerName)) {
                    const bWickets = Number(ctx?.bowler?.wickets || 0);
                    if (!bowlerMilestonesRef.current[currentBowlerName]) {
                        bowlerMilestonesRef.current[currentBowlerName] = { reached3w: false, reached5w: false };
                    }
                    if (bWickets >= 5 && !bowlerMilestonesRef.current[currentBowlerName].reached5w) {
                        bowlerMilestonesRef.current[currentBowlerName].reached5w = true;
                        bowlerMilestonesRef.current[currentBowlerName].reached3w = true;
                        const haul = generateBowlerWicketsMilestone(currentBowlerName, bWickets, ctx?.bowler?.runs);
                        sequence.push({
                            speaker: leadSpeaker,
                            text: haul,
                            emotion: 'celebration',
                            type: 'ball',
                            delay: 500
                        });
                    } else if (bWickets >= 3 && !bowlerMilestonesRef.current[currentBowlerName].reached3w) {
                        bowlerMilestonesRef.current[currentBowlerName].reached3w = true;
                        const haul = generateBowlerWicketsMilestone(currentBowlerName, bWickets, ctx?.bowler?.runs);
                        sequence.push({
                            speaker: analystSpeaker,
                            text: haul,
                            emotion: 'surprise',
                            type: 'analyst',
                            delay: 450
                        });
                    }
                }
            } else {
                // Legal delivery without wicket: reset bowler streak
                if (!latestDelivery.isExtra && currentBowlerName) {
                    bowlerConsecutiveWicketsRef.current[currentBowlerName] = 0;
                }
            }

            // 4. Free hit outcome reaction
            if (isFreeHitBall && !isWicket) {
                const fhText = generateFreeHitOutcomeCommentary(
                    Number(latestDelivery.runs ?? 0),
                    latestDelivery.batsman || currentStrikerName || 'The batter',
                    latestDelivery.bowler || currentBowlerName || 'The bowler'
                );
                if (fhText) {
                    const fhRuns = Number(latestDelivery.runs ?? 0);
                    sequence.push({
                        speaker: analystSpeaker,
                        text: fhText,
                        emotion: fhRuns >= 6 ? 'roar' : fhRuns >= 4 ? 'bat_crack' : 'neutral',
                        type: 'analyst',
                        delay: 400
                    });
                }
            }

            // 5. Over Tracking: Maiden Over Detection & End-of-Over Summary
            const overFloat = parseFloat(latestDelivery.over);
            const overIndex = !isNaN(overFloat) ? Math.floor(overFloat) : Math.floor(Number(ctx?.overs || 0));

            if (currentOverRunsRef.current.over !== overIndex) {
                currentOverRunsRef.current = { over: overIndex, runs: 0, balls: 0 };
            }
            const runsConceded = Number(latestDelivery.runs || 0) + Number(latestDelivery.extraRuns || 0);
            currentOverRunsRef.current.runs += runsConceded;
            currentOverRunsRef.current.balls += 1;

            const isBall6 = !isNaN(overFloat) && Math.round((overFloat % 1) * 10) === 6;
            if (isBall6) {
                // Maiden Over: 6 legal balls in over with 0 runs conceded!
                const isMaiden = currentOverRunsRef.current.runs === 0;
                if (isMaiden) {
                    const maidenText = generateMaidenOverAnnouncement(currentBowlerName);
                    sequence.push({
                        speaker: analystSpeaker,
                        text: maidenText,
                        emotion: 'maiden',
                        type: 'ball',
                        delay: 500
                    });
                }

                // End-of-Over Score Summary
                const completedOverNum = Math.floor(overFloat) + 1;
                const overSummary = generateOverEndAnnouncement(
                    completedOverNum,
                    ctx?.runs ?? 0,
                    ctx?.wickets ?? 0,
                    ctx?.battingTeam || 'The batting side'
                );
                sequence.push({
                    speaker: leadSpeaker,
                    text: overSummary,
                    emotion: 'neutral',
                    type: 'ball',
                    delay: 450
                });
            }

            // 6. New Bowler Intro at the start of a spell or new over
            if (currentBowlerName && currentBowlerName !== lastBowlerNameRef.current && lastBowlerNameRef.current !== null && !isPlaceholderName(currentBowlerName)) {
                const bowlerType = ctx?.bowler?.bowlingStyle || ctx?.bowlerType || ctx?.bowler?.bowlingType || '';
                const strikerHand = ctx?.strikerHand || ctx?.striker?.hand || '';
                const overNum = Math.floor(overFloat) + 1;
                const bowlerIntro = generateNewBowlerIntro(currentBowlerName, bowlerType, currentStrikerName, strikerHand, overNum);
                if (bowlerIntro) {
                    sequence.push({
                        speaker: analystSpeaker,
                        text: bowlerIntro,
                        emotion: 'neutral',
                        type: 'filler',
                        delay: 500
                    });
                }
            }

            // 7. New Batter Arrival (if new batter stepped in on this delivery)
            if (currentStrikerName && !isPlaceholderName(currentStrikerName)) {
                const strikerKey = currentStrikerName.toLowerCase();
                if (!knownInningsBattersRef.current.has(strikerKey)) {
                    knownInningsBattersRef.current.add(strikerKey);
                    const arrivalText = generateNewBatterArrival(
                        currentStrikerName,
                        currentWickets ?? 0,
                        ctx?.runs ?? 0,
                        ctx?.overs ?? 0,
                        ctx?.overLimit ?? 20,
                        ctx?.strikerHand || ctx?.striker?.hand,
                        ctx?.bowler?.bowlingStyle || ctx?.bowlerType || ctx?.bowler?.bowlingType || ''
                    );
                    if (arrivalText) {
                        sequence.push({
                            speaker: leadSpeaker,
                            text: arrivalText,
                            emotion: 'neutral',
                            type: 'filler',
                            delay: 600
                        });
                    }
                }
            }

            // Update tracker refs
            lastBowlerNameRef.current = currentBowlerName;
            lastStrikerNameRef.current = currentStrikerName;
            lastWicketCountRef.current = currentWickets;

            // Enqueue all delivery sequence items into the unified speech queue with highest priority!
            enqueueSequence(sequence, { priority: true, interruptAll: true });
        }
    }, [latestDelivery, enqueueSequence, stopSpeaking]);

    // Replay the current latest ball with both commentators
    const replayLastBall = useCallback(() => {
        if (!latestDelivery) return;
        if (fillerTimerRef.current) clearTimeout(fillerTimerRef.current);
        if (analystTimerRef.current) clearTimeout(analystTimerRef.current);
        speechQueueRef.current = [];
        isPlayingQueueRef.current = false;

        const duo = generateDuoBallCommentary(latestDelivery, matchContextRef.current);
        if (!duo) return;

        speakCommentator({
            speaker: 'Arthur',
            text: duo.lead.text,
            emotion: duo.lead.emotion,
            type: 'ball',
            onDone: () => {
                if (isDuoEnabledRef.current && duo.analyst) {
                    analystTimerRef.current = setTimeout(() => {
                        speakCommentator({
                            speaker: 'David',
                            text: duo.analyst.text,
                            emotion: duo.analyst.emotion,
                            type: 'analyst',
                            onDone: () => scheduleOccasionalFiller()
                        });
                    }, 500);
                } else {
                    scheduleOccasionalFiller();
                }
            }
        });
    }, [latestDelivery, speakCommentator, scheduleOccasionalFiller]);

    // Volume Controls & Commentary Activation
    const toggleVoice = useCallback((forceState) => {
        setIsEnabled(prev => {
            const next = typeof forceState === 'boolean' ? forceState : !prev;
            isEnabledRef.current = next;
            if (typeof window !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, String(next));
            }
            if (!next) {
                stopSpeaking();
            } else {
                emotionAudio.init();
                if (isSupported) {
                    if (window.speechSynthesis.paused) {
                        window.speechSynthesis.resume();
                    }
                    // Prime mobile iOS/Android speech synthesis engine on user gesture
                    try {
                        const primeUtterance = new SpeechSynthesisUtterance(' ');
                        primeUtterance.volume = 0.01;
                        window.speechSynthesis.speak(primeUtterance);
                    } catch (e) {}
                }
                emotionAudio.playBatCrack();
                // Immediate commentary feedback when turned on
                if (latestDelivery) {
                    setTimeout(() => {
                        if (isEnabledRef.current) {
                            replayLastBall();
                        }
                    }, 350);
                } else {
                    scheduleOccasionalFiller(600);
                }
            }
            return next;
        });
    }, [isSupported, stopSpeaking, latestDelivery, replayLastBall, scheduleOccasionalFiller]);

    // Guarantee that if isEnabled becomes false, all speech, timers, and utterances cease immediately
    useEffect(() => {
        if (!isEnabled) {
            stopSpeaking();
        }
    }, [isEnabled, stopSpeaking]);

    const setVolume = useCallback((val) => {
        const clamped = Math.max(0, Math.min(1, Number(val)));
        setVolumeState(clamped);
        emotionAudio.setVolume(clamped * volumeFxRef.current);
        if (typeof window !== 'undefined') {
            localStorage.setItem(VOLUME_KEY, String(clamped));
        }
        if (clamped === 0) {
            setIsMuted(true);
            stopSpeaking();
        } else if (isMuted) {
            setIsMuted(false);
        }
    }, [isMuted, stopSpeaking]);

    const setVolumeArthur = useCallback((val) => {
        const clamped = Math.max(0, Math.min(1, Number(val)));
        setVolumeArthurState(clamped);
        if (typeof window !== 'undefined') {
            localStorage.setItem(VOLUME_ARTHUR_KEY, String(clamped));
        }
    }, []);

    const setVolumeDavid = useCallback((val) => {
        const clamped = Math.max(0, Math.min(1, Number(val)));
        setVolumeDavidState(clamped);
        if (typeof window !== 'undefined') {
            localStorage.setItem(VOLUME_DAVID_KEY, String(clamped));
        }
    }, []);

    const setVolumeFx = useCallback((val) => {
        const clamped = Math.max(0, Math.min(1, Number(val)));
        setVolumeFxState(clamped);
        emotionAudio.setVolume(volumeRef.current * clamped);
        if (typeof window !== 'undefined') {
            localStorage.setItem(VOLUME_FX_KEY, String(clamped));
        }
    }, []);

    const setDynamicVolume = useCallback((val) => {
        setDynamicVolumeState(val);
        if (typeof window !== 'undefined') {
            localStorage.setItem(DYNAMIC_VOL_KEY, String(val));
        }
    }, []);

    const setIsDuoEnabled = useCallback((val) => {
        setIsDuoEnabledState(val);
        if (typeof window !== 'undefined') {
            localStorage.setItem(DUO_KEY, String(val));
        }
    }, []);

    const setSoundFxEnabled = useCallback((val) => {
        setSoundFxEnabledState(val);
        if (typeof window !== 'undefined') {
            localStorage.setItem(FX_KEY, String(val));
        }
    }, []);

    const setVoice1Custom = useCallback((voice) => {
        setVoice1(voice);
        if (typeof window !== 'undefined' && voice?.name) {
            localStorage.setItem(VOICE_ARTHUR_KEY, voice.name);
        }
    }, []);

    const setVoice2Custom = useCallback((voice) => {
        setVoice2(voice);
        if (typeof window !== 'undefined' && voice?.name) {
            localStorage.setItem(VOICE_DAVID_KEY, voice.name);
        }
    }, []);

    const setPacingMode = useCallback((mode) => {
        setPacingModeState(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem(PACING_KEY, String(mode));
        }
        if (fillerTimerRef.current) {
            clearTimeout(fillerTimerRef.current);
            scheduleOccasionalFiller();
        }
    }, [scheduleOccasionalFiller]);



    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (fillerTimerRef.current) clearTimeout(fillerTimerRef.current);
            if (analystTimerRef.current) clearTimeout(analystTimerRef.current);
            if (queueDelayTimerRef.current) clearTimeout(queueDelayTimerRef.current);
            if (priorityTransitionTimerRef.current) clearTimeout(priorityTransitionTimerRef.current);
            if (speechWatchdogTimerRef.current) clearTimeout(speechWatchdogTimerRef.current);
            stopKeepAlive();
            if (isSupported) {
                window.speechSynthesis.cancel();
            }
        };
    }, [isSupported, stopKeepAlive]);

    return {
        isSupported,
        isEnabled,
        toggleVoice,
        isSpeaking,
        activeSpeaker,
        currentEmotion,
        speechType,
        currentSpokenText,
        volume,
        setVolume,
        volumeArthur,
        setVolumeArthur,
        volumeDavid,
        setVolumeDavid,
        volumeFx,
        setVolumeFx,
        dynamicVolume,
        setDynamicVolume,
        isMuted,
        setIsMuted,
        isDuoEnabled,
        setIsDuoEnabled,
        soundFxEnabled,
        setSoundFxEnabled,
        pacingMode,
        setPacingMode,
        dialogueFeed,
        stopSpeaking,
        replayLastBall,
        availableVoices,
        voice1,
        setVoice1: setVoice1Custom,
        voice2,
        setVoice2: setVoice2Custom
    };
}

export default useVoiceCommentary;
