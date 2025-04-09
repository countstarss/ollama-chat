import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronUp, Sparkles, User, CreditCard, Bell, Settings, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

export function SidebarFooter() {
  const router = useRouter()

  const handleAction = (action: string) => {
    switch (action) {
      case 'upgrade':
        router.push('/upgrade')
        break
      case 'account':
        router.push('/account')
        break
      case 'billing':
        router.push('/billing')
        break
      case 'notifications':
        router.push('/notifications')
        break
      case 'settings':
        router.push('/settings')
        break
      case 'logout':
        // 处理登出逻辑
        console.log('Logging out...')
        break
      default:
        break
    }
  }

  return (
    <div className="p-2 rounded-xl">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <div className=" bg-neutral-200 dark:bg-neutral-900 p-4 flex items-center gap-2 w-full rounded-sm">
              <Avatar className="h-7 w-7">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>SC</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">shadcn</div>
                <div className="text-xs text-muted-foreground">m@example.com</div>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-[155px] md:w-[235px] mx-2" 
          side="top" 
          align="start"
          sideOffset={8}
        >
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleAction('upgrade')}
          >
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span>Upgrade to Pro</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleAction('account')}
          >
            <User className="h-4 w-4" />
            <span>Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleAction('billing')}
          >
            <CreditCard className="h-4 w-4" />
            <span>Billing</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleAction('notifications')}
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleAction('settings')}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950"
            onClick={() => handleAction('logout')}
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 