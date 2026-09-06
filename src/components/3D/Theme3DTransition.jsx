import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../contexts/ThemeContext';
import { resolveTournamentLabels } from '../../services/rtdbService';
import './Theme3DTransition.css';

/**
 * Procedurally generate a high-resolution circular medallion texture
 * featuring authentic milled coin rim, concentric bevels, championship stars,
 * and bold dual-row inscription: "ELT" and "2K26".
 *
 * @param {boolean} isDay - Day (Sun/Gold) or Night (Moon/Cyan) medallion face
 * @param {string} edition - Tournament edition (e.g., '2K26')
 * @returns {HTMLCanvasElement}
 */
const createCoinFaceCanvas = (isDay, edition = '2K26') => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 10;

    // 1. Base Circular Gradient
    const baseGrad = ctx.createRadialGradient(cx - 35, cy - 45, 20, cx, cy, r);
    if (isDay) {
        // Championship Radiant Gold
        baseGrad.addColorStop(0, '#fffbeb');
        baseGrad.addColorStop(0.2, '#fef08a');
        baseGrad.addColorStop(0.5, '#f59e0b');
        baseGrad.addColorStop(0.8, '#d97706');
        baseGrad.addColorStop(1, '#78350f');
    } else {
        // Midnight Obsidian & Electric Cyber Cyan
        baseGrad.addColorStop(0, '#1e293b');
        baseGrad.addColorStop(0.3, '#0f172a');
        baseGrad.addColorStop(0.7, '#090d16');
        baseGrad.addColorStop(1, '#020617');
    }
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 2. Serrated / Milled Coin Rim (72 gear teeth)
    const teeth = 72;
    ctx.save();
    ctx.strokeStyle = isDay ? '#fde047' : '#00f0ff';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < teeth; i++) {
        const angle = (i / teeth) * Math.PI * 2;
        const x1 = cx + Math.cos(angle) * (r - 14);
        const y1 = cy + Math.sin(angle) * (r - 14);
        const x2 = cx + Math.cos(angle) * (r - 2);
        const y2 = cy + Math.sin(angle) * (r - 2);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    ctx.restore();

    // 3. Concentric Beveled Medallion Rings
    // Outer bevel border
    ctx.strokeStyle = isDay ? '#fbbf24' : '#0284c7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 18, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bevel border
    ctx.strokeStyle = isDay ? '#d97706' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 25, 0, Math.PI * 2);
    ctx.stroke();

    // Inner recessed disc with subtle lighting
    const innerGrad = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy, r - 28);
    if (isDay) {
        innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
        innerGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.15)');
        innerGrad.addColorStop(1, 'rgba(146, 64, 14, 0.45)');
    } else {
        innerGrad.addColorStop(0, 'rgba(0, 240, 255, 0.18)');
        innerGrad.addColorStop(0.6, 'rgba(15, 23, 42, 0.6)');
        innerGrad.addColorStop(1, 'rgba(2, 6, 23, 0.88)');
    }
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 27, 0, Math.PI * 2);
    ctx.fill();

    // Dotted inner perimeter ring
    ctx.save();
    ctx.fillStyle = isDay ? '#fef08a' : '#00f0ff';
    const dotCount = 36;
    for (let i = 0; i < dotCount; i++) {
        const a = (i / dotCount) * Math.PI * 2;
        const dx = cx + Math.cos(a) * (r - 35);
        const dy = cy + Math.sin(a) * (r - 35);
        ctx.beginPath();
        ctx.arc(dx, dy, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 4. Championship Top Stars (★ ★ ★)
    const drawStar = (sx, sy, points, outerR, innerR, color) => {
        let rot = (Math.PI / 2) * 3;
        let x = sx;
        let y = sy;
        const step = Math.PI / points;
        ctx.beginPath();
        ctx.moveTo(sx, sy - outerR);
        for (let i = 0; i < points; i++) {
            x = sx + Math.cos(rot) * outerR;
            y = sy + Math.sin(rot) * outerR;
            ctx.lineTo(x, y);
            rot += step;
            x = sx + Math.cos(rot) * innerR;
            y = sy + Math.sin(rot) * innerR;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(sx, sy - outerR);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    };

    const starColor = isDay ? '#ffffff' : '#00f0ff';
    drawStar(cx, cy - 138, 5, 12, 5.5, starColor);
    drawStar(cx - 44, cy - 132, 5, 9, 4, starColor);
    drawStar(cx + 44, cy - 132, 5, 9, 4, starColor);

    // 5. Inscription: "ELT" (Row 1) & "2K26" (Row 2)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Metallic Gradient for Letters
    const textGrad = ctx.createLinearGradient(0, cy - 90, 0, cy + 90);
    if (isDay) {
        textGrad.addColorStop(0, '#ffffff');
        textGrad.addColorStop(0.3, '#fef08a');
        textGrad.addColorStop(0.7, '#fbbf24');
        textGrad.addColorStop(1, '#b45309');
    } else {
        textGrad.addColorStop(0, '#ffffff');
        textGrad.addColorStop(0.3, '#e0f2fe');
        textGrad.addColorStop(0.7, '#38bdf8');
        textGrad.addColorStop(1, '#0284c7');
    }

    // Row 1: ELT
    ctx.shadowColor = isDay ? 'rgba(69, 26, 3, 0.95)' : 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;

    ctx.font = '900 84px "Montserrat", "Outfit", "Arial Black", sans-serif';
    ctx.fillStyle = textGrad;
    ctx.fillText('ELT', cx, cy - 48);

    // Reset shadow for crisp highlight outline
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = isDay ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 240, 255, 0.92)';
    ctx.lineWidth = 2.5;
    ctx.strokeText('ELT', cx, cy - 48);

    // Decorative Center Divider Line
    const divWidth = 150;
    const divY = cy + 12;
    const divGrad = ctx.createLinearGradient(cx - divWidth / 2, divY, cx + divWidth / 2, divY);
    divGrad.addColorStop(0, 'transparent');
    divGrad.addColorStop(0.5, isDay ? '#ffffff' : '#00f0ff');
    divGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - divWidth / 2, divY);
    ctx.lineTo(cx + divWidth / 2, divY);
    ctx.stroke();

    // Center Diamond on Divider
    drawStar(cx, divY, 4, 6, 2.5, isDay ? '#ffffff' : '#00f0ff');

    // Row 2: 2K26 (or custom edition)
    ctx.shadowColor = isDay ? 'rgba(69, 26, 3, 0.95)' : 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    ctx.font = '900 70px "Montserrat", "Outfit", "Arial Black", sans-serif';
    ctx.fillStyle = textGrad;
    ctx.fillText(edition, cx, cy + 68);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = isDay ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 240, 255, 0.92)';
    ctx.lineWidth = 2.2;
    ctx.strokeText(edition, cx, cy + 68);

    // Bottom Subtitle Ribbon: E-LEGENDS TROPHY
    ctx.font = '700 16px "Montserrat", "Outfit", sans-serif';
    ctx.fillStyle = isDay ? '#fde68a' : '#7dd3fc';
    ctx.fillText('E-LEGENDS TROPHY', cx, cy + 138);

    return canvas;
};

const Theme3DTransition = () => {
    const { isTransitioning, targetTheme, transitionOrigin } = useTheme();
    const canvasContainerRef = useRef(null);

    useEffect(() => {
        if (!isTransitioning) return;

        const container = canvasContainerRef.current;
        if (!container) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        // Resolve active edition code (e.g. '2K26')
        const labels = resolveTournamentLabels(null);
        const editionCode = labels?.editionCode || '2K26';

        // --- 1. Scene, Camera, WebGL Renderer ---
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
        camera.position.z = 7.5;

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const isGoingToDay = targetTheme === 'light';

        // --- 2. Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(isGoingToDay ? 0xffea79 : 0x00f0ff, 3.2);
        keyLight.position.set(4, 5, 6);
        scene.add(keyLight);

        const fillLight = new THREE.PointLight(isGoingToDay ? 0xf59e0b : 0x8b5cf6, 4.0, 20);
        fillLight.position.set(-4, -3, 4);
        scene.add(fillLight);

        // --- 3. 3D Celestial Medallion (Sun & Moon dual-sided coin) ---
        const coinGroup = new THREE.Group();
        scene.add(coinGroup);

        // Normalized click origin coordinates
        const normOriginX = (transitionOrigin.x - 0.5) * 8;
        const normOriginY = -(transitionOrigin.y - 0.5) * 5;
        const startX = normOriginX * 0.4;
        const startY = normOriginY * 0.4;
        coinGroup.position.set(startX, startY, 0);

        // Coin Cylinder Body (Milled metal rim)
        const coinGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.18, 64);
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: isGoingToDay ? 0xd97706 : 0x1e293b,
            metalness: 0.85,
            roughness: 0.25
        });
        const coinMesh = new THREE.Mesh(coinGeo, rimMaterial);
        coinMesh.rotation.x = Math.PI / 2;
        coinGroup.add(coinMesh);

        // Generate high-res textures with "ELT 2K26" inscription for both faces
        const sunTexture = new THREE.CanvasTexture(createCoinFaceCanvas(true, editionCode));
        sunTexture.colorSpace = THREE.SRGBColorSpace;

        const moonTexture = new THREE.CanvasTexture(createCoinFaceCanvas(false, editionCode));
        moonTexture.colorSpace = THREE.SRGBColorSpace;

        // Face A: Sun Disc (Golden Radiant Medallion)
        const sunFaceGeo = new THREE.CircleGeometry(1.56, 48);
        const sunFaceMat = new THREE.MeshStandardMaterial({
            map: sunTexture,
            color: 0xffffff,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.2,
            roughness: 0.25,
            metalness: 0.55,
            side: THREE.FrontSide
        });
        const sunFace = new THREE.Mesh(sunFaceGeo, sunFaceMat);
        sunFace.position.z = 0.095;
        coinGroup.add(sunFace);

        // Sun Corona Ring
        const coronaGeo = new THREE.RingGeometry(1.65, 2.1, 48);
        const coronaMat = new THREE.MeshBasicMaterial({
            color: 0xffd166,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: isGoingToDay ? 0.85 : 0.2
        });
        const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
        coronaMesh.position.z = 0.096;
        coinGroup.add(coronaMesh);

        // Face B: Moon Disc (Deep Obsidian & Cyan Medallion)
        // Rotated by Math.PI around Y so front faces outwards toward -Z un-mirrored
        const moonFaceGeo = new THREE.CircleGeometry(1.56, 48);
        const moonFaceMat = new THREE.MeshStandardMaterial({
            map: moonTexture,
            color: 0xffffff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.2,
            roughness: 0.35,
            metalness: 0.75,
            side: THREE.FrontSide
        });
        const moonFace = new THREE.Mesh(moonFaceGeo, moonFaceMat);
        moonFace.position.z = -0.095;
        moonFace.rotation.y = Math.PI;
        coinGroup.add(moonFace);

        // Moon Aura Ring
        const moonAuraGeo = new THREE.RingGeometry(1.65, 2.1, 48);
        const moonAuraMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: !isGoingToDay ? 0.85 : 0.2
        });
        const moonAuraMesh = new THREE.Mesh(moonAuraGeo, moonAuraMat);
        moonAuraMesh.position.z = -0.096;
        coinGroup.add(moonAuraMesh);

        // --- 4. Volumetric 3D Expanding Shockwave Ring ---
        const shockwaveGeo = new THREE.RingGeometry(0.1, 0.4, 64);
        const shockwaveMat = new THREE.MeshBasicMaterial({
            color: isGoingToDay ? 0xf59e0b : 0x00f0ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95
        });
        const shockwave = new THREE.Mesh(shockwaveGeo, shockwaveMat);
        shockwave.position.copy(coinGroup.position);
        shockwave.position.z = -0.2;
        scene.add(shockwave);

        // Secondary Outer Harmonic Ripple
        const rippleGeo = new THREE.RingGeometry(0.1, 0.2, 64);
        const rippleMat = new THREE.MeshBasicMaterial({
            color: isGoingToDay ? 0xffffff : 0x8b5cf6,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const ripple = new THREE.Mesh(rippleGeo, rippleMat);
        ripple.position.copy(coinGroup.position);
        ripple.position.z = -0.25;
        scene.add(ripple);

        // --- 5. 3D Spark Particles Explosion (160 particles) ---
        const particleCount = 160;
        const particlePositions = new Float32Array(particleCount * 3);
        const particleVelocities = [];
        const particleColors = new Float32Array(particleCount * 3);

        const primaryColor = new THREE.Color(isGoingToDay ? 0xf59e0b : 0x00f0ff);
        const secondaryColor = new THREE.Color(isGoingToDay ? 0xffffff : 0xa855f7);

        for (let i = 0; i < particleCount; i++) {
            particlePositions[i * 3] = coinGroup.position.x;
            particlePositions[i * 3 + 1] = coinGroup.position.y;
            particlePositions[i * 3 + 2] = 0;

            // Spherical radial burst velocities
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI;
            const speed = 4.0 + Math.random() * 8.5;

            particleVelocities.push({
                x: Math.cos(theta) * Math.cos(phi) * speed,
                y: Math.sin(theta) * Math.cos(phi) * speed,
                z: Math.sin(phi) * speed * 0.8
            });

            const col = Math.random() > 0.4 ? primaryColor : secondaryColor;
            particleColors[i * 3] = col.r;
            particleColors[i * 3 + 1] = col.g;
            particleColors[i * 3 + 2] = col.b;
        }

        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        // --- 6. 3-Phase Animation Loop ---
        // Phase 1 (0 to 450ms): Coin flips from origin to screen center, rising to peak (Z = 2.45, scale 1.45x)
        // Phase 2 (450 to 950ms): Coin waits 0.5s at the top, showcasing "ELT 2K26" with subtle shimmer
        // Phase 3 (950 to 1400ms): Coin smoothly recedes down as before (Z -> 0, scale -> 1.0x)
        const RISE_DURATION = 450;
        const HOLD_DURATION = 500;
        const FALL_DURATION = 450;
        const TOTAL_DURATION = RISE_DURATION + HOLD_DURATION + FALL_DURATION; // 1400ms

        const startTime = performance.now();
        let animId;

        // If going to Day, coin flips from Night (Math.PI) to Day (Math.PI * 4 = 0)
        // If going to Night, coin flips from Day (0) to Night (Math.PI * 3 = Math.PI)
        const startRotY = isGoingToDay ? Math.PI : 0;
        const targetRotY = isGoingToDay ? Math.PI * 4 : Math.PI * 3;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const overallProgress = Math.min(elapsed / TOTAL_DURATION, 1);

            let currentZ = 0;
            let currentScale = 1;
            let currentRotY = startRotY;
            let currentRotX = 0;
            let currentRotZ = 0;
            let currentX = 0;
            let currentY = 0;

            if (elapsed < RISE_DURATION) {
                // --- PHASE 1: Rise & Flip to Peak Close-up ---
                const p1 = elapsed / RISE_DURATION;
                const easeOut = 1 - Math.pow(1 - p1, 3);

                currentRotY = startRotY + (targetRotY - startRotY) * easeOut;
                currentRotX = Math.sin(p1 * Math.PI) * 0.45;
                currentRotZ = Math.sin(p1 * Math.PI * 2) * 0.18;

                // Zoom up close to camera (scale 1.55, Z 2.65)
                currentZ = 2.65 * easeOut;
                currentScale = 1 + 0.55 * easeOut;

                currentX = startX * (1 - easeOut);
                currentY = startY * (1 - easeOut);
            } else if (elapsed < RISE_DURATION + HOLD_DURATION) {
                // --- PHASE 2: 0.5s Hold at the Top with smooth "Little Bit Zoom Out" ---
                const p2 = (elapsed - RISE_DURATION) / HOLD_DURATION;
                const zoomOutEase = 1 - Math.pow(1 - p2, 2.5); // Smooth deceleration into showcase framing

                // Subtle floating breathing & metallic glint tilt
                currentRotY = targetRotY + Math.sin(p2 * Math.PI * 2) * 0.06;
                currentRotX = Math.sin(p2 * Math.PI * 2) * 0.03;
                currentRotZ = Math.cos(p2 * Math.PI * 2) * 0.02;

                // Smoothly zoom out slightly while stopping 0.5s (Scale: 1.55 -> 1.23, Z: 2.65 -> 2.00)
                currentZ = 2.65 - 0.65 * zoomOutEase;
                currentScale = 1.55 - 0.32 * zoomOutEase;

                currentX = 0;
                currentY = 0;
            } else {
                // --- PHASE 3: Descend & Recede Down ---
                const p3 = Math.min((elapsed - RISE_DURATION - HOLD_DURATION) / FALL_DURATION, 1);
                const easeIn = Math.pow(p3, 2.4);

                currentRotY = targetRotY + (1 - easeIn) * 0.04;
                currentRotX = (1 - easeIn) * 0.03;
                currentRotZ = (1 - easeIn) * 0.02;

                // Smoothly recede from the zoomed-out position back to rest (Scale: 1.23 -> 1.0, Z: 2.00 -> 0)
                currentZ = 2.0 * (1 - easeIn);
                currentScale = 1.23 - 0.23 * easeIn;

                currentX = 0;
                currentY = 0;
            }

            coinGroup.position.set(currentX, currentY, currentZ);
            coinGroup.scale.set(currentScale, currentScale, currentScale);
            coinGroup.rotation.set(currentRotX, currentRotY, currentRotZ);

            // --- Animate 3D Shockwave & Ripple ---
            const shockwaveProgress = Math.min(elapsed / 800, 1);
            const shockwaveEase = 1 - Math.pow(1 - shockwaveProgress, 3);
            const shockwaveScale = 0.2 + shockwaveEase * 28;
            shockwave.scale.set(shockwaveScale, shockwaveScale, 1);
            shockwaveMat.opacity = Math.max(0, 1 - Math.pow(elapsed / 850, 1.3));

            const rippleProgress = Math.max(0, (elapsed - 80) / 900);
            const rippleScale = 0.1 + Math.min(rippleProgress, 1) * 32;
            ripple.scale.set(rippleScale, rippleScale, 1);
            rippleMat.opacity = Math.max(0, 0.8 - Math.pow(elapsed / 950, 1.2));

            // --- Animate 3D Spark Particles ---
            const posAttr = particleGeo.attributes.position;
            const deltaSec = 0.016;

            for (let i = 0; i < particleCount; i++) {
                const vel = particleVelocities[i];
                vel.x *= 0.95;
                vel.y *= 0.95;
                vel.z *= 0.95;

                posAttr.array[i * 3] += vel.x * deltaSec;
                posAttr.array[i * 3 + 1] += vel.y * deltaSec;
                posAttr.array[i * 3 + 2] += vel.z * deltaSec;
            }
            posAttr.needsUpdate = true;
            particleMat.opacity = Math.max(0, 1 - Math.pow(overallProgress, 1.15));

            renderer.render(scene, camera);

            if (overallProgress < 1) {
                animId = requestAnimationFrame(animate);
            } else {
                // Cleanup on finish
                if (container && renderer.domElement && container.contains(renderer.domElement)) {
                    container.removeChild(renderer.domElement);
                }
                sunTexture.dispose();
                moonTexture.dispose();
                coinGeo.dispose();
                rimMaterial.dispose();
                sunFaceGeo.dispose();
                sunFaceMat.dispose();
                coronaGeo.dispose();
                coronaMat.dispose();
                moonFaceGeo.dispose();
                moonFaceMat.dispose();
                moonAuraGeo.dispose();
                moonAuraMat.dispose();
                shockwaveGeo.dispose();
                shockwaveMat.dispose();
                rippleGeo.dispose();
                rippleMat.dispose();
                particleGeo.dispose();
                particleMat.dispose();
                renderer.dispose();
            }
        };

        animId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animId);
            if (container && renderer.domElement && container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, [isTransitioning, targetTheme, transitionOrigin]);

    if (!isTransitioning) return null;

    return (
        <div className={`theme-3d-portal-overlay ${targetTheme === 'light' ? 'to-daylight' : 'to-night'}`}>
            <div ref={canvasContainerRef} className="theme-3d-canvas-wrap" />
            <div className="theme-lens-flash" />
        </div>
    );
};

export default Theme3DTransition;
