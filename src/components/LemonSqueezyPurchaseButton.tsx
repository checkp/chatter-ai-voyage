import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  packageId: string;
  packageName: string;
  priceCents: number;
  disabled?: boolean;
  hasVariant: boolean;
  /** Stable seed (e.g. package id) to keep the float out of sync across siblings */
  seed?: string;
}

const hashSeed = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const LemonSqueezyPurchaseButton: React.FC<Props> = ({
  packageId,
  priceCents,
  disabled,
  hasVariant,
  seed,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Per-instance float so the clouds bob out of sync
  const { delay, duration, rotate, radius } = useMemo(() => {
    const h = hashSeed(seed ?? packageId);
    return {
      delay: -((h % 1700) / 1000), // negative offset so they start mid-cycle
      duration: 2.6 + ((h >> 3) % 1800) / 1000, // 2.6s – 4.4s
      rotate: ((h >> 7) % 7) - 3, // -3..+3deg
      radius: [
        60 + ((h >> 2) % 12),
        50 + ((h >> 5) % 14),
        55 + ((h >> 9) % 12),
        65 + ((h >> 11) % 10),
        70 + ((h >> 4) % 8),
        60 + ((h >> 6) % 14),
        70 + ((h >> 8) % 8),
        55 + ((h >> 10) % 14),
      ],
    };
  }, [packageId, seed]);

  const handlePurchase = async () => {
    if (!hasVariant) {
      toast.error('Lemon Squeezy not configured for this package yet.');
      return;
    }
    try {
      setIsLoading(true);
      const session = (await supabase.auth.getSession()).data.session;
      const res = await supabase.functions.invoke('create-lemonsqueezy-checkout', {
        body: { package_id: packageId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message || 'Failed to create checkout');
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (e: any) {
      console.error('Lemon Squeezy purchase error:', e);
      toast.error('Checkout failed: ' + e.message);
      setIsLoading(false);
    }
  };

  const dollars = Math.round(priceCents / 100);
  const isDisabled = disabled || isLoading || !hasVariant;

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={handlePurchase}
        disabled={isDisabled}
        title={!hasVariant ? 'Not configured yet' : `Buy for $${dollars}`}
        className="group relative animate-float hover:-translate-y-1 active:translate-y-0 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        style={{
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          transform: `rotate(${rotate}deg)`,
        }}
      >
        {/* Cloud body */}
        <div
          className="relative px-6 py-3 whitespace-nowrap text-foreground font-extrabold text-xl"
          style={{
            fontFamily: '"Fredoka", "Bangers", "Comic Sans MS", system-ui, sans-serif',
            background:
              'radial-gradient(ellipse at 30% 30%, #ffffff 0%, #f6f7fb 70%, #dbe2ee 100%)',
            borderRadius: `${radius[0]}% ${radius[1]}% ${radius[2]}% ${radius[3]}% / ${radius[4]}% ${radius[5]}% ${radius[6]}% ${radius[7]}%`,
            border: '3px solid hsl(var(--foreground))',
            boxShadow: '3px 3px 0 hsl(var(--foreground))',
          }}
        >
          {/* Cloud puffs */}
          <span
            className="absolute -top-2 left-4 w-5 h-5 rounded-full bg-white"
            style={{ border: '3px solid hsl(var(--foreground))' }}
          />
          <span
            className="absolute -top-3 left-10 w-6 h-6 rounded-full bg-white"
            style={{ border: '3px solid hsl(var(--foreground))' }}
          />
          <span
            className="absolute -top-2 right-5 w-4 h-4 rounded-full bg-white"
            style={{ border: '3px solid hsl(var(--foreground))' }}
          />

          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              ...
            </span>
          ) : (
            <span>$ {dollars}</span>
          )}
        </div>
      </button>
    </div>
  );
};

export default LemonSqueezyPurchaseButton;
