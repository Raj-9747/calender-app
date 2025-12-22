import { useMemo, useEffect, useState } from "react";
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
const HEADER_ROW_HEIGHT = 36;

const format12 = (date: Date): string =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

const getEventColor = (
  event: CalendarEvent,
  colors?: Map<string, string>,
): string => {
  if (event.source === "recurring_task") {
    const titleColor = getColorForTitle(event.title);
    if (titleColor) return titleColor;
    const recurringTaskColors = ["#ea4335", "#fbbc04", "#34a853", "#00897b", "#1565c0", "#6f42c1"];
    if (event.teamMember) {
      const colorIndex = event.teamMember.charCodeAt(0) % recurringTaskColors.length;
      return recurringTaskColors[colorIndex];
    }
    return recurringTaskColors[0];
  }
  if (event.teamMember && colors) {
    const mapped = colors.get(event.teamMember);
    if (mapped) return mapped;
  }
  return "#1a73e8";
};

const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const getTextColorForBg = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#202124" : "#ffffff";
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
  const [vpWidth, setVpWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setVpWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = vpWidth < 640;
  const isTablet = vpWidth >= 640 && vpWidth < 1024;
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
          const end = new Date(start.getTime() + duration * 60000);
          const minutesSinceMidnight = start.getHours() * 60 + start.getMinutes();
          const top = minutesSinceMidnight * PIXELS_PER_MINUTE;
          const height = Math.max(duration * PIXELS_PER_MINUTE, 40);
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
              <td className="align-top bg-[#f6f8fc] border-r border-[#e0e3eb] p-0">
                <div className="flex flex-col">
                  <div className="sticky top-0 z-20 px-3 text-xs text-[#5f6368] border-b border-[#e0e3eb] bg-[#f6f8fc] shadow-sm" style={{ height: `${HEADER_ROW_HEIGHT}px` }} />
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
                const header = day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
                return (
                  <td key={dayIdx} className="align-top p-0 relative border-r border-[#e0e3eb]">
                    <div className="sticky top-0 z-20 px-3 text-xs text-[#5f6368] border-b border-[#e0e3eb] bg-[#f6f8fc] shadow-sm" style={{ height: `${HEADER_ROW_HEIGHT}px`, lineHeight: `${HEADER_ROW_HEIGHT - 6}px` }}>{header}</div>
                    <div className={`relative w-full ${isTablet ? "overflow-x-auto" : ""}`} style={{ height: `${TOTAL_HEIGHT}px` }}>
                      {HOURS.map((h) => (
                        <div key={h} className="absolute left-0 right-0 border-b border-[#e0e3eb]" style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }} />
                      ))}
                      {positioned.map(({ ev, start, end, top, height, columnIndex, totalColumns }) => {
                        const color = getEventColor(ev, teamMemberColors);
                        const emailLabel = getCustomerEmailDisplay(ev);
                        const isRecurringTask = ev.source === "recurring_task";
                        const displayTitle = isRecurringTask ? ev.title : getEventDisplayTitle(ev);
                        const localSet = positioned.filter((p) => p.start < end && start < p.end);
                        const sortedLocal = localSet.slice().sort((a, b) => (
                          a.start.getTime() - b.start.getTime()
                        ) || ((a.ev.id || "").toString().localeCompare((b.ev.id || "").toString())));
                        const localTotal = Math.max(sortedLocal.length, 1);
                        let widthPercent = 100 / localTotal;
                        let localIndex = Math.max(sortedLocal.findIndex((p) => p.ev.id === ev.id), 0);
                        let leftPercent = localIndex * widthPercent;
                        let topOffset = top;
                        const gutterPx = 4;
                        let leftStyle: string;
                        let widthStyle: string;
                        if (isMobile) {
                          widthPercent = 100;
                          leftPercent = 0;
                          topOffset = top + localIndex * 6;
                          leftStyle = `calc(${leftPercent}% + ${gutterPx / 2}px)`;
                          widthStyle = `calc(${widthPercent}% - ${gutterPx}px)`;
                        } else if (isTablet) {
                          if (localTotal > 3) {
                            const colWidth = 150;
                            const leftPx = localIndex * (colWidth + gutterPx);
                            leftStyle = `${leftPx + gutterPx / 2}px`;
                            widthStyle = `${colWidth}px`;
                          } else {
                            const cols = Math.min(localTotal, 3);
                            widthPercent = 100 / cols;
                            localIndex = Math.min(localIndex, cols - 1);
                            leftPercent = localIndex * widthPercent;
                            leftStyle = `calc(${leftPercent}% + ${gutterPx / 2}px)`;
                            widthStyle = `calc(${widthPercent}% - ${gutterPx}px)`;
                          }
                        } else {
                          leftStyle = `calc(${leftPercent}% + ${gutterPx / 2}px)`;
                          widthStyle = `calc(${widthPercent}% - ${gutterPx}px)`;
                        }
                        const titleSizing = totalColumns >= 3 ? "text-[11px] leading-tight" : "text-xs";
                        const isCompact = isMobile || totalColumns >= 2;
                        return (
                          <div
                            key={ev.id}
                            className={`absolute ${isCompact ? "rounded-xl" : "rounded-md"} shadow-sm ${
                              isCompact ? "cursor-pointer hover:shadow-md" : "cursor-pointer hover:shadow-md"
                            } box-border overflow-hidden ${
                              deletingEventId === ev.id ? "opacity-50 pointer-events-none" : ""
                            } ${isCompact ? "border" : isRecurringTask ? "border-l-8" : "border-l-4"}`}
                            style={{
                              top: topOffset,
                              height,
                              left: leftStyle,
                              width: widthStyle,
                              minWidth: isTablet ? 150 : 90,
                              backgroundColor: isRecurringTask ? hexToRgba(color, 0.12) : hexToRgba(color, 0.92),
                              borderColor: isRecurringTask ? hexToRgba(color, 0.3) : hexToRgba(color, 0.9),
                              borderLeftColor: isCompact ? undefined : color,
                              borderLeftWidth: isCompact ? undefined : isRecurringTask ? "8px" : "4px",
                              // Use a consistent dark text color for better readability on light tints
                              color: "#202124",
                            }}
                            onClick={() => onEventClick(ev)}
                            title={`${displayTitle}\n${isRecurringTask ? ev.title : `Email: ${emailLabel}`}`}
                          >
                            <div className={`${isCompact ? "p-1.5" : "p-2"} flex flex-col h-full min-h-0 gap-1`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className={`font-semibold flex-1 min-w-0 flex items-start gap-1 break-words ${isCompact ? "line-clamp-2" : "line-clamp-2"} ${titleSizing}`}>
                                  {isRecurringTask && isMobile && <span className="text-[10px] px-1 py-0.5 rounded bg-[#f1f3f4] text-[#5f6368]">Recurring</span>}
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
                              <div
                                className={`${isCompact ? "text-[11px]" : "text-xs"} truncate min-w-0`}
                                style={{ color: "#3c4043" }}
                              >
                                {format12(start)}
                              </div>
                              {!isCompact && (
                                <div
                                  className="text-[11px] truncate min-w-0"
                                  style={{ color: "#5f6368" }}
                                >
                                  {isRecurringTask ? (
                                    <span className="font-medium">{ev.title}</span>
                                  ) : (
                                    (!ev.customerName?.trim() || !ev.customerEmail?.trim()) ? CUSTOMER_NAME_FALLBACK : `Email: ${emailLabel}`
                                  )}
                                </div>
                              )}
                              {ev.teamMember && !isCompact && (
                                <div
                                  className="text-[11px]"
                                  style={{ color: "#5f6368" }}
                                >
                                  {ev.teamMember}
                                </div>
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
