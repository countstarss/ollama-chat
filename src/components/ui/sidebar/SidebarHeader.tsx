"use client";

import { Building2 } from "lucide-react";

export function SidebarHeader() {
  return (
    <div className="flex h-13 items-center border-b px-4 py-3 w-full">
      <div className="flex items-center gap-2 w-full">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary mr-4">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-medium">Insight Lab</h2>
      </div>
    </div>
  );
}
