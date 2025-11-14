const CalendarGrid = () => {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
        {/* Calendar dates will be dynamically inserted here via JavaScript */}
      </div>
    </div>
  );
};

export default CalendarGrid;
