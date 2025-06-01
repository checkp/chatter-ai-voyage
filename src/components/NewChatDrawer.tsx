
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface NewChatDrawerProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  newChatTitle: string;
  setNewChatTitle: (title: string) => void;
  onCreateChat: () => void;
  isLoading: boolean;
}

const NewChatDrawer: React.FC<NewChatDrawerProps> = ({
  isOpen,
  setIsOpen,
  newChatTitle,
  setNewChatTitle,
  onCreateChat,
  isLoading
}) => {
  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New Chat</DrawerTitle>
          <DrawerDescription>
            Enter a title for the new chat.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <Input
            type="text"
            placeholder="Chat title"
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
          />
        </div>
        <DrawerFooter>
          <Button onClick={onCreateChat} disabled={isLoading}>
            Create Chat
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default NewChatDrawer;
