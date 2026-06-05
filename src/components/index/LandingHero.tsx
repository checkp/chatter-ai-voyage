
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

const LandingHero: React.FC = () => {
  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="text-center max-w-4xl mx-auto mb-8 md:mb-16">
      {/* Cloud-shaped Launch button — warm palette, no background scene */}
      <div className="flex justify-center mb-8 md:mb-12">
        <button
          onClick={handleGetStarted}
          aria-label="Launch RoboHeard"
          className="group transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 rounded-full"
          style={{ filter: 'drop-shadow(0 18px 32px rgba(180, 120, 60, 0.25))' }}
        >
          <svg
            viewBox="0 0 280 160"
            className="w-64 sm:w-80 md:w-[28rem]"
            aria-hidden
          >
            <defs>
              <radialGradient id="cloudWarm" cx="50%" cy="38%" r="75%">
                <stop offset="0%" stopColor="#fff8ee" />
                <stop offset="55%" stopColor="#ffe8c8" />
                <stop offset="100%" stopColor="#f5b97a" />
              </radialGradient>
            </defs>
            <path
              d="M60,120 Q20,120 20,85 Q20,55 55,55 Q60,25 100,30 Q120,5 155,20 Q190,5 215,35 Q255,30 255,70 Q280,80 270,110 Q265,135 235,135 L75,135 Q60,135 60,120 Z"
              fill="url(#cloudWarm)"
              stroke="#fff4e0"
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
                fontSize: '44px',
                fill: '#7a3b12',
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
                fill: '#b07a4a',
                letterSpacing: '3px',
              }}
            >
              STEP INSIDE →
            </text>
          </svg>
        </button>
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

export default LandingHero;
