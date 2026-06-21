
import React, { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

const LandingHero: React.FC = () => {
  const driftRef = useRef<HTMLDivElement>(null);

  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  useEffect(() => {
    const el = driftRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    let currentX = rect.left + width / 2;
    let currentY = rect.top + height / 2;
    let mouseX = currentX;
    let mouseY = currentY;
    let lagX = currentX;
    let lagY = currentY;

    // Scroll "wind" — kicks the cloud off the page, then decays slowly.
    let windTarget = 0; // raw gust accumulator
    let windY = 0;      // smoothed value actually applied
    let lastScrollY = window.scrollY;
    let rafId = 0;

    el.style.position = 'fixed';
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.zIndex = '50';
    el.style.transform = `translate(${currentX - width / 2}px, ${currentY - height / 2}px)`;

    const handleMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleScroll = () => {
      const sy = window.scrollY;
      const delta = sy - lastScrollY;
      lastScrollY = sy;
      // Gust blows OPPOSITE the scroll direction (feels right on Mac natural scroll):
      // scroll down → cloud lifts up; scroll up → cloud sinks down.
      windTarget -= delta * 1.6;
      windTarget = Math.max(-3000, Math.min(3000, windTarget));
    };

    const tick = () => {
      const t = performance.now() / 1000;

      // Original laggy mouse-follow drift.
      lagX += (mouseX - lagX) * 0.03;
      lagY += (mouseY - lagY) * 0.03;

      const danceX = Math.sin(t * 0.6) * 14 + Math.sin(t * 1.25) * 7;
      const danceY = Math.cos(t * 0.5) * 14 + Math.cos(t * 1.15) * 7;

      // Smoothly ramp wind toward its target so individual scroll ticks don't jitter.
      windY += (windTarget - windY) * 0.12;

      const targetX = lagX + danceX;
      const targetY = lagY + danceY + windY;

      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const distance = Math.hypot(dx, dy) || 1;

      const minEase = 0.005;
      const maxEase = 0.025;
      const slowDistance = 300;
      const ease = minEase + (maxEase - minEase) * Math.min(1, distance / slowDistance);

      currentX += dx * ease;
      currentY += dy * ease;

      // Keep the cloud on the visible page — no escaping over the top/sides.
      const halfW = width / 2;
      const halfH = height / 2;
      const pad = 8;
      currentX = Math.max(halfW + pad, Math.min(window.innerWidth - halfW - pad, currentX));
      currentY = Math.max(halfH + pad, Math.min(window.innerHeight - halfH - pad, currentY));

      // Wind dies down gradually so the cloud lazily drifts back to the cursor.
      windTarget *= 0.985;
      if (Math.abs(windTarget) < 0.1) windTarget = 0;

      el.style.transform = `translate(${currentX - width / 2}px, ${currentY - height / 2}px)`;
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('scroll', handleScroll, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);


  return (
    <div className="text-center md:text-left max-w-4xl mx-auto md:mx-0">
      {/* Logo only on mobile — sits above everything */}
      <img
        src="/lovable-uploads/92b3bb27-34db-484c-846e-a12471753b7e.png"
        alt="RoboHeard Logo"
        className="md:hidden w-full max-w-[140px] h-auto object-contain mx-auto mb-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => window.location.href = '/auth'}
      />

      <div className="flex justify-center md:justify-start mb-2">
        <Badge variant="outline" className="text-primary border-primary/20">
          <Sparkles className="mr-2 h-4 w-4" />
          2026 — Agentic AI, refined
        </Badge>
      </div>

      <h1
        className="font-bold text-foreground mb-3 md:mb-4 leading-tight"
        style={{ fontSize: 'clamp(1.75rem, 4.5vw + 0.5rem, 3.75rem)' }}
      >
        Eight Frontier Models,
        <span className="text-primary"> One Conductor</span>
      </h1>

      <p
        className="text-muted-foreground mb-4 md:mb-6 leading-relaxed px-2 md:px-0"
        style={{ fontSize: 'clamp(0.95rem, 1.1vw + 0.5rem, 1.15rem)' }}
      >
        A quiet orchestrator for <strong>GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2, Mistral, Perplexity</strong> and now <strong>Qwen</strong>.
        Compare answers side by side, run live market research, or let eight minds debate a single question — together.
      </p>

      {/* Cloud-shaped Start button — dynamically sized to the viewport so it
          never gets pushed off-screen on short displays. */}
      <div className="flex justify-center md:justify-start">
        <div ref={driftRef} style={{ willChange: 'transform' }}>
          <button
            onClick={handleGetStarted}
            aria-label="Launch RoboHeard"
            className="group focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 rounded-full hover:scale-105 transition-transform duration-300"
            style={{
              filter: 'drop-shadow(0 14px 22px rgba(180, 150, 50, 0.35)) drop-shadow(0 4px 8px rgba(120, 100, 30, 0.2))',
              animation: 'cloudFloat 5s ease-in-out infinite',
              width: 'clamp(150px, 22vh, 240px)',
            }}
          >
            <svg
              viewBox="0 0 280 160"
              className="w-full h-auto"
              aria-hidden
            >
              <defs>
                <radialGradient id="cloudWarm" cx="50%" cy="38%" r="75%">
                  <stop offset="0%" stopColor="#fffbe0" />
                  <stop offset="55%" stopColor="#ffe89a" />
                  <stop offset="100%" stopColor="#e8b94a" />
                </radialGradient>
              </defs>
              <path
                d="M60,120 Q20,120 20,85 Q20,55 55,55 Q60,25 100,30 Q120,5 155,20 Q190,5 215,35 Q255,30 255,70 Q280,80 270,110 Q265,135 235,135 L75,135 Q60,135 60,120 Z"
                fill="url(#cloudWarm)"
                stroke="#fff5c2"
                strokeWidth="2"
              />
              <text
                x="140"
                y="100"
                textAnchor="middle"
                className="select-none"
                style={{
                  fontFamily: '"Fredoka", "Nunito", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '52px',
                  fill: '#6b4a12',
                  letterSpacing: '1px',
                }}
              >
                Start
              </text>
            </svg>
          </button>
        </div>
        <style>{`
          @keyframes cloudFloat {
            0%, 100% { transform: translate(0, 0) rotate(-0.5deg); }
            25%      { transform: translate(4px, -6px) rotate(0.4deg); }
            50%      { transform: translate(-2px, -10px) rotate(-0.3deg); }
            75%      { transform: translate(-5px, -4px) rotate(0.5deg); }
          }
        `}</style>
      </div>

    </div>
  );
};

export default LandingHero;
