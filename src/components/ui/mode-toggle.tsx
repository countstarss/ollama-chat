'use client';

import * as React from 'react';
import { Check, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export function ModeToggle() {
  const { setTheme } = useTheme()
  // 给当前使用的主题添加一个符号，表明当前的主题
  const currentTheme = useTheme().theme

  return (
    // TODO: Style切换问题： 从其他模式切换到light和Dark，样式没有变化，需要刷新
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' 
          size='icon'
        >
          <Sun className='h-[1.4rem] w-[1.4rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
          <Moon className='absolute h-[1.4rem] w-[1.4rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
          <span className='sr-only'>Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align='end' 
        className='z-[120] mt-2'
      >
        <DropdownMenuItem onClick={() => setTheme('light')}>
          {
            currentTheme === 'light' && <Check className='h-4 w-4 mr-2' />
          }
            Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          {
            currentTheme === 'dark' && <Check className='h-4 w-4 mr-2' />
          }
            Dark
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
