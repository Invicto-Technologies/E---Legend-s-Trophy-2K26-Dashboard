import React, { useRef, useState, useCallback } from 'react';
import './TiltCard.css';

const TiltCard = ({
    children,
    className = '',
    maxTilt = 15,
    perspective = 1000,
    glare = true,
    scale = 1.02,
    onClick,
    style = {}
}) => {
    const cardRef = useRef(null);
    const [transform, setTransform] = useState('');
    const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

    const handleMouseMove = useCallback((e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = -((y - centerY) / centerY) * maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        setTransform(`perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`);
        
        if (glare) {
            setGlarePos({
                x: (x / rect.width) * 100,
                y: (y / rect.height) * 100,
                opacity: 0.35
            });
        }
    }, [maxTilt, perspective, scale, glare]);

    const handleMouseLeave = useCallback(() => {
        setTransform(`perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`);
        setGlarePos(prev => ({ ...prev, opacity: 0 }));
    }, [perspective]);

    return (
        <div
            ref={cardRef}
            className={`tilt-card-wrapper ${className}`}
            style={{ ...style, transform }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
        >
            <div className="tilt-card-inner">
                {children}
            </div>
            {glare && (
                <div
                    className="tilt-card-glare"
                    style={{
                        background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(0, 240, 255, 0.45) 0%, rgba(255, 255, 255, 0.1) 30%, transparent 70%)`,
                        opacity: glarePos.opacity
                    }}
                />
            )}
        </div>
    );
};

export default TiltCard;
