import { useEffect, useRef } from 'react';

const DOT_SPACING = 24;
const DOT_RADIUS = 1;
const GLOW_RADIUS = 150;
const FADE_SPEED = 0.02;

interface Dot {
  x: number;
  y: number;
  opacity: number;
  targetOpacity: number;
}

const DotGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x: mouseX, y: mouseY } = mouseRef.current;

      for (const dot of dotsRef.current) {
        const dx = dot.x - mouseX;
        const dy = dot.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate target opacity based on distance from mouse
        if (distance < GLOW_RADIUS) {
          dot.targetOpacity = Math.max(0.1, 1 - distance / GLOW_RADIUS);
        } else {
          dot.targetOpacity = 0;
        }

        // Smoothly interpolate opacity
        if (dot.opacity < dot.targetOpacity) {
          dot.opacity = Math.min(dot.targetOpacity, dot.opacity + FADE_SPEED * 2);
        } else {
          dot.opacity = Math.max(dot.targetOpacity, dot.opacity - FADE_SPEED);
        }

        // Only draw if visible
        if (dot.opacity > 0.01) {
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(148, 163, 184, ${dot.opacity * 0.5})`;
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default DotGrid;
