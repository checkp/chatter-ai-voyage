
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Settings, User, LogOut } from 'lucide-react';
import ChatModeSelector from './ChatModeSelector';
import ProfileDialog from './ProfileDialog';
import type { ChatMode } from '@/types/chat';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface MobileMenuProps {
  user: SupabaseUser | null;
  currentChatMode: ChatMode;
  onChatModeChange?: (mode: ChatMode) => void;
  isolatedMode?: boolean;
  onIsolatedToggle?: (isolated: boolean) => void;
  onSettingsClick: () => void;
  onSignOut: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  user,
  currentChatMode,
  onChatModeChange,
  isolatedMode,
  onIsolatedToggle,
  onSettingsClick,
  onSignOut
}) => {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const handleProfileClick = () => {
    setProfileDialogOpen(true);
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Access your account and preferences.
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6 space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" />
                <AvatarFallback className="bg-amber-200 text-amber-800">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.email?.split('@')[0] || 'User'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={handleProfileClick}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={onSettingsClick}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={onSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            <ChatModeSelector 
              currentMode={currentChatMode}
              onModeChange={onChatModeChange || (() => {})}
              isolatedMode={isolatedMode || false}
              onIsolatedToggle={onIsolatedToggle || (() => {})}
              className="mt-4"
            />
          </div>
        </SheetContent>
      </Sheet>

      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        user={user}
      />
    </>
  );
};

export default MobileMenu;
