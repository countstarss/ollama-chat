import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Code,
  Database,
  ChevronRight,
  NotebookTabs,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { SidebarNavItem } from "./SidebarNavItem"
import { SidebarRecentItem } from "./SidebarRecentItem"

export function SidebarNav() {
  const [openPlayground, setOpenPlayground] = React.useState(true)
  const [openNotes, setOpenNotes] = React.useState(true)

  return (
    <div className="flex-1 px-3 py-4">
      <SidebarNavItem
        // MARK: Models
        icon={<Database className="h-4 w-4" />}
        label="Models"
        href="/models"
      />

      <Collapsible
        // MARK: Notes
        open={openNotes}
        onOpenChange={setOpenNotes}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between pl-2 mb-1 font-normal"
          >
            <div className="flex items-center gap-2">
              <NotebookTabs className="h-4 w-4" />
              <span>Notes</span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                openNotes ? "rotate-90" : ""
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-6 space-y-1">
          <SidebarRecentItem
            label="History"
            href="/history"
          />
          <SidebarRecentItem
            label="Starred"
            href="/starred"
          />
        </CollapsibleContent>
      </Collapsible>


        

      <Collapsible
        // MARK: Recently
        open={openPlayground}
        onOpenChange={setOpenPlayground}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between pl-2 mb-1 font-normal"
          >
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span>Recently</span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                openPlayground ? "rotate-90" : ""
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-6 space-y-1">
          <SidebarRecentItem
            label="History"
            href="/history"
          />
          <SidebarRecentItem
            label="Starred"
            href="/starred"
          />
        </CollapsibleContent>
      </Collapsible>

      {/* 其他导航项 */}
      {/* <SidebarNavItem
        icon={<Database className="h-4 w-4" />}
        label="Models"
        href="/models"
      />
      <SidebarNavItem
        icon={<BookOpen className="h-4 w-4" />}
        label="Documentation"
        href="/documentation"
      /> */}
    </div>
  )
} 