'use client'

import { cn } from "@/lib/utils"
import { useSidebar } from "../../context/sidebar-context"
import { SidebarHeader } from "./SidebarHeader"
import { SidebarNav } from "./SidebarNav"
import { SidebarFooter } from "./SidebarFotter"
import ContextMenuWrapper from "../context-menu-wrapper"
export function Sidebar() {
  const { isCollapsed } = useSidebar()

  return (
    <ContextMenuWrapper>
      <div 
        className={cn(
          "group fixed top-0 left-0 h-full w-[180px] md:w-[260px] overflow-auto flex flex-col bg-background border-r transition-all duration-300",
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)"
        }}
      >
        <SidebarHeader />
        <SidebarNav />
        <SidebarFooter />
      </div>
    </ContextMenuWrapper>
  )
}

export * from "./SidebarHeader"
export * from "./SidebarNav"
export * from "./SidebarNavItem"