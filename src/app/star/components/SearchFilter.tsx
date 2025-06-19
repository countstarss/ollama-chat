import React, { useState, useCallback, useEffect } from "react";
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
import { useDebounce } from "@/hooks/useDebounce";

interface SearchFilterProps {
  onSearch: (query: string, dateRange: { from?: Date; to?: Date }) => void;
  onClearFilters: () => void;
  onRealtimeSearch?: (query: string) => void;
}

export function SearchFilter({ onSearch, onClearFilters, onRealtimeSearch }: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showCalendar, setShowCalendar] = useState(false);

  // 使用防抖处理实时搜索
  const debouncedSearch = useDebounce((query: string) => {
    if (onRealtimeSearch) {
      onRealtimeSearch(query);
    }
  }, 300); // 300ms 延迟

  // 处理搜索
  const handleSearch = () => {
    onSearch(searchQuery, dateRange);
  };

  // 清除筛选
  const clearFilters = () => {
    setSearchQuery("");
    setDateRange({});
    onClearFilters();
    // 触发空字符串的实时搜索以显示所有结果
    if (onRealtimeSearch) {
      onRealtimeSearch("");
    }
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
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索收藏内容..."
            value={searchQuery}
            onChange={(e) => {
              const newQuery = e.target.value;
              setSearchQuery(newQuery);
              // 触发防抖的实时搜索
              debouncedSearch(newQuery);
            }}
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
        </div>
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
