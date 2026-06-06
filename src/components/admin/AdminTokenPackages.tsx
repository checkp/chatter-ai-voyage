import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TokenPackage } from '@/types/tokens';

const AdminTokenPackages: React.FC = () => {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['admin-token-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_packages')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as TokenPackage[];
    },
  });

  const handleSave = async (pkg: TokenPackage) => {
    const newVal = (edits[pkg.id] ?? pkg.lemonsqueezy_variant_id ?? '').trim();
    try {
      setSavingId(pkg.id);
      const { error } = await supabase
        .from('token_packages')
        .update({ lemonsqueezy_variant_id: newVal || null })
        .eq('id', pkg.id);
      if (error) throw error;
      toast.success(`Updated ${pkg.name}`);
      queryClient.invalidateQueries({ queryKey: ['admin-token-packages'] });
      queryClient.invalidateQueries({ queryKey: ['token-packages'] });
    } catch (e: any) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Packages — Lemon Squeezy Variant IDs</CardTitle>
        <p className="text-sm text-muted-foreground">
          Map each package to its Lemon Squeezy variant ID (find it in your LS dashboard under
          Products → Variants). Leave empty to disable Lemon Squeezy for that package.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {packages?.map((pkg) => {
          const current = edits[pkg.id] ?? pkg.lemonsqueezy_variant_id ?? '';
          const dirty = current !== (pkg.lemonsqueezy_variant_id ?? '');
          return (
            <div key={pkg.id} className="flex items-end gap-3 border-b pb-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">
                  {pkg.name} — {pkg.tokens.toLocaleString()} tokens / ${(pkg.price_cents / 100).toFixed(2)}
                </Label>
                <Input
                  value={current}
                  placeholder="e.g. 1234567"
                  onChange={(e) => setEdits({ ...edits, [pkg.id]: e.target.value })}
                />
              </div>
              <Button
                onClick={() => handleSave(pkg)}
                disabled={!dirty || savingId === pkg.id}
                size="sm"
              >
                {savingId === pkg.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Save className="w-4 h-4 mr-1" /> Save</>
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AdminTokenPackages;
