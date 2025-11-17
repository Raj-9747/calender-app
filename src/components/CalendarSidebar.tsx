import { useMemo } from "react";
import { Plus, Clock8, ListChecks, CalendarClock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type {
  CalendarEvent,
  TaskItem,
  AppointmentSchedule,
} from "@/pages/Index";
import { cn } from "@/lib/utils";

interface CalendarSidebarProps {
  currentDate: Date;
  events: CalendarEvent[];
  tasks: TaskItem[];
  appointments: AppointmentSchedule[];
  onSelectDate: (date: Date) => void;
  onCreate: (type: "event" | "task" | "appointment") => void;
  onEventClick: (event: CalendarEvent) => void;
  teamMemberColors?: Map<string, string>;
  isAdmin?: boolean;
  onViewUpcoming: () => void;
}

const CalendarSidebar = ({
  currentDate,
  events,
  tasks,
  appointments,
  onSelectDate,
  onCreate,
  onEventClick,
  teamMemberColors,
  isAdmin = false,
  onViewUpcoming,
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
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [events, startOfToday]);

  const formatDateLabel = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatEventTime = (event: CalendarEvent) => {
    const startIso = event.startTime ?? event.bookingTime;
    if (!startIso) return null;

    const start = new Date(startIso);
    const end =
      event.endTime && event.endTime !== ""
        ? new Date(event.endTime)
        : event.duration
        ? new Date(start.getTime() + event.duration * 60000)
        : null;

    const fmt = (date: Date) =>
      date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });

    if (!end) return fmt(start);
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const getEventAccent = (event: CalendarEvent) => {
    if (isAdmin && event.teamMember && teamMemberColors) {
      return teamMemberColors.get(event.teamMember) ?? "#1a73e8";
    }
    return "#1a73e8";
  };

  return (
    <aside
      className="
        hidden lg:flex 
        w-96 shrink-0 
        flex-col gap-6 
        border-r border-[#e0e3eb] 
        bg-white/95 
        px-6 py-6 
        overflow-y-auto 
        scrollbar-hide
      "
    >

      <div className="flex w-full gap-3">
        
        {/* VIEW BUTTON (LEFT) */}
        <Button
          type="button"
          variant="outline"
          onClick={onViewUpcoming}
          className="
            w-1/2 h-12 rounded-full border-[#d2d6e3]
            flex items-center justify-center gap-2
            text-sm font-medium text-[#1a73e8]
            hover:bg-[#e8f0fe] hover:text-[#155fc8]
          "
        >
          <CalendarClock className="h-4 w-4" />
          <span>View</span>
        </Button>

        {/* CREATE BUTTON (RIGHT) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="
                w-1/2 h-12 rounded-full bg-[#1a73e8] 
                text-sm font-medium flex items-center justify-center gap-2
                shadow-sm hover:bg-[#155fc8]
              "
            >
              <Plus className="h-4 w-4" />
              <span>Create</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-56 rounded-2xl border border-[#d2d6e3] bg-white p-2 text-sm font-medium text-[#3c4043]"
          >
            <DropdownMenuItem
              className="rounded-xl px-3 py-2"
              onClick={() => onCreate("event")}
            >
              Event
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-xl px-3 py-2"
              onClick={() => onCreate("task")}
            >
              Task
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-xl px-3 py-2"
              onClick={() => onCreate("appointment")}
            >
              Appointment schedule
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

      {/* CALENDAR */}
      <div className="p-4">
        <div className="rounded-2xl border border-[#e0e3eb] bg-white shadow-sm p-4">
          <div className="[&_*.rdp]:!px-0 [&_*.rdp]:!mx-auto [&_*.rdp-months]:!w-full">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => date && onSelectDate(date)}
              className="w-full min-w-0 p-0 [&_.rdp-months]:flex [&_.rdp-months]:flex-col"
            />
          </div>
        </div>
      </div>

      {/* UPCOMING EVENTS */}
      <div>
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-[#202124]">
              Upcoming events
            </h3>
            <span className="h-1 flex-1 rounded-full bg-[#1a73e8]/20" />
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#5f6368]">
            STAY AHEAD
          </p>
        </div>

        <div className="max-h-[350px] overflow-y-auto space-y-4 pr-2 pb-4 scrollbar-hide">
          {upcomingEvents.length === 0 && (
            <p className="text-sm text-[#5f6368]">
              Nothing planned. Click create to add one.
            </p>
          )}

          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="
                group rounded-3xl border border-[#e0e3eb] 
                bg-white px-5 py-4 
                shadow-[0_5px_15px_rgba(15,23,42,0.05)] 
                transition-all duration-200 cursor-pointer 
                hover:-translate-y-0.5 hover:shadow-[0_15px_30px_rgba(15,23,42,0.12)]
              "
              style={{ borderLeft: `5px solid ${getEventAccent(event)}` }}
              onClick={() => onEventClick(event)}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[#202124] tracking-tight">
                <Clock8 className="h-4 w-4 text-[#1a73e8]" />
                <span className="text-base font-semibold">
                  {formatDateLabel(event.date)}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <p className="text-base font-semibold text-[#202124] leading-snug">
                  {event.title}
                </p>

                {formatEventTime(event) && (
                  <span className="inline-flex w-fit items-center rounded-full bg-[#1a73e8]/10 px-3 py-1 text-xs font-semibold text-[#1a73e8]">
                    {formatEventTime(event)}
                  </span>
                )}

                {event.description && (
                  <p className="text-sm text-[#5f6368] leading-relaxed line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TASKS */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#5f6368]">
          Tasks
        </h3>

        <div className="space-y-2">
          {tasks.length === 0 && (
            <p className="text-sm text-[#5f6368]">No tasks yet.</p>
          )}

          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-2xl border border-[#e0e3eb] bg-white px-3 py-2 text-sm shadow-sm"
            >
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
              {task.notes && (
                <p className="text-xs text-[#5f6368] line-clamp-2">
                  {task.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* APPOINTMENTS */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#5f6368]">
          Appointment schedules
        </h3>

        <div className="space-y-2">
          {appointments.length === 0 && (
            <p className="text-sm text-[#5f6368]">
              No appointment blocks created.
            </p>
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

              <p className="mt-1 font-medium text-[#202124]">
                {appointment.title}
              </p>
              <p className="text-xs text-[#5f6368]">
                {appointment.time} • {appointment.duration} mins
              </p>

              {appointment.location && (
                <p className="text-xs text-[#5f6368]">
                  {appointment.location}
                </p>
              )}

              {appointment.notes && (
                <p className="text-xs text-[#5f6368] line-clamp-2">
                  {appointment.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
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
