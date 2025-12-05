import { useMemo } from "react";
import { CalendarEvent } from "@/pages/Index";
import { getColorForTitle } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import {
  getCustomerEmailDisplay,
  getEventDisplayTitle,
} from "@/lib/eventDisplay";
import { CUSTOMER_NAME_FALLBACK } from "@/lib/eventDisplay";

interface WeekViewProps {
  startOfWeek: Date; // Monday start
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
  teamMemberColors?: Map<string, string>;
  isAdmin?: boolean;
  deletingEventId?: string | null;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = Array.from({ length: 7 }, (_, i) => i);

const PIXELS_PER_MINUTE = 3;
const HOUR_HEIGHT = 60 * PIXELS_PER_MINUTE;      // 180px
const TOTAL_HEIGHT = 24 * 60 * PIXELS_PER_MINUTE; // 4320px

const format12 = (date: Date): string =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const getEventColor = (
  event: CalendarEvent,
  colors?: Map<string, string>,
): string => {
  if (event.teamMember && colors) {
    const mapped = colors.get(event.teamMember);
    if (mapped) return mapped;
  }
  if (event.source === "recurring_task") {
    const titleColor = getColorForTitle(event.title);
    if (titleColor) return titleColor;
  }
  return "#1a73e8";
};

const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDays = (date: Date, amt: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amt);
  return copy;
};

export default function WeekView({
  startOfWeek,
  events,
  onEventClick,
  onDeleteEvent,
  teamMemberColors,
  isAdmin,
  deletingEventId,
}: WeekViewProps) {
  const days = useMemo(() => DAYS.map((i) => addDays(startOfWeek, i)), [startOfWeek]);

  const positionedByDay = useMemo(() => {
    const map: Record<string, Array<{
      ev: CalendarEvent;
      start: Date;
      end: Date;
      top: number;
      height: number;
      columnIndex: number;
      totalColumns: number;
    }>> = {};

    days.forEach((day) => {
      const dateStr = formatDate(day);
      const base = events
        .filter((e) => e.date === dateStr)
        .map((ev) => {
          const startIso = ev.startTime ?? ev.bookingTime;
          if (!startIso) return null;
          const start = new Date(startIso);
          const duration = ev.duration ?? 60;
          const minutesSinceMidnight = start.getHours() * 60 + start.getMinutes();
          const top = minutesSinceMidnight * PIXELS_PER_MINUTE;
          const height = Math.max(duration * PIXELS_PER_MINUTE, 40);
          const end = new Date(start.getTime() + duration * 60000);
          return { ev, start, end, top, height };
        })
        .filter(Boolean) as {
          ev: CalendarEvent;
          start: Date;
          end: Date;
          top: number;
          height: number;
        }[];

      // overlap grouping within the day
      const overlaps = (a: typeof base[number], b: typeof base[number]) => a.start < b.end && b.start < a.end;
      const visited = new Array(base.length).fill(false);
      const groups: number[][] = [];
      for (let i = 0; i < base.length; i++) {
        if (visited[i]) continue;
        const queue = [i];
        visited[i] = true;
        const component: number[] = [];
        while (queue.length) {
          const idx = queue.shift()!;
          component.push(idx);
          for (let j = 0; j < base.length; j++) {
            if (!visited[j] && overlaps(base[idx], base[j])) {
              visited[j] = true;
              queue.push(j);
            }
          }
        }
        groups.push(component);
      }

      const laidOut: Array<{
        ev: CalendarEvent;
        start: Date;
        end: Date;
        top: number;
        height: number;
        columnIndex: number;
        totalColumns: number;
      }> = [];

      groups.forEach((indices) => {
        const group = indices.map((i) => base[i]).sort((a, b) => a.start.getTime() - b.start.getTime());
        const columnsEnd: number[] = [];
        const assignments: number[] = [];
        group.forEach((item, idx) => {
          let placedAt = -1;
          for (let c = 0; c < columnsEnd.length; c++) {
            if (columnsEnd[c] <= item.start.getTime()) {
              placedAt = c;
              break;
            }
          }
          if (placedAt === -1) {
            columnsEnd.push(item.end.getTime());
            placedAt = columnsEnd.length - 1;
          } else {
            columnsEnd[placedAt] = item.end.getTime();
          }
          assignments[idx] = placedAt;
        });
        const total = Math.max(columnsEnd.length, 1);
        group.forEach((item, idx) => {
          laidOut.push({
            ev: item.ev,
            start: item.start,
            end: item.end,
            top: item.top,
            height: item.height,
            columnIndex: assignments[idx],
            totalColumns: total,
          });
        });
      });

      map[dateStr] = laidOut.sort((a, b) => a.top - b.top || a.columnIndex - b.columnIndex);
    });

    return map;
  }, [days, events]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0" style={{ maxHeight: "calc(100vh - 190px)" }}>
        <table className="table-fixed w-full min-w-full border-collapse">
          <colgroup>
            <col style={{ width: "90px" }} />
            {days.map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <tbody>
            <tr>
              {/* hours column */}
              <td className="align-top bg-[#f6f8fc] border-r border-[#e0e3eb]">
                <div className="flex flex-col">
                  {HOURS.map((h) => (
                    <div key={h} className="border-b border-[#e0e3eb] px-3 py-2 text-xs text-[#5f6368]" style={{ height: `${HOUR_HEIGHT}px` }}>
                      {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                    </div>
                  ))}
                </div>
              </td>
              {/* day columns */}
              {days.map((day, dayIdx) => {
                const dateStr = formatDate(day);
                const positioned = positionedByDay[dateStr] ?? [];
                const header = day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                return (
                  <td key={dayIdx} className="align-top p-0 relative border-r border-[#e0e3eb]">
                    <div className="sticky top-0 z-20 px-3 py-2 text-xs text-[#5f6368] border-b border-[#e0e3eb] bg-[#f6f8fc] shadow-sm">{header}</div>
                    <div className="relative w-full" style={{ height: `${TOTAL_HEIGHT}px` }}>
                      {HOURS.map((h) => (
                        <div key={h} className="absolute left-0 right-0 border-b border-[#e0e3eb]" style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }} />
                      ))}
                      {positioned.map(({ ev, start, end, top, height, columnIndex, totalColumns }) => {
                        const color = getEventColor(ev, teamMemberColors);
                        const emailLabel = getCustomerEmailDisplay(ev);
                        const isRecurringTask = ev.source === "recurring_task";
                        const displayTitle = isRecurringTask ? ev.title : getEventDisplayTitle(ev);
                        const widthPercent = 100 / totalColumns;
                        const leftPercent = columnIndex * widthPercent;
                        const titleSizing = totalColumns >= 3 ? "text-[11px] leading-tight" : "text-xs";
                        const isCompact = totalColumns >= 2;
                        const gutterPx = 4;
                        return (
                          <div
                            key={ev.id}
                            className={`absolute ${isCompact ? "rounded-xl" : "rounded-md"} shadow-sm ${
                              isCompact ? "cursor-pointer hover:shadow-md" : "cursor-pointer hover:shadow-md"
                            } box-border overflow-hidden ${
                              deletingEventId === ev.id ? "opacity-50 pointer-events-none" : ""
                            } ${isCompact ? "border" : isRecurringTask ? "border-l-8" : "border-l-4"}`}
                            style={{
                              top,
                              height,
                              left: `calc(${leftPercent}% + ${gutterPx / 2}px)`,
                              width: `calc(${widthPercent}% - ${gutterPx}px)`,
                              backgroundColor: isCompact ? hexToRgba(color, 0.15) : hexToRgba(color, isRecurringTask ? 0.15 : 0.1),
                              borderColor: isCompact ? hexToRgba(color, 0.6) : hexToRgba(color, isRecurringTask ? 0.4 : 0.3),
                              borderLeftColor: isCompact ? undefined : color,
                              borderLeftWidth: isCompact ? undefined : isRecurringTask ? "8px" : "4px",
                            }}
                            onClick={() => onEventClick(ev)}
                            title={`${displayTitle}\n${isRecurringTask ? ev.title : `Email: ${emailLabel}`}`}
                          >
                            <div className={`${isCompact ? "p-1.5" : "p-2"} flex flex-col h-full min-h-0 gap-1`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className={`font-semibold flex-1 min-w-0 flex items-start gap-1 break-words ${isCompact ? "line-clamp-2" : "line-clamp-2"} ${titleSizing}`}>
                                  {isRecurringTask && !isCompact && <span className="font-bold text-base leading-none">📌</span>}
                                  <span>{displayTitle}</span>
                                </div>
                                {!isCompact && (
                                  <button
                                    type="button"
                                    aria-label="Delete event"
                                    className="rounded-full p-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteEvent(ev);
                                    }}
                                  >
                                    {deletingEventId === ev.id ? (
                                      <svg className="h-3.5 w-3.5 animate-spin text-[#9aa0a6]" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                                        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.75" />
                                      </svg>
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5 text-[#9aa0a6] hover:text-[#d93025]" />
                                    )}
                                  </button>
                                )}
                              </div>
                              <div className={`${isCompact ? "text-[11px] text-[#202124]" : "text-xs text-[#5f6368]"} truncate min-w-0`}>
                                {format12(start)}
                              </div>
                              {!isCompact && (
                                <div className="text-[11px] text-[#5f6368] truncate min-w-0">
                                  {isRecurringTask ? (
                                    <span className="font-medium">{ev.title}</span>
                                  ) : (
                                    (!ev.customerName?.trim() || !ev.customerEmail?.trim()) ? CUSTOMER_NAME_FALLBACK : `Email: ${emailLabel}`
                                  )}
                                </div>
                              )}
                              {ev.teamMember && !isCompact && (
                                <div className="text-[11px] text-[#5f6368]">{ev.teamMember}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
