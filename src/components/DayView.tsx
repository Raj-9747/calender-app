import { useMemo } from "react";
import { CalendarEvent } from "@/pages/Index";
import { Video } from "lucide-react";

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  teamMemberColors?: Map<string, string>;
  isAdmin?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const PIXELS_PER_MINUTE = 2;
const HOUR_HEIGHT = 60 * PIXELS_PER_MINUTE;      // 120px
const TOTAL_HEIGHT = 24 * 60 * PIXELS_PER_MINUTE; // 2880px

const format12 = (date: Date): string =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const getEventColor = (
  event: CalendarEvent,
  colors?: Map<string, string>,
  isAdmin?: boolean
): string => {
  if (isAdmin && event.teamMember && colors) {
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
  teamMemberColors,
  isAdmin,
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
          start.getHours() * 60 + start.getMinutes();

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
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
        style={{
          maxHeight: "calc(100vh - 190px)",
        }}
      >
        {/* TABLE STRUCTURE */}
        <table className="table-fixed w-full border-collapse">
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
                        teamMemberColors,
                        isAdmin
                      );
                      const bg = hexToRgba(color, 0.1);
                      const border = hexToRgba(color, 0.3);

                      return (
                        <div
                          key={ev.id}
                          className="absolute left-2 right-2 rounded-md shadow-sm border-l-4 cursor-pointer hover:shadow-md"
                          style={{
                            top,
                            height,
                            backgroundColor: bg,
                            borderColor: border,
                            borderLeftColor: color,
                          }}
                          onClick={() => onEventClick(ev)}
                        >
                          <div className="p-2 flex flex-col h-full">
                            <div className="text-xs font-semibold truncate">
                              {ev.title || "Untitled Event"}
                            </div>

                            <div className="text-xs text-[#5f6368]">
                              {format12(start)} – {format12(end)}
                            </div>

                            {ev.teamMember && (
                              <div className="text-xs text-[#5f6368]">
                                {ev.teamMember}
                              </div>
                            )}

                            {ev.meetingLink && (
                              <Video className="h-3 w-3 mt-auto text-[#5f6368]" />
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
