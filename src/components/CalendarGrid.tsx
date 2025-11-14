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
    <div className="bg-card rounded-lg shadow-[var(--shadow-md)] p-6">
      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div id="calendar" className="grid grid-cols-7 gap-2">
        {dates.map((date, index) => {
          if (!date) return null;

          const dayEvents = renderEvents(date);
          const today = isToday(date);
          const currentMonth = isCurrentMonth(date);

          return (
            <div
              key={index}
              className={`
                min-h-[100px] p-2 rounded-lg border transition-all cursor-pointer
                ${today ? "border-calendar-today border-2" : "border-border"}
                ${currentMonth ? "bg-card" : "bg-muted/30"}
                ${!currentMonth && "text-muted-foreground"}
                hover:bg-calendar-hover hover:shadow-[var(--shadow-sm)]
              `}
              onClick={() => onDateClick(date)}
            >
              <div className="text-sm font-medium mb-1">{date.getDate()}</div>
              <div className="space-y-1">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-event-tag text-white text-xs px-2 py-1 rounded-full truncate"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
