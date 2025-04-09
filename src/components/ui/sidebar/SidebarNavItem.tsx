import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

export type NavItemProps = {
  icon: ReactNode
  label: string
  isActive?: boolean
  href?: string
  onClick?: () => void
}

export function SidebarNavItem({ icon, label, isActive, href, onClick }: NavItemProps) {
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