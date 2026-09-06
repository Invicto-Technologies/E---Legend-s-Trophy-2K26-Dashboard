import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../contexts/ThemeContext';

// --- Helper to generate high-resolution 3D embossed gold stamp texture ---
function createBallStampTexture(edition = '2K26') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 1024, 1024);

    const cx = 512;
    const cy = 512;

    // 1. Outer Ornamental Gilded Championship Rings
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 440, 0, Math.PI * 2);
    ctx.lineWidth = 7;
    const ringGrad = ctx.createLinearGradient(cx - 350, cy - 350, cx + 350, cy + 350);
    ringGrad.addColorStop(0, '#fef08a');
    ringGrad.addColorStop(0.3, '#f59e0b');
    ringGrad.addColorStop(0.6, '#ffd700');
    ringGrad.addColorStop(1, '#92400e');
    ctx.strokeStyle = ringGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.stroke();

    // Inner fine dotted perimeter ring
    ctx.beginPath();
    ctx.arc(cx, cy, 420, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.setLineDash([9, 9]);
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
    ctx.stroke();
    ctx.restore();

    // 2. Stars & Tournament Laurel Header/Footer
    ctx.save();
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    ctx.font = '900 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★   ★   ★', cx, cy - 200);

    ctx.font = '800 24px sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('★  OFFICIAL MATCH BALL  ★', cx, cy + 205);
    ctx.restore();

    // 3. Metallic Gold Gradient Helper
    const createGoldGradient = (yStart, yEnd) => {
        const g = ctx.createLinearGradient(0, yStart, 0, yEnd);
        g.addColorStop(0, '#ffffff'); // bright 3D top bevel edge
        g.addColorStop(0.18, '#fef08a');
        g.addColorStop(0.48, '#fbbf24');
        g.addColorStop(0.76, '#d97706');
        g.addColorStop(1, '#78350f'); // deep base shadow
        return g;
    };

    // 4. Text Row 1: "E - Legend's"
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 86px "Montserrat", "Outfit", "Arial Black", sans-serif';

    // Deep 3D Stamped Cast Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 6;

    // Dark chiseled outer bevel
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#451a03';
    ctx.strokeText("E - Legend's", cx, cy - 72);

    // Rich metallic gold fill
    ctx.fillStyle = createGoldGradient(cy - 120, cy - 20);
    ctx.fillText("E - Legend's", cx, cy - 72);

    // Fine inner specular highlight line
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.strokeText("E - Legend's", cx, cy - 74);
    ctx.restore();

    // 5. Text Row 2: "Trophy 2K26"
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 100px "Montserrat", "Outfit", "Arial Black", sans-serif';

    // Deep 3D Stamped Cast Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 7;

    // Dark chiseled outer bevel
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#451a03';
    ctx.strokeText(`Trophy ${edition}`, cx, cy + 68);

    // Rich metallic gold fill
    ctx.fillStyle = createGoldGradient(cy + 15, cy + 125);
    ctx.fillText(`Trophy ${edition}`, cx, cy + 68);

    // Fine inner specular highlight line
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.strokeText(`Trophy ${edition}`, cx, cy + 66);
    ctx.restore();

    return canvas;
}

// --- Helper to create a curved spherical cap geometry with planar UV projection facing +Z ---
function createSphericalCapGeometry(radius, thetaAngle) {
    const geo = new THREE.SphereGeometry(radius, 64, 64, 0, Math.PI * 2, 0, thetaAngle);
    // Rotate geometry vertices so pole faces +Z directly (towards the viewer)
    geo.rotateX(Math.PI / 2);

    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const rCap = radius * Math.sin(thetaAngle);

    // Planar orthographic UV mapping:
    // x maps directly to U (left to right: -rCap to +rCap -> 0 to 1)
    // y maps directly to V (bottom to top: -rCap to +rCap -> 0 to 1)
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        uv.setXY(i, x / (2 * rCap) + 0.5, y / (2 * rCap) + 0.5);
    }
    uv.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
}

const ThreeCricketScene = ({ className = '', height = '520px', edition = '2K26' }) => {
    const containerRef = useRef(null);
    const lightsRef = useRef({});
    const { isDark } = useTheme();

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let width = container.clientWidth || 600;
        let containerHeight = container.clientHeight || 520;

        // Scene, Camera, Renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / containerHeight, 0.1, 1000);
        camera.position.z = 7;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, containerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        // --- Cricket Ball Group ---
        const ballGroup = new THREE.Group();
        scene.add(ballGroup);

        // 1. Red Leather Sphere
        const ballGeometry = new THREE.SphereGeometry(1.6, 64, 64);
        const ballMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xa8111e,
            emissive: 0x220205,
            roughness: 0.28,
            metalness: 0.15,
            clearcoat: 0.6,
            clearcoatRoughness: 0.2
        });
        const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
        ballGroup.add(ballMesh);

        // 2. White Seam (Raised Torus circling between the two surfaces)
        const seamGeometry = new THREE.TorusGeometry(1.61, 0.04, 16, 120);
        const seamMaterial = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.5,
            metalness: 0.1
        });
        const seamMesh = new THREE.Mesh(seamGeometry, seamMaterial);
        seamMesh.rotation.set(0, 0, 0); // Positioned between +Z and -Z hemispheres
        ballGroup.add(seamMesh);

        // 3. Stitched Accent Rings on either side of the seam
        const seamRing1 = new THREE.TorusGeometry(1.605, 0.015, 8, 100);
        const seamRingMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
        const ringMesh1 = new THREE.Mesh(seamRing1, seamRingMat);
        ringMesh1.position.set(0, 0, 0.05);
        ballGroup.add(ringMesh1);

        const ringMesh2 = new THREE.Mesh(seamRing1, seamRingMat);
        ringMesh2.position.set(0, 0, -0.05);
        ballGroup.add(ringMesh2);

        // 4. 3D Gold Embossed Stamps on BOTH Surfaces of the Ball
        const stampCanvas = createBallStampTexture(edition);

        // Surface 1 (Side A: Front Hemisphere facing +Z)
        const capGeo1 = createSphericalCapGeometry(1.606, Math.PI / 4.6);
        const stampTex1 = new THREE.CanvasTexture(stampCanvas);
        stampTex1.anisotropy = 8;
        const stampMat1 = new THREE.MeshPhysicalMaterial({
            map: stampTex1,
            transparent: true,
            depthWrite: false,
            roughness: 0.22,
            metalness: 0.85,
            clearcoat: 0.9,
            clearcoatRoughness: 0.15,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const stampMesh1 = new THREE.Mesh(capGeo1, stampMat1);
        stampMesh1.rotation.set(0, 0, 0); // Faces +Z directly (upright & un-mirrored)
        ballGroup.add(stampMesh1);

        // Surface 2 (Side B: Opposite Hemisphere facing -Z)
        const capGeo2 = createSphericalCapGeometry(1.606, Math.PI / 4.6);
        const stampTex2 = new THREE.CanvasTexture(stampCanvas);
        stampTex2.anisotropy = 8;
        const stampMat2 = new THREE.MeshPhysicalMaterial({
            map: stampTex2,
            transparent: true,
            depthWrite: false,
            roughness: 0.22,
            metalness: 0.85,
            clearcoat: 0.9,
            clearcoatRoughness: 0.15,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const stampMesh2 = new THREE.Mesh(capGeo2, stampMat2);
        stampMesh2.rotation.set(0, Math.PI, 0); // Rotated 180° around Y to face -Z (upright & un-mirrored)
        ballGroup.add(stampMesh2);

        // Initial 3D ball angle showcasing the tilted seam and embossed face
        ballGroup.rotation.set(0.32, 0.45, -0.22);

        // --- Orbiting Neon Energy Dust Particles ---
        const particleCount = 180;
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);

        const cyanColor = new THREE.Color(0x00f0ff);
        const goldColor = new THREE.Color(0xf59e0b);

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + (Math.random() * 0.2);
            const radius = 2.4 + Math.random() * 1.8;
            const y = (Math.random() - 0.5) * 2.2;

            particlePositions[i * 3] = Math.cos(angle) * radius;
            particlePositions[i * 3 + 1] = y;
            particlePositions[i * 3 + 2] = Math.sin(angle) * radius;

            const chosenColor = Math.random() > 0.4 ? cyanColor : goldColor;
            particleColors[i * 3] = chosenColor.r;
            particleColors[i * 3 + 1] = chosenColor.g;
            particleColors[i * 3 + 2] = chosenColor.b;
        }

        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.055,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });

        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particleSystem);

        // --- Shockwave Pulse Ring (Triggered on click) ---
        const shockwaveGeo = new THREE.RingGeometry(0.1, 0.25, 64);
        const shockwaveMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0
        });
        const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
        scene.add(shockwaveMesh);
        let shockwaveAnim = { active: false, scale: 0.1, opacity: 0 };

        // --- Lights ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const mainSpot = new THREE.DirectionalLight(0xffffff, 2.0);
        mainSpot.position.set(5, 6, 7);
        scene.add(mainSpot);

        // Cyan rim light from bottom left
        const cyanRim = new THREE.PointLight(0x00f0ff, 3.5, 15);
        cyanRim.position.set(-5, -3, 3);
        scene.add(cyanRim);

        // Gold rim light from top right
        const goldRim = new THREE.PointLight(0xf59e0b, 2.5, 15);
        goldRim.position.set(4, 5, -2);
        scene.add(goldRim);

        // Dynamic mouse spotlight
        const mouseLight = new THREE.PointLight(0x38bdf8, 2, 8);
        mouseLight.position.set(0, 0, 4);
        scene.add(mouseLight);

        // Store lights for dynamic theme transitions
        lightsRef.current = { ambientLight, mainSpot, cyanRim, goldRim };

        // --- Interactions (Mouse Move, Drag, Click) ---
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        const onMouseMove = (e) => {
            const rect = container.getBoundingClientRect();
            const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

            targetX = normX * 0.6;
            targetY = normY * 0.6;

            mouseLight.position.x = normX * 3;
            mouseLight.position.y = normY * 3;

            if (isDragging) {
                const deltaX = e.clientX - previousMousePosition.x;
                const deltaY = e.clientY - previousMousePosition.y;
                ballGroup.rotation.y += deltaX * 0.01;
                ballGroup.rotation.x += deltaY * 0.01;
            }
            previousMousePosition = { x: e.clientX, y: e.clientY };
        };

        const onMouseDown = (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        };

        const onMouseUp = () => {
            isDragging = false;
        };

        const onClick = () => {
            // Trigger energetic shockwave
            shockwaveAnim = { active: true, scale: 1.6, opacity: 0.9 };
            shockwaveMesh.scale.set(1, 1, 1);
            shockwaveMesh.lookAt(camera.position);

            // Ball bounce pulse
            ballGroup.scale.set(1.15, 1.15, 1.15);
        };

        container.addEventListener('mousemove', onMouseMove);
        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        container.addEventListener('click', onClick);

        // --- Resize Handler ---
        const handleResize = () => {
            if (!container) return;
            width = container.clientWidth || 600;
            containerHeight = container.clientHeight || 520;
            camera.aspect = width / containerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(width, containerHeight);
        };

        window.addEventListener('resize', handleResize);

        // --- Animation Loop ---
        let animationFrameId;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();

            // Smooth parallax lerp
            mouseX += (targetX - mouseX) * 0.05;
            mouseY += (targetY - mouseY) * 0.05;

            // Natural ball rotation when not dragging
            if (!isDragging) {
                ballGroup.rotation.y += 0.008;
                ballGroup.rotation.x = 0.35 + Math.sin(elapsedTime * 0.8) * 0.1 + mouseY * 0.5;
                ballGroup.position.x = mouseX * 0.8;
                ballGroup.position.y = mouseY * 0.8 + Math.sin(elapsedTime * 1.5) * 0.08;
            }

            // Smoothly restore bounce scale
            ballGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);

            // Rotate particle dust
            particleSystem.rotation.y = -elapsedTime * 0.12;
            particleSystem.rotation.x = Math.sin(elapsedTime * 0.2) * 0.15;

            // Animate shockwave
            if (shockwaveAnim.active) {
                shockwaveAnim.scale += 0.12;
                shockwaveAnim.opacity -= 0.025;
                shockwaveMesh.scale.set(shockwaveAnim.scale, shockwaveAnim.scale, 1);
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
            container.removeEventListener('mousemove', onMouseMove);
            container.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('click', onClick);

            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }

            ballGeometry.dispose();
            ballMaterial.dispose();
            seamGeometry.dispose();
            seamMaterial.dispose();
            capGeo1.dispose();
            capGeo2.dispose();
            stampMat1.dispose();
            stampMat2.dispose();
            stampTex1.dispose();
            stampTex2.dispose();
            particleGeometry.dispose();
            particleMaterial.dispose();
            shockwaveGeo.dispose();
            shockwaveMat.dispose();
            renderer.dispose();
        };
    }, [edition]);

    useEffect(() => {
        const { ambientLight, mainSpot, cyanRim, goldRim } = lightsRef.current;
        if (!ambientLight || !mainSpot) return;

        if (isDark) {
            ambientLight.intensity = 0.7;
            mainSpot.intensity = 2.0;
            mainSpot.color.setHex(0xffffff);
            if (cyanRim) cyanRim.intensity = 3.5;
            if (goldRim) goldRim.intensity = 2.5;
        } else {
            ambientLight.intensity = 1.15;
            mainSpot.intensity = 2.85;
            mainSpot.color.setHex(0xfff8eb);
            if (cyanRim) cyanRim.intensity = 2.0;
            if (goldRim) goldRim.intensity = 3.4;
        }
    }, [isDark]);

    return (
        <div
            ref={containerRef}
            className={`three-cricket-container ${className}`}
            style={{
                width: '100%',
                height,
                position: 'relative',
                cursor: 'grab',
                overflow: 'hidden'
            }}
        />
    );
};

export default ThreeCricketScene;
