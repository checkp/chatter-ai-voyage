import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { RefreshCw, UploadCloud } from 'lucide-react';

interface PricingRow {
  id?: string;
  platform: string;
  model_id: string;
  cost_tier: 'low' | 'medium' | 'high';
  tokens_per_message: number;
  api_cost_per_1k_tokens: number | null;
  created_at?: string;
  updated_at?: string;
}

const AdminModelPricing: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<PricingRow[]>({
    queryKey: ['model-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_pricing')
        .select('*')
        .order('platform', { ascending: true })
        .order('model_id', { ascending: true });
      if (error) throw error;
      return data as PricingRow[];
    },
  });

  const { mutate: syncPricing, isPending } = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-model-pricing', {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (res: any) => {
      toast.success(`Pricing synced (created: ${res?.created ?? 0}, updated: ${res?.updated ?? 0})`);
      queryClient.invalidateQueries({ queryKey: ['model-pricing'] });
      refetch();
    },
    onError: (err: any) => {
      console.error('Sync pricing failed', err);
      toast.error(err?.message || 'Failed to sync model pricing');
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Model Pricing</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => syncPricing()} disabled={isPending}>
            <UploadCloud className="w-4 h-4 mr-2" /> Sync from providers
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading pricing...</div>
        ) : (
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Model ID</TableHead>
                  <TableHead>Cost tier</TableHead>
                  <TableHead className="text-right">Tokens/msg</TableHead>
                  <TableHead className="text-right">$ per 1k tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data && data.length > 0 ? (
                  data.map((row) => (
                    <TableRow key={`${row.platform}-${row.model_id}`}>
                      <TableCell className="font-medium">{row.platform}</TableCell>
                      <TableCell>{row.model_id}</TableCell>
                      <TableCell className="capitalize">{row.cost_tier}</TableCell>
                      <TableCell className="text-right">{row.tokens_per_message}</TableCell>
                      <TableCell className="text-right">
                        {row.api_cost_per_1k_tokens != null ? `$${row.api_cost_per_1k_tokens}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No pricing data found. Click "Sync from providers" to seed.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminModelPricing;
