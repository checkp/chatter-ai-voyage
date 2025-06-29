
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Calendar, Mail, User as UserIcon } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserWithTokens {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  balance: number;
  total_purchased: number;
  total_consumed: number;
  has_completed_onboarding: boolean;
}

interface AdminUsersTableProps {
  users: UserWithTokens[];
  currentUser: SupabaseUser;
  isLoading: boolean;
  onToggleAdmin: (userId: string, currentIsAdmin: boolean) => void;
}

const AdminUsersTable: React.FC<AdminUsersTableProps> = ({
  users,
  currentUser,
  isLoading,
  onToggleAdmin,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          All Users ({users?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((userData) => (
                  <TableRow key={userData.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {userData.full_name || 'No name'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {userData.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        {userData.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Balance: <span className="font-medium">{userData.balance}</span></div>
                        <div className="text-xs text-muted-foreground">
                          Purchased: {userData.total_purchased} | Used: {userData.total_consumed}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={userData.is_admin ? "default" : "secondary"}>
                        {userData.is_admin ? 'Admin' : 'User'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {formatDate(userData.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={userData.has_completed_onboarding ? "outline" : "secondary"}>
                        {userData.has_completed_onboarding ? 'Active' : 'New'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onToggleAdmin(userData.id, userData.is_admin)}
                        disabled={userData.id === currentUser.id}
                      >
                        {userData.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUsersTable;
