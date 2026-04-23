import React from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import { Button } from './button';

interface DrawerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function DrawerModal({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  children 
}: DrawerModalProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 dark:bg-black/60 z-[60]" />
        <Drawer.Content
          className="bg-card flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-[60] outline-none max-h-[96dvh] overflow-hidden"
        >
          {/* Swipe Handle */}
          <div className="w-10 h-1.5 bg-muted rounded-full mx-auto mt-3 mb-4 flex-shrink-0" />
          
          <div className="px-4 pb-3 border-b border-gray-100 dark:border-gray-800 relative flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white pr-8">{title}</h2>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{description}</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="absolute top-0 right-2 p-2 h-auto w-auto rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5 text-gray-500 hover:text-gray-900 dark:hover:text-white" />
            </Button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] outline-none">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
