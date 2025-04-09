import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

export type NavItemProps = {
  label: string
  isActive?: boolean
  href?: string
  onClick?: () => void
}

export function SidebarRecentItem({ label, isActive, href, onClick }: NavItemProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-[calc(100%-16px)] justify-start gap-2 pl-2 mb-1 ml-4",
        isActive && "bg-accent text-accent-foreground"
      )}
      onClick={onClick}
      asChild={!!href}
    >
      {href ? (
        <a href={href}>
          <span>{label}</span>
        </a>
      ) : (
        <>
          <span>{label}</span>
        </>
      )}
    </Button>
  )
} 