'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SidebarContent } from './Sidebar';

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border bg-card">
      {/* App title on the start side (right in RTL) */}
      <span className="text-lg font-bold text-foreground">מיכל CRM</span>

      {/* Hamburger button on the end side (left in RTL) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="פתח תפריט">
              <Menu className="h-5 w-5" />
            </Button>
          }
        />
        <SheetContent side="right" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </header>
  );
}
