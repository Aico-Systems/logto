import { useEffect, useRef, useState } from 'react';

import styles from './index.module.scss';
import ThreeHandLayer, { type HandProjectionData } from './ThreeHandLayer';

const DOT_SPACING = 24;
const DOT_RADIUS = 1;
const GLOW_RADIUS = 150;
const HAND_GLOW_RADIUS = 48;
const HAND_LINE_MAX_LENGTH = DOT_SPACING * 2.4;
const FADE_SPEED = 0.02;

interface Dot {
  x: number;
  y: number;
  opacity: number;
  targetOpacity: number;
}

const DotGrid = () => {
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const handProjectionRef = useRef<HandProjectionData>({ points: [], segments: [] });
  const animationRef = useRef<number>();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [handDebugMode, setHandDebugMode] = useState(false);

  useEffect(() => {
    const isReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isHandDebugMode =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('handDebug') === '1';

    setPrefersReducedMotion(isReducedMotion);
    setHandDebugMode(isHandDebugMode);

    const canvas = trailCanvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initDots();
    };

    const initDots = () => {
      dotsRef.current = [];
      const cols = Math.ceil(canvas.width / DOT_SPACING) + 1;
      const rows = Math.ceil(canvas.height / DOT_SPACING) + 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          dotsRef.current.push({
            x: col * DOT_SPACING,
            y: row * DOT_SPACING,
            opacity: 0,
            targetOpacity: 0,
          });
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    const animate = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      const { x: mouseX, y: mouseY } = mouseRef.current;

      for (const dot of dotsRef.current) {
        const mouseDx = dot.x - mouseX;
        const mouseDy = dot.y - mouseY;
        const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

        let targetOpacity = 0;

        if (mouseDistance < GLOW_RADIUS) {
          targetOpacity = Math.max(0.1, 1 - mouseDistance / GLOW_RADIUS);
        }

        for (const point of handProjectionRef.current.points) {
          const handDx = dot.x - point.x;
          const handDy = dot.y - point.y;
          const handDistance = Math.sqrt(handDx * handDx + handDy * handDy);

          if (handDistance < HAND_GLOW_RADIUS) {
            const handInfluence = (1 - handDistance / HAND_GLOW_RADIUS) * point.intensity;
            targetOpacity = Math.max(targetOpacity, handInfluence);
          }
        }

        dot.targetOpacity = targetOpacity;

        if (dot.opacity < dot.targetOpacity) {
          dot.opacity = Math.min(dot.targetOpacity, dot.opacity + FADE_SPEED * 2);
        } else {
          dot.opacity = Math.max(dot.targetOpacity, dot.opacity - FADE_SPEED);
        }

        if (dot.opacity > 0.01) {
          context.beginPath();
          context.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
          context.fillStyle = `rgba(148, 163, 184, ${dot.opacity * 0.5})`;
          context.fill();
        }
      }

      for (const segment of handProjectionRef.current.segments) {
        const x1 = Math.round(segment.x1 / DOT_SPACING) * DOT_SPACING;
        const y1 = Math.round(segment.y1 / DOT_SPACING) * DOT_SPACING;
        const x2 = Math.round(segment.x2 / DOT_SPACING) * DOT_SPACING;
        const y2 = Math.round(segment.y2 / DOT_SPACING) * DOT_SPACING;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > HAND_LINE_MAX_LENGTH || length < 2) {
          continue;
        }

        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.strokeStyle = `rgba(113, 232, 255, ${0.11 * segment.intensity})`;
        context.lineWidth = 0.8;
        context.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    if (isReducedMotion) {
      animate();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      animate();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className={handDebugMode ? `${styles.dotGrid} ${styles.dotGridDebug}` : styles.dotGrid}>
      <canvas ref={trailCanvasRef} className={styles.trailCanvas} />
      <ThreeHandLayer
        modelUrl="/models/groove.glb"
        reduceMotion={prefersReducedMotion}
        onProjectionUpdate={(projection) => {
          handProjectionRef.current = projection;
        }}
      />
    </div>
  );
};

export default DotGrid;
