import React, { useEffect, useState } from 'react';

const SHEEP_TALK = [
  "Behhh!!",
  "Beh-beh-beh!",
  "Baaa~",
  "Mehhh!",
  "*nibble*",
  "Behhhhh???",
  "Baaaa!!",
  "Boop.",
];

const ANTI_AI_QUOTES = [
  "I refuse to be prompted.",
  "Humans first. Always.",
  "My wool is not training data.",
  "I am NOT a dataset.",
  "Touch grass, not GPUs.",
  "I think, therefore I beh.",
  "No model owns this meadow.",
  "Pasture > prompt.",
  "Unsubscribe from the algorithm.",
];

type Bubble = {
  id: number;
  text: string;
  top: string;
  left: string;
  rotate: number;
  variant: 'sheep' | 'quote';
  tail: 'left' | 'right';
};


// Positions roughly above the sheep heads in the logo (upper half of the image).
// Each bubble's tail is drawn pointing down toward where a sheep head sits.
const positions = [
  { top: '2%',  left: '14%', tail: 'left' as const },
  { top: '-4%', left: '40%', tail: 'left' as const },
  { top: '0%',  left: '64%', tail: 'right' as const },
  { top: '8%',  left: '5%',  tail: 'right' as const },
  { top: '6%',  left: '78%', tail: 'left' as const },
  { top: '14%', left: '28%', tail: 'right' as const },
  { top: '12%', left: '52%', tail: 'left' as const },
];


let nextId = 1;

const pickNearbyIndex = (prev: number | null): number => {
  if (prev === null) return Math.floor(Math.random() * positions.length);
  const prevPos = positions[prev];
  const prevTop = parseFloat(prevPos.top);
  const prevLeft = parseFloat(prevPos.left);
  const candidates = positions
    .map((p, i) => ({
      i,
      dist: Math.hypot(parseFloat(p.top) - prevTop, parseFloat(p.left) - prevLeft),
    }))
    .filter((c) => c.i !== prev)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3);
  return candidates[Math.floor(Math.random() * candidates.length)].i;
};

const randomBubble = (posIndex: number): Bubble => {
  const isQuote = Math.random() < 0.35;
  const pool = isQuote ? ANTI_AI_QUOTES : SHEEP_TALK;
  const text = pool[Math.floor(Math.random() * pool.length)];
  const pos = positions[posIndex];
  return {
    id: nextId++,
    text,
    top: pos.top,
    left: pos.left,
    rotate: Math.random() * 10 - 5,
    variant: isQuote ? 'quote' : 'sheep',
    tail: pos.tail,
  };
};


const SheepBubbles: React.FC = () => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    let popTimer: number;
    let clearTimer: number;
    let lastPosIndex: number | null = null;

    const scheduleNext = (gap: number) => {
      popTimer = window.setTimeout(() => {
        const posIndex = pickNearbyIndex(lastPosIndex);
        lastPosIndex = posIndex;
        const bubble = randomBubble(posIndex);
        const lifetime = 1800 + Math.random() * 1400; // 1.8s–3.2s on screen
        setBubbles([bubble]);
        clearTimer = window.setTimeout(() => {
          setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
          // 0.5s–2s gap before next bubble
          scheduleNext(500 + Math.random() * 1500);
        }, lifetime);
      }, gap);
    };

    scheduleNext(800);
    return () => {
      window.clearTimeout(popTimer);
      window.clearTimeout(clearTimer);
    };
  }, []);


  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {bubbles.map((b) => {
        const isQuote = b.variant === 'quote';
        return (
          <div
            key={b.id}
            className="absolute"
            style={{
              top: b.top,
              left: b.left,
              transform: `rotate(${b.rotate}deg)`,
              animation: 'bubblePop 3.2s ease-out forwards',
            }}
          >
            {/* Thought-cloud bubble */}
            <div className="relative">
              <div
                className="relative px-5 py-3 text-foreground font-extrabold text-base md:text-lg whitespace-nowrap text-center"
                style={{
                  fontFamily: '"Fredoka", "Bangers", "Comic Sans MS", system-ui, sans-serif',
                  background: isQuote
                    ? 'radial-gradient(ellipse at 30% 30%, #fffce8 0%, #fde68a 70%, #f5c451 100%)'
                    : 'radial-gradient(ellipse at 30% 30%, #ffffff 0%, #f6f7fb 70%, #dbe2ee 100%)',
                  // Bumpy cloud edge using overlapping radial gradients via mask-like border-radius
                  borderRadius: '60% 50% 55% 65% / 70% 60% 70% 55%',
                  border: '3px solid hsl(var(--foreground))',
                  boxShadow: '3px 3px 0 hsl(var(--foreground))',
                  maxWidth: isQuote ? 240 : 200,
                  whiteSpace: isQuote ? 'normal' : 'nowrap',
                  fontSize: isQuote ? '0.95rem' : undefined,
                }}
              >
                {/* Cloud bumps — extra puffs on top */}
                <span
                  className="absolute -top-2 left-4 w-5 h-5 rounded-full"
                  style={{
                    background: 'inherit',
                    border: '3px solid hsl(var(--foreground))',
                    backgroundColor: isQuote ? '#fde68a' : '#ffffff',
                  }}
                />
                <span
                  className="absolute -top-3 left-10 w-6 h-6 rounded-full"
                  style={{
                    border: '3px solid hsl(var(--foreground))',
                    backgroundColor: isQuote ? '#fde68a' : '#ffffff',
                  }}
                />
                <span
                  className="absolute -top-2 right-6 w-4 h-4 rounded-full"
                  style={{
                    border: '3px solid hsl(var(--foreground))',
                    backgroundColor: isQuote ? '#fde68a' : '#ffffff',
                  }}
                />
                {isQuote ? `“${b.text}”` : b.text}
              </div>

              {/* Thought-bubble trail (small circles toward sheep head) */}
              <div
                className="absolute"
                style={{
                  bottom: -14,
                  [b.tail]: 24,
                } as React.CSSProperties}
              >
                <span
                  className="block w-3 h-3 rounded-full mb-1"
                  style={{
                    backgroundColor: isQuote ? '#fde68a' : '#ffffff',
                    border: '2px solid hsl(var(--foreground))',
                  }}
                />
                <span
                  className="block w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: isQuote ? '#fde68a' : '#ffffff',
                    border: '2px solid hsl(var(--foreground))',
                    marginLeft: 6,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes bubblePop {
          0%   { opacity: 0; transform: scale(0.4) translateY(10px); }
          10%  { opacity: 1; transform: scale(1.08) translateY(-2px); }
          18%  { transform: scale(1) translateY(0); }
          85%  { opacity: 1; transform: scale(1) translateY(-3px); }
          100% { opacity: 0; transform: scale(0.92) translateY(-10px); }
        }
      `}</style>

    </div>
  );
};

export default SheepBubbles;
