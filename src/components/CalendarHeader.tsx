import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarHeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const CalendarHeader = ({ currentDate, onPrevMonth, onNextMonth, onToday }: CalendarHeaderProps) => {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const monthYear = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const viewOptions = ["Day", "Week", "Month", "Year"];
  const [selectedView, setSelectedView] = useState("Month");

  return (
    <div className="space-y-4 border-b border-[#e0e3eb] pb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-full border-[#d2d6e3] bg-white px-5 text-sm font-medium text-[#1a73e8] hover:bg-[#e8f0fe]"
            onClick={onToday}
          >
            Today
          </Button>

          <div className="flex items-center gap-2 rounded-full border border-[#d2d6e3] bg-white px-2 py-1">
            <Button
              id="prevMonth"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-[#5f6368] hover:bg-[#eef2ff]"
              onClick={onPrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              id="nextMonth"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-[#5f6368] hover:bg-[#eef2ff]"
              onClick={onNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h1 className="text-2xl font-semibold text-[#1f1f1f]" id="monthTitle">
            {monthYear}
          </h1>
        </div>

        {/* <div className="flex items-center gap-2 rounded-full border border-[#d2d6e3] bg-white p-1">
          {viewOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-full px-4 py-1 text-sm font-medium transition ${
                selectedView === option
                  ? "bg-[#e8f0fe] text-[#1a73e8]"
                  : "text-[#5f6368] hover:bg-[#f1f3f4]"
              }`}
              onClick={() => setSelectedView(option)}
            >
              {option}
            </button>
          ))}
        </div> */}
      </div>

      <div className="text-sm text-[#5f6368]">
        Your events are synced across all devices. Change the view to focus on what matters today.
      </div>
    </div>
  );
};

export default CalendarHeader;
