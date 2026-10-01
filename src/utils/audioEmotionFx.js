/**
 * E-Legends Trophy 2K26 — Broadcast Sound Effects Synthesizer
 * Uses Web Audio API to create authentic stadium emotion sounds:
 * - Bat crack on boundary hits
 * - Crowd gasp on surprises/wickets
 * - Chuckle / laughter tones
 * - Melancholic sigh on tragic dismissals
 * - Umpire whistle / beep
 */

class AudioEmotionFx {
    constructor() {
        this.ctx = null;
        this.isEnabled = true;
        this.volume = 0.6;
    }

    init() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    setEnabled(enabled) {
        this.isEnabled = Boolean(enabled);
    }

    // 1. Crisp bat strike on fours & sixes
    playBatCrack() {
        if (!this.isEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Low frequency pop + high click
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

            gain.gain.setValueAtTime(0.7 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) {
            // Audio context policy guard
        }
    }

    // 2. Crowd gasp / surprise whoosh
    playSurpriseGasp() {
        if (!this.isEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 0.45;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);

            // White noise filtered to sound like a collective breath intake / gasp
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(450, now);
            filter.frequency.exponentialRampToValueAtTime(1100, now + 0.35);
            filter.Q.value = 3.0;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.4 * this.volume, now + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + 0.45);
        } catch (e) {}
    }

    // 3. Playful chuckle / laughter synth
    playLaughterChuckle() {
        if (!this.isEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            // 3 quick playful laughing tone pulses
            [0, 0.12, 0.24].forEach((offset, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                const baseFreq = 420 + idx * 40;
                osc.frequency.setValueAtTime(baseFreq, now + offset);
                osc.frequency.exponentialRampToValueAtTime(baseFreq - 80, now + offset + 0.08);

                gain.gain.setValueAtTime(0.28 * this.volume, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + offset);
                osc.stop(now + offset + 0.09);
            });
        } catch (e) {}
    }

    // 4. Melancholic soft sigh / sad sympathy tone (wickets, golden ducks, near fifties)
    playSadSigh() {
        if (!this.isEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Downward pitch bend mimicking a disappointed sigh
            osc.type = 'sine';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.6);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.6);
        } catch (e) {}
    }

    // 5. Crowd cheer cheer-rise (for massive 6 or big win)
    playCrowdRoar() {
        if (!this.isEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 0.8;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1);
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, now);
            filter.frequency.linearRampToValueAtTime(900, now + 0.4);
            filter.frequency.exponentialRampToValueAtTime(250, now + 0.8);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.35 * this.volume, now + 0.35);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + 0.8);
        } catch (e) {}
    }

    // 6. Celebratory roar & crowd ovation for 50s, 100s, Hat-tricks, and Match Wins
    playCelebrationCheer() {
        if (!this.isEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            // First trigger a crisp bat crack or impact
            this.playBatCrack();

            // Long layered crowd cheer with rising excitement
            const bufferSize = this.ctx.sampleRate * 1.4;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1);
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(350, now);
            filter.frequency.linearRampToValueAtTime(1200, now + 0.5);
            filter.frequency.exponentialRampToValueAtTime(400, now + 1.4);
            filter.Q.value = 1.2;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.65 * this.volume, now + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + 1.4);

            // Also play ascending milestone chime arpeggio
            this.playMilestoneStinger(0.1);
        } catch (e) {}
    }

    // 7. Milestone ascending chime stinger (harmonic triumph fanfare)
    playMilestoneStinger(delaySec = 0) {
        if (!this.isEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const start = this.ctx.currentTime + delaySec;
            // Notes: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
            const freqs = [523.25, 659.25, 783.99, 1046.50];
            freqs.forEach((freq, idx) => {
                const noteTime = start + (idx * 0.09);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.01, noteTime);
                gain.gain.linearRampToValueAtTime(0.35 * this.volume, noteTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(noteTime);
                osc.stop(noteTime + 0.35);
            });
        } catch (e) {}
    }

    // 8. Applause / clap sound for maiden over or respectful recognition
    playMaidenApplause() {
        if (!this.isEnabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            // Rapid burst of hand claps using shaped noise pulses
            const clapCount = 6;
            for (let i = 0; i < clapCount; i++) {
                const clapTime = now + (i * 0.11) + (Math.random() * 0.02);
                const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);

                for (let j = 0; j < bufferSize; j++) {
                    data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.3));
                }

                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1000 + (Math.random() * 400), clapTime);
                filter.Q.value = 2.0;

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.35 * this.volume, clapTime);
                gain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.06);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                noise.start(clapTime);
                noise.stop(clapTime + 0.06);
            }
        } catch (e) {}
    }

    // Stop and silence any ongoing synthesizer sound effects
    stopAll() {
        if (!this.ctx) return;
        try {
            if (this.ctx.state === 'running') {
                this.ctx.suspend().then(() => {
                    if (this.ctx && this.isEnabled) {
                        this.ctx.resume().catch(() => {});
                    }
                }).catch(() => {});
            }
        } catch (e) {}
    }
}

export const emotionAudio = new AudioEmotionFx();
export default emotionAudio;
