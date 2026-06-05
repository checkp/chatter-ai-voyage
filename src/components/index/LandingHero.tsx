
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

const LandingHero: React.FC = () => {
  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="text-center max-w-4xl mx-auto mb-8 md:mb-16">
      {/* Pastoral grassland scene with cloud-shaped Launch button */}
      <div className="relative mb-8 md:mb-12 rounded-3xl overflow-hidden shadow-xl">
        {/* Sky → grass background */}
        <div
          className="relative w-full aspect-[16/10] sm:aspect-[16/8] md:aspect-[16/7]"
          style={{
            background:
              'linear-gradient(to bottom, #bde4ff 0%, #d8f0ff 35%, #b8e07a 55%, #7cc04a 80%, #5ba83a 100%)',
          }}
        >
          {/* Sun */}
          <div
            className="absolute top-6 right-10 w-16 h-16 rounded-full opacity-90"
            style={{
              background: 'radial-gradient(circle, #fff7c2 0%, #ffe066 60%, #ffd43b 100%)',
              boxShadow: '0 0 60px rgba(255, 224, 102, 0.7)',
            }}
            aria-hidden
          />

          {/* Distant clouds */}
          <svg
            className="absolute top-4 left-8 w-24 opacity-80"
            viewBox="0 0 120 50"
            aria-hidden
          >
            <path
              d="M20,35 Q10,35 10,25 Q10,15 22,15 Q26,5 40,8 Q50,0 62,8 Q78,5 80,18 Q95,18 95,28 Q95,40 80,40 L25,40 Q20,40 20,35 Z"
              fill="white"
              opacity="0.9"
            />
          </svg>
          <svg
            className="absolute top-12 left-1/2 -translate-x-1/2 w-20 opacity-70"
            viewBox="0 0 120 50"
            aria-hidden
          >
            <path
              d="M20,35 Q10,35 10,25 Q10,15 22,15 Q26,5 40,8 Q50,0 62,8 Q78,5 80,18 Q95,18 95,28 Q95,40 80,40 L25,40 Q20,40 20,35 Z"
              fill="white"
            />
          </svg>

          {/* Rolling hills */}
          <svg
            className="absolute bottom-0 left-0 w-full"
            viewBox="0 0 800 120"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0,80 Q150,30 320,70 T640,60 T800,75 L800,120 L0,120 Z"
              fill="#6fb83a"
              opacity="0.6"
            />
            <path
              d="M0,95 Q200,55 420,85 T800,90 L800,120 L0,120 Z"
              fill="#5ba83a"
            />
          </svg>

          {/* Robosheep flock — bottom of field */}
          <div className="absolute bottom-3 left-0 right-0 flex items-end justify-center gap-3 sm:gap-5 px-4">
            <Robosheep className="w-10 sm:w-12 md:w-14" delay="0s" />
            <Robosheep className="w-12 sm:w-16 md:w-20" delay="0.4s" />
            <Robosheep className="w-9 sm:w-11 md:w-12" delay="0.8s" />
            <Robosheep className="w-11 sm:w-14 md:w-16" delay="0.2s" />
            <Robosheep className="w-10 sm:w-12 md:w-14" delay="0.6s" />
          </div>

          {/* Cloud-shaped Launch button — centered */}
          <button
            onClick={handleGetStarted}
            aria-label="Launch RoboHeard"
            className="group absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70 rounded-full"
            style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.18))' }}
          >
            <svg
              viewBox="0 0 280 160"
              className="w-56 sm:w-72 md:w-96"
              aria-hidden
            >
              <defs>
                <radialGradient id="cloudFill" cx="50%" cy="40%" r="70%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="70%" stopColor="#f4f9ff" />
                  <stop offset="100%" stopColor="#dceafd" />
                </radialGradient>
              </defs>
              <path
                d="M60,120 Q20,120 20,85 Q20,55 55,55 Q60,25 100,30 Q120,5 155,20 Q190,5 215,35 Q255,30 255,70 Q280,80 270,110 Q265,135 235,135 L75,135 Q60,135 60,120 Z"
                fill="url(#cloudFill)"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x="140"
                y="92"
                textAnchor="middle"
                className="select-none"
                style={{
                  fontFamily: '"Fredoka", "Nunito", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '42px',
                  fill: '#1e3a8a',
                  letterSpacing: '1px',
                }}
              >
                Launch
              </text>
              <text
                x="140"
                y="115"
                textAnchor="middle"
                style={{
                  fontFamily: '"Nunito", system-ui, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  fill: '#6b7a99',
                  letterSpacing: '3px',
                }}
              >
                STEP INTO THE FIELD →
              </text>
            </svg>
          </button>
        </div>

        {/* Secondary action below scene */}
        <div className="bg-background/80 backdrop-blur-sm py-3 text-center">
          <button
            onClick={handleGetStarted}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            or peek inside without signing up
          </button>
        </div>
      </div>

      {/* Logo only on mobile */}
      <img
        src="/lovable-uploads/92b3bb27-34db-484c-846e-a12471753b7e.png"
        alt="RoboHeard Logo"
        className="md:hidden w-full max-w-[180px] h-auto object-contain mx-auto mb-4 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => window.location.href = '/auth'}
      />

      <Badge variant="outline" className="mb-4 md:mb-6 text-primary border-primary/20">
        <Sparkles className="mr-2 h-4 w-4" />
        2026 — Agentic AI Is Here
      </Badge>

      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6">
        Seven Frontier Models,
        <span className="text-primary"> One Conductor</span>
      </h1>

      <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 leading-relaxed px-4 md:px-0">
        Our <strong>Conductor AI</strong> orchestrates GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2, Mistral, and Perplexity
        in real-time debates — seven frontier models as one collaborative super-intelligence.
      </p>
    </div>
  );
};

/* Cute robosheep — fluffy cloud body, little metal head, antenna with blinking light */
const Robosheep: React.FC<{ className?: string; delay?: string }> = ({ className, delay = '0s' }) => (
  <div className={className} style={{ animation: `roboBob 3s ease-in-out ${delay} infinite` }}>
    <svg viewBox="0 0 100 90" className="w-full h-auto">
      {/* Legs */}
      <rect x="28" y="62" width="6" height="14" rx="2" fill="#4a4a55" />
      <rect x="66" y="62" width="6" height="14" rx="2" fill="#4a4a55" />
      {/* Fluffy body */}
      <ellipse cx="50" cy="52" rx="32" ry="20" fill="#fafbfc" />
      <circle cx="26" cy="48" r="10" fill="#fafbfc" />
      <circle cx="74" cy="48" r="10" fill="#fafbfc" />
      <circle cx="38" cy="38" r="11" fill="#ffffff" />
      <circle cx="62" cy="38" r="11" fill="#ffffff" />
      <circle cx="50" cy="34" r="10" fill="#ffffff" />
      {/* Metal head */}
      <rect x="62" y="40" width="22" height="18" rx="5" fill="#9aa3b2" />
      <rect x="62" y="40" width="22" height="6" rx="3" fill="#b8c0cc" />
      {/* Eye / visor */}
      <rect x="66" y="46" width="14" height="6" rx="2" fill="#1f2937" />
      <circle cx="70" cy="49" r="1.2" fill="#7cf2ff" />
      <circle cx="76" cy="49" r="1.2" fill="#7cf2ff" />
      {/* Antenna */}
      <line x1="73" y1="40" x2="73" y2="30" stroke="#6b7280" strokeWidth="1.5" />
      <circle cx="73" cy="29" r="2.5" fill="#ff4d6d">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Ear tag */}
      <rect x="58" y="52" width="4" height="3" rx="1" fill="#fbbf24" />
    </svg>
    <style>{`
      @keyframes roboBob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
    `}</style>
  </div>
);

export default LandingHero;
