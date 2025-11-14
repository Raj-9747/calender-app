import { CalendarEvent } from "@/pages/Index";

interface CalendarGridProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  renderEvents: (date: Date) => CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const CalendarGrid = ({
  currentDate,
  onDateClick,
  renderEvents,
  onEventClick,
}: CalendarGridProps) => {
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
      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b border-[#e0e3eb] text-xs font-semibold uppercase tracking-wide text-[#5f6368]">
        {daysOfWeek.map((day) => (
          <div key={day} className="px-4 py-3 text-right">
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
                flex min-h-[130px] flex-col border-b border-r border-[#e0e3eb] p-3 text-left transition
                ${currentMonth ? "bg-white" : "bg-[#f8f9fa] text-[#9aa0a6]"}
                ${today ? "relative" : ""}
                hover:bg-[#f1f3f4]
              `}
              onClick={() => onDateClick(date)}
            >
              <div className="flex items-center justify-between text-xs font-medium text-[#5f6368]">
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
                {dayEvents.length === 0 && (
                  <span className="text-xs text-transparent">placeholder</span>
                )}

                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-[#cfe0fc] bg-[#e8f0fe] px-2 py-1 text-xs font-medium text-[#1a73e8] line-clamp-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
