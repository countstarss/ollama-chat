import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calendar, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface SearchFilterProps {
  onSearch: (query: string, dateRange: { from?: Date; to?: Date }) => void;
  onClearFilters: () => void;
}

export function SearchFilter({ onSearch, onClearFilters }: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showCalendar, setShowCalendar] = useState(false);

  // 处理搜索
  const handleSearch = () => {
    onSearch(searchQuery, dateRange);
  };

  // 清除筛选
  const clearFilters = () => {
    setSearchQuery("");
    setDateRange({});
    onClearFilters();
  };

  // 日期范围文本
  const dateRangeText = () => {
    if (!dateRange.from && !dateRange.to) return "选择日期范围";

    if (dateRange.from && dateRange.to) {
      if (dateRange.from.getTime() === dateRange.to.getTime()) {
        return format(dateRange.from, "yyyy-MM-dd");
      }
      return `${format(dateRange.from, "yyyy-MM-dd")} 至 ${format(
        dateRange.to,
        "yyyy-MM-dd"
      )}`;
    }

    if (dateRange.from) {
      return `${format(dateRange.from, "yyyy-MM-dd")} 起`;
    }

    if (dateRange.to) {
      return `截至 ${format(dateRange.to, "yyyy-MM-dd")}`;
    }

    return "选择日期范围";
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-8">
      <div className="flex-1 flex gap-2">
        <Input
          placeholder="搜索收藏内容..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          搜索
        </Button>
      </div>

      <div className="flex gap-2">
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="truncate">{dateRangeText()}</span>
              <ChevronDown className="h-3.5 w-3.5 ml-auto opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={
                dateRange.from && dateRange.to
                  ? {
                      from: dateRange.from,
                      to: dateRange.to,
                    }
                  : undefined
              }
              onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                setDateRange(range || {});
                if (range?.to) {
                  setShowCalendar(false); // 选择完成后关闭日历
                }
              }}
              numberOfMonths={2}
            />
            <div className="flex justify-end p-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateRange({});
                  setShowCalendar(false);
                }}
                className="mr-2"
              >
                清除
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleSearch();
                  setShowCalendar(false);
                }}
              >
                应用
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" onClick={clearFilters}>
          清除筛选
        </Button>
      </div>
    </div>
  );
}
