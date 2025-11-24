import { CalendarEvent } from "@/pages/Index";
import { getCustomerEmailDisplay, getEventDisplayTitle } from "@/lib/eventDisplay";

interface CalendarGridProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  renderEvents: (date: Date) => CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  teamMemberColors?: Map<string, string>;
  isAdmin?: boolean;
}

const CalendarGrid = ({
  currentDate,
  onDateClick,
  renderEvents,
  onEventClick,
  teamMemberColors,
  isAdmin = false,
}: CalendarGridProps) => {
  // Get color for event based on team member
  const getEventColor = (event: CalendarEvent): { bg: string; border: string; text: string } => {
    if (isAdmin && event.teamMember && teamMemberColors) {
      const color = teamMemberColors.get(event.teamMember) || "#1a73e8";
      // Convert hex to rgba for background with opacity
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return {
        bg: `rgba(${r}, ${g}, ${b}, 0.1)`,
        border: `rgba(${r}, ${g}, ${b}, 0.3)`,
        text: color,
      };
    }
    // Default blue color for non-admin or events without team member
    return {
      bg: "#e8f0fe",
      border: "#cfe0fc",
      text: "#1a73e8",
    };
  };
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate calendar dates
  const generateCalendarDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();

    // Previous month's last date
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const dates: (Date | null)[] = [];

    // Add previous month's trailing dates
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      dates.push(new Date(year, month - 1, prevMonthLastDate - i));
    }

    // Add current month's dates
    for (let i = 1; i <= lastDate; i++) {
      dates.push(new Date(year, month, i));
    }

    // Add next month's leading dates to complete the grid
    const remainingCells = 42 - dates.length; // 6 rows x 7 days
    for (let i = 1; i <= remainingCells; i++) {
      dates.push(new Date(year, month + 1, i));
    }

    return dates;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const dates = generateCalendarDates();

  return (
    <div className="rounded-3xl border border-[#d2d6e3] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-[#e0e3eb] text-[11px] font-semibold uppercase tracking-wide text-[#5f6368] sm:text-xs">
            {daysOfWeek.map((day) => (
              <div key={day} className="px-2 py-3 text-right sm:px-4">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div id="calendar" className="grid grid-cols-7">
            {dates.map((date, index) => {
              if (!date) return null;

              const dayEvents = renderEvents(date);
              const today = isToday(date);
              const currentMonth = isCurrentMonth(date);
              const isFirstOfMonth = date.getDate() === 1;

              return (
                <button
                  type="button"
                  key={`day-${index}`}
                  className={`
                    flex min-h-[90px] flex-col border-b border-r border-[#e0e3eb] p-2 text-left transition sm:min-h-[130px] sm:p-3
                    ${currentMonth ? "bg-white" : "bg-[#f8f9fa] text-[#9aa0a6]"}
                    ${today ? "relative" : ""}
                    hover:bg-[#f1f3f4]
                  `}
                  onClick={() => onDateClick(date)}
                >
                  <div className="flex items-center justify-between text-xs font-medium text-[#5f6368] sm:text-xs">
                    <span>{isFirstOfMonth ? date.toLocaleString(undefined, { month: "short" }) : ""}</span>
                    <span
                      className={`
                        flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold
                        ${today ? "bg-[#1a73e8] text-white" : "text-[#3c4043]"}
                      `}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col gap-1">
                    <div className="hidden md:flex flex-col gap-1">
                      {dayEvents.length === 0 && (
                        <span className="text-xs text-transparent">placeholder</span>
                      )}

                      {dayEvents.map((event) => {
                        const colors = getEventColor(event);
                        const displayTitle = getEventDisplayTitle(event);
                        const emailDisplay = getCustomerEmailDisplay(event);
                        return (
                          <div
                            key={event.id}
                            className="rounded-lg px-2 py-1 text-[11px] font-medium line-clamp-2 cursor-pointer hover:opacity-80 transition-opacity sm:text-xs"
                            style={{
                              backgroundColor: colors.bg,
                              borderColor: colors.border,
                              color: colors.text,
                              borderWidth: "1px",
                              borderStyle: "solid",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                            title={`${displayTitle}\nEmail: ${emailDisplay}`}
                          >
                            {displayTitle}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-1 md:hidden min-h-[16px]">
                      {dayEvents.slice(0, 5).map((event) => {
                        const colors = getEventColor(event);
                        return (
                          <span
                            key={`${event.id}-dot`}
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: colors.text }}
                          />
                        );
                      })}
                      {dayEvents.length > 5 && (
                        <span className="text-[10px] font-medium text-[#5f6368]">
                          +{dayEvents.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
