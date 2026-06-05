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

const randomBubble = (): Bubble => {
  const isQuote = Math.random() < 0.35;
  const pool = isQuote ? ANTI_AI_QUOTES : SHEEP_TALK;
  const text = pool[Math.floor(Math.random() * pool.length)];
  const pos = positions[Math.floor(Math.random() * positions.length)];
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
    let timer: number;
    const pop = () => {
      const bubble = randomBubble();
      setBubbles((prev) => [...prev.slice(-3), bubble]);
      // remove after lifetime
      window.setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
      }, 2600);
      timer = window.setTimeout(pop, 900 + Math.random() * 1800);
    };
    timer = window.setTimeout(pop, 600);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            top: b.top,
            left: b.left,
            transform: `rotate(${b.rotate}deg)`,
            animation: 'bubblePop 2.6s ease-out forwards',
          }}
        >
          {b.variant === 'sheep' ? (
            <div
              className="relative px-4 py-2 rounded-2xl bg-white border-[3px] border-foreground text-foreground font-extrabold text-base md:text-lg whitespace-nowrap"
              style={{
                fontFamily: '"Fredoka", "Bangers", "Comic Sans MS", system-ui, sans-serif',
                boxShadow: '4px 4px 0 hsl(var(--foreground))',
              }}
            >
              {b.text}
              <span
                className="absolute -bottom-2 left-6 w-0 h-0"
                style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '10px solid hsl(var(--foreground))',
                }}
              />
              <span
                className="absolute -bottom-[5px] left-[27px] w-0 h-0"
                style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '7px solid white',
                }}
              />
            </div>
          ) : (
            <div
              className="relative px-4 py-2 rounded-2xl bg-[hsl(var(--primary))] border-[3px] border-foreground text-foreground font-bold text-sm md:text-base max-w-[220px] text-center"
              style={{
                fontFamily: '"Fredoka", "Bangers", system-ui, sans-serif',
                boxShadow: '4px 4px 0 hsl(var(--foreground))',
              }}
            >
              “{b.text}”
              <span
                className="absolute -bottom-2 right-6 w-0 h-0"
                style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '10px solid hsl(var(--foreground))',
                }}
              />
            </div>
          )}
        </div>
      ))}
      <style>{`
        @keyframes bubblePop {
          0%   { opacity: 0; transform: scale(0.5) translateY(8px) rotate(var(--r, 0deg)); }
          15%  { opacity: 1; transform: scale(1.1) translateY(0) rotate(var(--r, 0deg)); }
          25%  { transform: scale(1) translateY(0) rotate(var(--r, 0deg)); }
          85%  { opacity: 1; transform: scale(1) translateY(-4px) rotate(var(--r, 0deg)); }
          100% { opacity: 0; transform: scale(0.9) translateY(-12px) rotate(var(--r, 0deg)); }
        }
      `}</style>
    </div>
  );
};

export default SheepBubbles;
