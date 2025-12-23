import { useMemo, useState, useEffect } from "react";
import { CalendarEvent } from "@/pages/Index";
import { getColorForTitle } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import {
  getCustomerEmailDisplay,
  getEventDisplayTitle,
} from "@/lib/eventDisplay";
import { CUSTOMER_NAME_FALLBACK } from "@/lib/eventDisplay";

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
  teamMemberColors?: Map<string, string>;
  isAdmin?: boolean;
  deletingEventId?: string | null;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const PIXELS_PER_MINUTE = 3;
const HOUR_HEIGHT = 60 * PIXELS_PER_MINUTE;      // 180px
const TOTAL_HEIGHT = 24 * 60 * PIXELS_PER_MINUTE; // 4320px

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

export default function DayView({
  date,
  events,
  onEventClick,
  onDeleteEvent,
  teamMemberColors,
  isAdmin,
  deletingEventId,
}: DayViewProps) {
  const [vpWidth, setVpWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setVpWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = vpWidth < 640;
  const isTablet = vpWidth >= 640 && vpWidth < 1024;
  const dateHeader = useMemo(
    () =>
      date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    [date]
  );

  const positionedEvents = useMemo(() => {
    const base = events
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

    if (base.length === 0) return [];

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

    return laidOut.sort((a, b) => a.top - b.top || a.columnIndex - b.columnIndex);
  }, [events]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* HEADER */}
      <div className="border-b px-6 py-4 text-2xl font-semibold bg-white">
        {dateHeader}
      </div>

      {/* SHARED SCROLL CONTAINER (Hours + Timeline) */}
      <div
        id="dayViewSharedScroll"
        className="flex-1 overflow-y-auto overflow-x-auto min-h-0"
        style={{
          maxHeight: "calc(100vh - 190px)",
        }}
      >
        {/* TABLE STRUCTURE */}
        <table className="table-fixed w-full min-w-full border-collapse">
          <colgroup>
            <col style={{ width: "90px" }} />
            <col />
          </colgroup>

          <tbody>
            <tr>
              {/* HOURS COLUMN */}
              <td className="align-top bg-[#f6f8fc] border-r border-[#e0e3eb] p-0">
                <div className="flex flex-col">
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="border-b border-[#e0e3eb] px-3 py-2 text-xs text-[#5f6368]"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    >
                      {h === 0
                        ? "12 AM"
                        : h < 12
                        ? `${h} AM`
                        : h === 12
                        ? "12 PM"
                        : `${h - 12} PM`}
                    </div>
                  ))}
                </div>
              </td>

              {/* TIMELINE COLUMN */}
              <td className="align-top p-0 relative">

                {/* Timeline full-height panel */}
                <div
                  id="timelineInner"
                  className="relative w-full"
                  style={{ height: `${TOTAL_HEIGHT}px` }}
                >
                  {/* GRID LINES */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-b border-[#e0e3eb]"
                      style={{
                        top: `${h * HOUR_HEIGHT}px`,
                        height: `${HOUR_HEIGHT}px`,
                      }}
                    />
                  ))}

                  {/* EVENTS */}
                  {positionedEvents.map(
                    ({ ev, start, end, top, height, columnIndex, totalColumns }) => {
                      const color = getEventColor(ev, teamMemberColors);
                      const emailLabel = getCustomerEmailDisplay(ev);
                      const isRecurringTask = ev.source === "recurring_task";
                      const displayTitle = isRecurringTask ? ev.title : getEventDisplayTitle(ev);
                      const gutter = isMobile ? 6 : 8;
                      const effectiveColumns = isMobile
                        ? Math.max(1, Math.min(totalColumns, 2))
                        : isTablet
                        ? Math.max(1, Math.min(totalColumns, 3))
                        : Math.max(1, totalColumns);
                      const normalizedIndex = Math.min(columnIndex, effectiveColumns - 1);
                      const widthPercent = 100 / effectiveColumns;
                      const leftPercent = normalizedIndex * widthPercent;
                      const topOffset = isMobile ? top + normalizedIndex * 6 : top;
                      const leftStyle = `calc(${leftPercent}% + ${gutter / 2}px)`;
                      const widthStyle = `calc(${widthPercent}% - ${gutter}px)`;
                      const fill = isRecurringTask ? hexToRgba(color, 0.12) : hexToRgba(color, 0.82);
                      const borderTint = isRecurringTask ? hexToRgba(color, 0.4) : hexToRgba(color, 0.95);
                      const primaryTextColor = isRecurringTask ? "#202124" : getTextColorForBg(color);
                      const subtleTextColor = primaryTextColor === "#ffffff" ? "rgba(255,255,255,0.85)" : "#5f6368";
                      const timeTextColor = primaryTextColor === "#ffffff" ? "rgba(255,255,255,0.92)" : "#3c4043";
                      return (
                        <div
                          key={ev.id}
                          className={`absolute rounded-md shadow-sm border-l-4 cursor-pointer hover:shadow-md box-border overflow-hidden ${
                            deletingEventId === ev.id ? "opacity-50 pointer-events-none" : ""
                          } ${isRecurringTask ? "border-l-8" : ""}`}
                          style={{
                            top: topOffset,
                            height,
                            left: leftStyle,
                            width: widthStyle,
                            minWidth: isTablet ? 140 : 110,
                            backgroundColor: fill,
                            borderColor: borderTint,
                            borderLeftColor: color,
                            borderLeftWidth: isRecurringTask ? "8px" : "4px",
                            color: primaryTextColor,
                          }}
                          onClick={() => onEventClick(ev)}
                          title={`${displayTitle}\n${isRecurringTask ? ev.title : `Email: ${emailLabel}`}`}
                        >
                          <div className={`${isMobile ? "p-1.5" : "p-2"} flex flex-col h-full min-h-0 gap-1`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className={`${isMobile ? "text-sm" : "text-xs"} font-semibold truncate flex-1 min-w-0 flex items-start gap-1`}>
                                {isRecurringTask && <span className="font-bold text-base leading-none">📌</span>}
                                <span>{displayTitle}</span>
                                {isRecurringTask && isMobile && (
                                  <span
                                    className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: hexToRgba(color, 0.14),
                                      color: primaryTextColor,
                                    }}
                                  >
                                    Recurring
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                aria-label="Delete event"
                                className={`rounded-full ${isMobile ? "p-1" : "p-1"}`}
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
                                  <Trash2
                                    className="h-3.5 w-3.5 hover:text-[#d93025]"
                                    style={{ color: subtleTextColor }}
                                  />
                                )}
                              </button>
                            </div>

                            <div
                              className={`${isMobile ? "text-[12px]" : "text-xs"} truncate min-w-0`}
                              style={{ color: timeTextColor }}
                            >
                              {format12(start)} – {format12(end)}
                            </div>

                            {!isMobile && (
                              <div
                                className="text-[11px] truncate min-w-0"
                                style={{ color: subtleTextColor }}
                              >
                                {isRecurringTask ? (
                                  <span className="font-medium">{ev.title}</span>
                                ) : (
                                  (!ev.customerName?.trim() || !ev.customerEmail?.trim()) ? CUSTOMER_NAME_FALLBACK : `Email: ${emailLabel}`
                                )}
                              </div>
                            )}

                            {ev.teamMember && (
                              <div
                                className={`${isMobile ? "text-[12px]" : "text-[11px]"}`}
                                style={{ color: subtleTextColor }}
                              >
                                {ev.teamMember}
                              </div>
                            )}

                            
                          </div>
                        </div>
                      );
                    }
                  )}

                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
