import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../contexts/ThemeContext';

const ThreeStadiumRadarScene = ({ className = '', height = '360px' }) => {
    const containerRef = useRef(null);
    const lightsRef = useRef({});
    const { isDark } = useTheme();

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let width = container.clientWidth || 500;
        let containerHeight = container.clientHeight || 360;

        // 1. Scene, Camera, Renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, width / containerHeight, 0.1, 1000);
        camera.position.set(0, 1.8, 5.2);
        camera.lookAt(0, 0.45, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, containerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        // Main 3D Pitch & Radar Group
        const radarGroup = new THREE.Group();
        scene.add(radarGroup);

        // 2. Holographic Radar Base (Concentric Rings on Pitch)
        const pitchBaseGroup = new THREE.Group();
        pitchBaseGroup.rotation.x = -Math.PI / 2;
        pitchBaseGroup.position.y = -0.2;
        radarGroup.add(pitchBaseGroup);

        // Concentric Rings
        const createRing = (innerR, outerR, colorHex, opacityVal) => {
            const geo = new THREE.RingGeometry(innerR, outerR, 64);
            const mat = new THREE.MeshBasicMaterial({
                color: colorHex,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: opacityVal,
                blending: THREE.AdditiveBlending
            });
            return new THREE.Mesh(geo, mat);
        };

        const ringOuter = createRing(2.35, 2.40, 0x00f0ff, 0.65);
        const ringMid = createRing(1.65, 1.68, 0x0284c7, 0.45);
        const ringInner = createRing(0.95, 0.98, 0x0284c7, 0.55);
        const ringCenter = createRing(0.28, 0.30, 0x00f0ff, 0.7);

        pitchBaseGroup.add(ringOuter, ringMid, ringInner, ringCenter);

        // Crosshairs / Grid lines
        const gridMat = new THREE.LineBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending
        });
        const crosshairGeoX = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-2.4, 0, 0),
            new THREE.Vector3(2.4, 0, 0)
        ]);
        const crosshairGeoY = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -2.4, 0),
            new THREE.Vector3(0, 2.4, 0)
        ]);
        const lineX = new THREE.Line(crosshairGeoX, gridMat);
        const lineY = new THREE.Line(crosshairGeoY, gridMat);
        pitchBaseGroup.add(lineX, lineY);

        // Rotating Radar Sweep Wedge
        const radarSweepGeo = new THREE.CircleGeometry(2.35, 32, 0, Math.PI / 3);
        const radarSweepMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.16,
            blending: THREE.AdditiveBlending
        });
        const radarSweepMesh = new THREE.Mesh(radarSweepGeo, radarSweepMat);
        pitchBaseGroup.add(radarSweepMesh);

        // 3. 3D Wooden Wickets & Bails
        const wicketsGroup = new THREE.Group();
        wicketsGroup.position.set(0, -0.2, -0.35);
        radarGroup.add(wicketsGroup);

        const stumpGeo = new THREE.CylinderGeometry(0.038, 0.038, 1.35, 16);
        const stumpMat = new THREE.MeshStandardMaterial({
            color: 0x9a5b28,
            roughness: 0.28,
            metalness: 0.12
        });

        // 3 Stumps
        const stumpLeft = new THREE.Mesh(stumpGeo, stumpMat);
        stumpLeft.position.set(-0.24, 0.675, 0);
        stumpLeft.castShadow = true;

        const stumpCenter = new THREE.Mesh(stumpGeo, stumpMat);
        stumpCenter.position.set(0, 0.675, 0);
        stumpCenter.castShadow = true;

        const stumpRight = new THREE.Mesh(stumpGeo, stumpMat);
        stumpRight.position.set(0.24, 0.675, 0);
        stumpRight.castShadow = true;

        wicketsGroup.add(stumpLeft, stumpCenter, stumpRight);

        // 2 Bails
        const bailGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.24, 12);
        const bailMat = new THREE.MeshStandardMaterial({
            color: 0xc88242,
            roughness: 0.35,
            metalness: 0.1
        });

        const bailLeft = new THREE.Mesh(bailGeo, bailMat);
        bailLeft.rotation.z = Math.PI / 2;
        bailLeft.position.set(-0.12, 1.37, 0);

        const bailRight = new THREE.Mesh(bailGeo, bailMat);
        bailRight.rotation.z = Math.PI / 2;
        bailRight.position.set(0.12, 1.37, 0);

        wicketsGroup.add(bailLeft, bailRight);

        // 4. Floating 3D Cricket Ball
        const ballGroup = new THREE.Group();
        ballGroup.position.set(0, 0.65, 0.7);
        radarGroup.add(ballGroup);

        const ballGeo = new THREE.SphereGeometry(0.48, 36, 36);
        const ballMat = new THREE.MeshPhysicalMaterial({
            color: 0xaa1320,
            emissive: 0x240306,
            roughness: 0.26,
            metalness: 0.18,
            clearcoat: 0.7,
            clearcoatRoughness: 0.2
        });
        const ballMesh = new THREE.Mesh(ballGeo, ballMat);
        ballGroup.add(ballMesh);

        // White Ball Seam
        const seamGeo = new THREE.TorusGeometry(0.485, 0.016, 12, 64);
        const seamMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.4
        });
        const seamMesh = new THREE.Mesh(seamGeo, seamMat);
        seamMesh.rotation.x = Math.PI / 2;
        ballGroup.add(seamMesh);

        // Orbiting Hologram Energy Halo around wickets & ball
        const haloGeo = new THREE.TorusGeometry(1.25, 0.015, 12, 80);
        const haloMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.rotation.x = 1.1;
        haloMesh.rotation.y = 0.4;
        radarGroup.add(haloMesh);

        // 5. Rising Energy Telemetry Particles
        const particleCount = 90;
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSpeeds = new Float32Array(particleCount);
        const particleColors = new Float32Array(particleCount * 3);

        const cyanColor = new THREE.Color(0x00f0ff);
        const blueColor = new THREE.Color(0x0284c7);

        for (let i = 0; i < particleCount; i++) {
            const rad = Math.random() * 2.2;
            const theta = Math.random() * Math.PI * 2;
            particlePositions[i * 3] = Math.cos(theta) * rad;
            particlePositions[i * 3 + 1] = Math.random() * 2.5 - 0.2;
            particlePositions[i * 3 + 2] = Math.sin(theta) * rad;

            particleSpeeds[i] = 0.008 + Math.random() * 0.015;

            const c = Math.random() > 0.4 ? cyanColor : blueColor;
            particleColors[i * 3] = c.r;
            particleColors[i * 3 + 1] = c.g;
            particleColors[i * 3 + 2] = c.b;
        }

        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 0.045,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending
        });
        const particleSystem = new THREE.Points(particleGeo, particleMat);
        radarGroup.add(particleSystem);

        // 6. Interactive Shockwave Ring
        const shockwaveGeo = new THREE.RingGeometry(0.1, 0.16, 48);
        const shockwaveMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });
        const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
        shockwaveMesh.rotation.x = -Math.PI / 2;
        shockwaveMesh.position.y = -0.19;
        radarGroup.add(shockwaveMesh);

        let shockwaveAnim = { active: false, radius: 0.1, opacity: 0 };

        // 7. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
        dirLight.position.set(3, 5, 4);
        scene.add(dirLight);

        const cyanPointLight = new THREE.PointLight(0x00f0ff, 2.5, 10);
        cyanPointLight.position.set(0, 0.4, 1.2);
        scene.add(cyanPointLight);

        const bluePointLight = new THREE.PointLight(0x0284c7, 2.0, 8);
        bluePointLight.position.set(0, 1.6, -0.6);
        scene.add(bluePointLight);

        lightsRef.current = { ambientLight, dirLight, cyanPointLight, bluePointLight };

        // 8. Mouse / Touch Parallax
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        const onMouseMove = (e) => {
            const rect = container.getBoundingClientRect();
            targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        };

        const onClick = () => {
            shockwaveAnim = { active: true, radius: 0.1, opacity: 0.9 };
            shockwaveMesh.scale.set(1, 1, 1);
            ballGroup.scale.set(1.15, 1.15, 1.15);
        };

        container.addEventListener('mousemove', onMouseMove);
        container.addEventListener('click', onClick);

        // 9. Resize Handler
        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth || 500;
            const h = container.clientHeight || 360;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener('resize', handleResize);

        let resizeObserver;
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(() => {
                handleResize();
            });
            resizeObserver.observe(container);
        }

        // 10. Animation Loop
        let animationFrameId;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();

            // Smooth parallax lerp
            mouseX += (targetX - mouseX) * 0.05;
            mouseY += (targetY - mouseY) * 0.05;

            radarGroup.rotation.y = mouseX * 0.35;
            radarGroup.rotation.x = mouseY * 0.18;

            // Rotate radar sweep beam
            radarSweepMesh.rotation.z -= 0.022;

            // Float & rotate ball
            ballGroup.position.y = 0.62 + Math.sin(elapsed * 2.2) * 0.08;
            ballGroup.rotation.y += 0.012;
            ballGroup.rotation.x = Math.sin(elapsed * 1.2) * 0.15 + 0.25;
            ballGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.06);

            // Rotate outer rings slowly
            ringOuter.rotation.z += 0.003;
            ringMid.rotation.z -= 0.004;
            haloMesh.rotation.z += 0.008;

            // Animate telemetry particles rising
            const pos = particleGeo.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                pos[i * 3 + 1] += particleSpeeds[i];
                if (pos[i * 3 + 1] > 2.3) {
                    pos[i * 3 + 1] = -0.2;
                }
            }
            particleGeo.attributes.position.needsUpdate = true;

            // Animate shockwave on click
            if (shockwaveAnim.active) {
                shockwaveAnim.radius += 0.09;
                shockwaveAnim.opacity -= 0.028;
                shockwaveMesh.scale.set(shockwaveAnim.radius * 6, shockwaveAnim.radius * 6, 1);
                shockwaveMat.opacity = Math.max(0, shockwaveAnim.opacity);

                if (shockwaveAnim.opacity <= 0) {
                    shockwaveAnim.active = false;
                }
            }

            renderer.render(scene, camera);
        };

        animate();

        // Cleanup
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            if (resizeObserver) resizeObserver.disconnect();
            container.removeEventListener('mousemove', onMouseMove);
            container.removeEventListener('click', onClick);

            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }

            // Disposals
            renderer.dispose();
        };
    }, []);

    // Theme adaptive lights
    useEffect(() => {
        const { ambientLight, dirLight, cyanPointLight, bluePointLight } = lightsRef.current;
        if (!ambientLight || !dirLight) return;

        if (isDark) {
            ambientLight.intensity = 0.7;
            dirLight.intensity = 2.2;
            if (cyanPointLight) cyanPointLight.intensity = 3.0;
            if (bluePointLight) bluePointLight.intensity = 2.2;
        } else {
            ambientLight.intensity = 1.15;
            dirLight.intensity = 2.8;
            if (cyanPointLight) cyanPointLight.intensity = 1.8;
            if (bluePointLight) bluePointLight.intensity = 1.4;
        }
    }, [isDark]);

    return (
        <div
            ref={containerRef}
            className={`three-stadium-radar-container ${className}`}
            style={{
                width: '100%',
                height,
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden'
            }}
        />
    );
};

export default ThreeStadiumRadarScene;
