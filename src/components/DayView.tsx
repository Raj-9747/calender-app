import { useMemo } from "react";
import { CalendarEvent } from "@/pages/Index";
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
const DISPLAY_TIMEZONE = "UTC";

const PIXELS_PER_MINUTE = 3;
const HOUR_HEIGHT = 60 * PIXELS_PER_MINUTE;      // 180px
const TOTAL_HEIGHT = 24 * 60 * PIXELS_PER_MINUTE; // 4320px

const format12 = (date: Date): string =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DISPLAY_TIMEZONE,
  });

const getEventColor = (
  event: CalendarEvent,
  colors?: Map<string, string>,
): string => {
  // Use different colors for recurring tasks
  if (event.source === "recurring_task") {
    const recurringTaskColors = [
      "#ea4335", // Red
      "#fbbc04", // Yellow
      "#34a853", // Green
      "#00897b", // Teal
      "#1565c0", // Dark Blue
      "#6f42c1", // Purple
    ];
    
    if (event.teamMember) {
      const colorIndex = event.teamMember.charCodeAt(0) % recurringTaskColors.length;
      return recurringTaskColors[colorIndex];
    }
  }
  
  if (event.teamMember && colors) {
    return colors.get(event.teamMember) || "#1a73e8";
  }
  return "#1a73e8";
};

const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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
  const dateHeader = useMemo(
    () =>
      date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [date]
  );

  const positionedEvents = useMemo(() => {
    return events
      .map((ev) => {
        if (!ev.bookingTime) return null;

        const start = new Date(ev.bookingTime);
        const duration = ev.duration ?? 60;

        const minutesSinceMidnight =
          start.getUTCHours() * 60 + start.getUTCMinutes();

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
              <td className="align-top bg-[#f6f8fc] border-r border-[#e0e3eb]">
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
                    ({ ev, start, end, top, height }) => {
                      const color = getEventColor(
                        ev,
                        teamMemberColors
                      );
                      const bg = hexToRgba(color, 0.1);
                      const border = hexToRgba(color, 0.3);
                      const isRecurringTask = ev.source === "recurring_task";

                      const emailLabel = getCustomerEmailDisplay(ev);
                      const displayTitle = getEventDisplayTitle(ev);
                      return (
                        <div
                          key={ev.id}
                          className={`absolute left-2 right-2 rounded-md shadow-sm border-l-4 cursor-pointer hover:shadow-md ${
                            deletingEventId === ev.id ? "opacity-50 pointer-events-none" : ""
                          } ${isRecurringTask ? "border-l-8" : ""}`}
                          style={{
                            top,
                            height,
                            backgroundColor: hexToRgba(color, isRecurringTask ? 0.15 : 0.1),
                            borderColor: hexToRgba(color, isRecurringTask ? 0.4 : 0.3),
                            borderLeftColor: color,
                            borderLeftWidth: isRecurringTask ? "8px" : "4px",
                          }}
                          onClick={() => onEventClick(ev)}
                          title={`${displayTitle}${isRecurringTask ? " (Recurring Task)" : ""}\nEmail: ${emailLabel}`}
                        >
                          <div className="p-2 flex flex-col h-full gap-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs font-semibold line-clamp-2 flex-1 flex items-start gap-1">
                                {isRecurringTask && <span className="font-bold text-base leading-none">📌</span>}
                                <span>{displayTitle}</span>
                              </div>
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
                            </div>

                            <div className="text-xs text-[#5f6368]">
                              {format12(start)} – {format12(end)}
                            </div>

                            <div className="text-[11px] text-[#5f6368]">
                              {isRecurringTask ? (
                                <span className="font-medium">Recurring Task</span>
                              ) : (
                                (!ev.customerName?.trim() || !ev.customerEmail?.trim()) ? CUSTOMER_NAME_FALLBACK : `Email: ${emailLabel}`
                              )}
                            </div>

                            {ev.teamMember && (
                              <div className="text-[11px] text-[#5f6368]">
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
