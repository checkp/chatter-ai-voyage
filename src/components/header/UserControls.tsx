
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { User, LogOut, Sparkles } from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';
import TokenBalance from '@/components/TokenBalance';
import ChangelogDialog from '@/components/ChangelogDialog';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserControlsProps {
  user: SupabaseUser;
  onSignOut: () => void;
  setActiveTab: (tab: string) => void;
}

const UserControls: React.FC<UserControlsProps> = ({
  user,
  onSignOut,
  setActiveTab
}) => {
  const [showChangelog, setShowChangelog] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <TokenBalance user={user} onPurchaseClick={() => setActiveTab('settings')} />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <ModeToggle />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle theme</p>
          </TooltipContent>
        </Tooltip>
        
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>User menu</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowChangelog(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              What's New?
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangelogDialog 
        open={showChangelog} 
        onOpenChange={setShowChangelog} 
      />
    </>
  );
};

export default UserControls;
