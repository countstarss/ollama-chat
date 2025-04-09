"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ChevronsUpDown,
  Building2,
  Settings,
  BookOpen,
  Code,
  History,
  Star,
  ChevronRight,
  Database,
} from "lucide-react"
import { useSidebar } from "./context/sidebar-context"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type NavItemProps = {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  href?: string
  onClick?: () => void
}

const NavItem = ({ icon, label, isActive, href, onClick }: NavItemProps) => {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-2 pl-2 mb-1",
        isActive && "bg-accent text-accent-foreground"
      )}
      onClick={onClick}
      asChild={!!href}
    >
      {href ? (
        <a href={href}>
          {icon}
          <span>{label}</span>
        </a>
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </Button>
  )
}

export function Sidebar() {
  const { isCollapsed } = useSidebar()
  const [openPlayground, setOpenPlayground] = React.useState(true)

  return (
    <div 
      className={cn(
        "group fixed top-0 left-0 h-full w-[180px] md:w-[260px] overflow-auto flex flex-col bg-background border-r transition-all duration-300",
        isCollapsed ? "-translate-x-full" : "translate-x-0"
      )}
    >
      {/* 顶部组织信息 */}
      <div className="flex h-14 items-center border-b px-4 py-2 w-full justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              Acme Inc
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ChevronsUpDown className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">Enterprise</div>
          </div>
        </div>
      </div>

      {/* 导航区域 */}
      <div className="flex-1 px-3 py-4">
        {/* 平台标题 */}
        <div className="mb-2">
          <h2 className="px-2 text-xs font-semibold text-muted-foreground">
            Platform
          </h2>
        </div>

        {/* Playground 折叠菜单 */}
        <Collapsible
          open={openPlayground}
          onOpenChange={setOpenPlayground}
          className="mb-2"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between pl-2 mb-1 font-normal"
            >
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <span>Playground</span>
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
            <NavItem
              icon={<History className="h-4 w-4" />}
              label="History"
              href="/history"
            />
            <NavItem
              icon={<Star className="h-4 w-4" />}
              label="Starred"
              href="/starred"
            />
            <NavItem
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              href="/playground/settings"
            />
          </CollapsibleContent>
        </Collapsible>

        {/* 其他导航项 */}
        <NavItem
          icon={<Database className="h-4 w-4" />}
          label="Models"
          href="/models"
        />
        <NavItem
          icon={<BookOpen className="h-4 w-4" />}
          label="Documentation"
          href="/documentation"
        />
        <NavItem
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          href="/settings"
        />
      </div>

      {/* 底部用户信息 */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">shadcn</div>
            <div className="text-xs text-muted-foreground">m@example.com</div>
          </div>
        </div>
      </div>
    </div>
  )
} 