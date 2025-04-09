'use client'

import { Building2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// 模拟版本数据
const Companys = [
  { id: '1', name: 'FlowLab' },
  { id: '2', name: 'WizMail' },
  { id: '3', name: 'InsightLab' },
]

export function SidebarHeader() {
  return (
    <div className="flex h-14 items-center border-b px-4 py-2 w-full">
      <Select defaultValue={Companys[0].name}>
        <SelectTrigger className="border-0 w-full gap-2 hover:bg-transparent outline-none px-0">
          <div className="flex items-center gap-2 w-full">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary mr-4">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <SelectValue 
              placeholder="Select Company" 
            />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Company</SelectLabel>
            {Companys.map((company) => (
              <SelectItem 
                key={company.id} 
                value={company.name}
                className="flex flex-col gap-0.5"
              >
                <span className="text-base font-medium">{company.name}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
} 







