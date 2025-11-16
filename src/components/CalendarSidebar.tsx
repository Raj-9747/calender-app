import { useMemo } from "react";
import { Plus, Clock8, ListChecks, CalendarClock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { CalendarEvent, TaskItem, AppointmentSchedule } from "@/pages/Index";
import { cn } from "@/lib/utils";

interface CalendarSidebarProps {
  currentDate: Date;
  events: CalendarEvent[];
  tasks: TaskItem[];
  appointments: AppointmentSchedule[];
  onSelectDate: (date: Date) => void;
  onCreate: (type: "event" | "task" | "appointment") => void;
  onEventClick: (event: CalendarEvent) => void;
}

const CalendarSidebar = ({
  currentDate,
  events,
  tasks,
  appointments,
  onSelectDate,
  onCreate,
  onEventClick,
}: CalendarSidebarProps) => {
  const startOfToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  const upcomingEvents = useMemo(() => {
    const toDate = (value: string) => {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    return [...events]
      .map((event) => ({ ...event, dateObj: toDate(event.date) }))
      .filter(({ dateObj }) => dateObj >= startOfToday)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .slice(0, 4);
  }, [events, startOfToday]);

  return (
    <aside className="hidden lg:flex w-80 shrink-0 flex-col gap-6 border-r border-[#e0e3eb] bg-white/90 px-5 py-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-12 justify-between gap-3 rounded-full bg-[#1a73e8] px-5 text-base font-medium shadow-sm hover:bg-[#155fc8]">
            <span className="flex items-center gap-3">
              <Plus className="h-5 w-5" />
              Create
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 rounded-2xl border border-[#d2d6e3] bg-white p-2 text-sm font-medium text-[#3c4043]"
        >
          <DropdownMenuItem className="rounded-xl px-3 py-2" onClick={() => onCreate("event")}>
            Event
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-xl px-3 py-2" onClick={() => onCreate("task")}>
            Task
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-xl px-3 py-2" onClick={() => onCreate("appointment")}>
            Appointment schedule
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="rounded-2xl border border-[#e0e3eb] bg-white shadow-sm p-4">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={(date) => date && onSelectDate(date)}
          className="w-full min-w-0 p-0 [&_.rdp-months]:flex [&_.rdp-months]:flex-col"
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#5f6368]">
          Upcoming events
        </h3>
        <div className="space-y-3">
          {upcomingEvents.length === 0 && (
            <p className="text-sm text-[#5f6368]">Nothing planned. Click create to add one.</p>
          )}

          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-[#e0e3eb] bg-white px-3 py-2 text-sm shadow-sm cursor-pointer hover:bg-[#f1f3f4] transition-colors"
              onClick={() => onEventClick(event)}
            >
              <div className="flex items-center gap-2 text-[#1a73e8]">
                <Clock8 className="h-4 w-4" />
                <span className="font-semibold">
                  {new Date(event.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="mt-1 font-medium text-[#202124]">{event.title}</p>
              {event.description && (
                <p className="text-xs text-[#5f6368] line-clamp-2">{event.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#5f6368]">
          Tasks
        </h3>
        <div className="space-y-2">
          {tasks.length === 0 && <p className="text-sm text-[#5f6368]">No tasks yet.</p>}
          {tasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-[#e0e3eb] bg-white px-3 py-2 text-sm shadow-sm">
              <div className="flex items-center gap-2 text-[#1a73e8]">
                <ListChecks className="h-4 w-4" />
                <span className="font-semibold">
                  {new Date(task.dueDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="mt-1 font-medium text-[#202124]">{task.title}</p>
              {task.notes && <p className="text-xs text-[#5f6368] line-clamp-2">{task.notes}</p>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#5f6368]">
          Appointment schedules
        </h3>
        <div className="space-y-2">
          {appointments.length === 0 && (
            <p className="text-sm text-[#5f6368]">No appointment blocks created.</p>
          )}
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-2xl border border-[#e0e3eb] bg-white px-3 py-2 text-sm shadow-sm"
            >
              <div className="flex items-center gap-2 text-[#1a73e8]">
                <CalendarClock className="h-4 w-4" />
                <span className="font-semibold">
                  {new Date(appointment.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="mt-1 font-medium text-[#202124]">{appointment.title}</p>
              <p className="text-xs text-[#5f6368]">
                {appointment.time} • {appointment.duration} mins
              </p>
              {appointment.location && <p className="text-xs text-[#5f6368]">{appointment.location}</p>}
              {appointment.notes && <p className="text-xs text-[#5f6368] line-clamp-2">{appointment.notes}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto rounded-2xl border border-dashed border-[#d2d6e3] bg-[#f6f8fc] p-4 text-sm text-[#5f6368]">
        Stay organized by keeping your events in sync.
        <Button
          variant="link"
          className={cn(
            "mt-1 h-auto px-0 text-sm font-semibold text-[#1a73e8] hover:text-[#155fc8] focus-visible:ring-0"
          )}
        >
          Learn more
        </Button>
      </div>
    </aside>
  );
};

export default CalendarSidebar;

