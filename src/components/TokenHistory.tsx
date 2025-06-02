
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Coins, TrendingUp, TrendingDown, Gift, Settings } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import { formatDistanceToNow } from 'date-fns';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface TokenHistoryProps {
  user: SupabaseUser;
}

const TokenHistory: React.FC<TokenHistoryProps> = ({ user }) => {
  const { tokenBalance, transactions, isLoadingBalance, isLoadingTransactions } = useTokens(user);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'consumption':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'refund':
        return <Gift className="w-4 h-4 text-blue-600" />;
      case 'admin_adjustment':
        return <Settings className="w-4 h-4 text-purple-600" />;
      default:
        return <Coins className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'text-green-600';
      case 'consumption':
        return 'text-red-600';
      case 'refund':
        return 'text-blue-600';
      case 'admin_adjustment':
        return 'text-purple-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatTransactionType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoadingBalance || isLoadingTransactions) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="space-y-4 pt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Token Balance Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokenBalance?.balance?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">tokens available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokenBalance?.total_purchased?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">tokens bought</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Used</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokenBalance?.total_consumed?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">tokens consumed</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.transaction_type)}
                      <div>
                        <div className="font-medium">
                          {formatTransactionType(transaction.transaction_type)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.description}
                        </div>
                        {transaction.metadata && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            {transaction.metadata.model && (
                              <div>Model: {transaction.metadata.model}</div>
                            )}
                            {transaction.metadata.platform && (
                              <div>Platform: {transaction.metadata.platform}</div>
                            )}
                            {transaction.metadata.total_tokens && (
                              <div>API Tokens: {transaction.metadata.total_tokens.toLocaleString()}</div>
                            )}
                            {transaction.metadata.api_cost_dollars && (
                              <div>API Cost: ${transaction.metadata.api_cost_dollars.toFixed(4)}</div>
                            )}
                            {transaction.metadata.api_cost_per_1k_tokens && (
                              <div>Rate: ${transaction.metadata.api_cost_per_1k_tokens}/1k tokens</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono ${getTransactionColor(transaction.transaction_type)}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Balance: {transaction.balance_after.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No transactions yet. Start using AI agents to see your usage history.
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenHistory;
