import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CalendarHeader = () => {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-semibold text-foreground">
        <span id="monthTitle">January 2025</span>
      </h1>
      <div className="flex gap-2">
        <Button
          id="prevMonth"
          variant="outline"
          size="icon"
          className="rounded-full hover:bg-calendar-hover"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          id="nextMonth"
          variant="outline"
          size="icon"
          className="rounded-full hover:bg-calendar-hover"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default CalendarHeader;
