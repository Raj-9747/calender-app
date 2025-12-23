import { useMemo } from "react";
import { Plus, Clock8, CalendarClock, X, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import type { CalendarEvent } from "@/pages/Index";
import { cn, getColorForTitle, getBrowserTimeZone } from "@/lib/utils";
import {
  getCustomerEmailDisplay,
  getCustomerNameDisplay,
  getEventDisplayTitle,
} from "@/lib/eventDisplay";

interface CalendarSidebarProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onCreateAppointment: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
  teamMemberColors?: Map<string, string>;
  isAdmin?: boolean;
  onViewUpcoming: () => void;
  isOpen: boolean;
  onClose: () => void;
  isDesktop?: boolean;
  isCollapsed?: boolean;
  deletingEventId?: string | null;
}


const CalendarSidebar = ({
  currentDate,
  events,
  onSelectDate,
  onCreateAppointment,
  onEventClick,
  onDeleteEvent,
  teamMemberColors,
  isAdmin = false,
  onViewUpcoming,
  isOpen,
  onClose,
  isDesktop = false,
  isCollapsed = false,
  deletingEventId,
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

  const formatDateLabel = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    const local = new Date(y, (m || 1) - 1, d || 1);
    return local.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: getBrowserTimeZone(),
    });
  };

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

    const tz = getBrowserTimeZone();
    const fmt = (date: Date) =>
      date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        timeZone: tz,
      });

    if (!end) return fmt(start);
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const getEventAccent = (event: CalendarEvent) => {
    // Title-based color first for recurring tasks
    if (event.source === "recurring_task") {
      const titleColor = getColorForTitle(event.title);
      if (titleColor) return titleColor;
    }

    if (event.teamMember && teamMemberColors) {
      return teamMemberColors.get(event.teamMember) ?? "#1a73e8";
    }
    return "#1a73e8";
  };

  const showCollapsedShell = isDesktop && isCollapsed;
  const baseClasses = cn(
    "flex shrink-0 flex-col gap-6 bg-white/95 overflow-y-auto scrollbar-hide transition-all duration-300 ease-in-out border-r border-[#e0e3eb] max-h-screen",
    isDesktop
      ? cn(
          "relative z-auto shadow-none",
          showCollapsedShell ? "w-16 px-3 py-4" : "w-full max-w-sm px-4 py-6 sm:px-6"
        )
      : cn(
          // Mobile / small viewports: use fluid, symmetric padding that scales with width.
          // Keep this relatively light so nested sections can control fine‑grained spacing.
          "fixed inset-y-0 left-0 z-50 h-full w-full max-w-sm px-3 py-4 sm:w-96 sm:px-4 sm:py-5 md:px-5 md:py-6 shadow-xl transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )
  );

  const runActionAndCollapse = (action?: () => void) => {
    action?.();
    if (!isDesktop) {
      onClose();
    }
  };

  return (
    <aside
      id="calendar-sidebar"
      role={isDesktop ? undefined : "dialog"}
      aria-modal={isDesktop ? undefined : true}
      className={baseClasses}
    >
      {!isDesktop && (
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-base font-semibold text-[#202124]">Navigation</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {showCollapsedShell ? (
        <div className="hidden w-full flex-1 items-center justify-center lg:flex">
          <span className="rotate-90 text-sm font-semibold tracking-widest text-[#1a73e8]">
            Calendar
          </span>
        </div>
      ) : (
        <>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => runActionAndCollapse(onViewUpcoming)}
              className="
                w-full h-12 rounded-full border-[#d2d6e3]
                flex items-center justify-center gap-2
                text-sm font-medium text-[#1a73e8]
                hover:bg-[#e8f0fe] hover:text-[#155fc8]
              "
            >
              <CalendarClock className="h-4 w-4" />
              <span>View</span>
            </Button>

            <Button
              type="button"
              onClick={() => runActionAndCollapse(onCreateAppointment)}
              className="
                w-full h-12 rounded-full bg-[#1a73e8] 
                text-sm font-medium flex items-center justify-center gap-2
                shadow-sm hover:bg-[#155fc8]
              "
            >
              <Plus className="h-4 w-4" />
              <span>Schedule</span>
            </Button>
          </div>

      {/* CALENDAR */}
      <div
        className={cn(
          "w-full",
          isDesktop
            ? "px-4 py-4 sm:px-6 sm:py-6"
            : "px-2 py-3 sm:px-3 sm:py-4 md:px-4 md:py-5"
        )}
      >
        <div
          className={cn(
            "w-full max-w-full mx-auto rounded-2xl border border-[#e0e3eb] bg-white shadow-sm overflow-hidden",
            isDesktop ? "p-3 sm:p-4" : "p-2 sm:p-3 md:p-4"
          )}
        >
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => {
                if (!date) return;
                runActionAndCollapse(() => onSelectDate(date));
              }}
              className="w-full max-w-full min-w-0 p-0 sm:p-1 [&_.rdp-months]:flex [&_.rdp-months]:flex-col [&_.rdp]:mx-auto [&_.rdp-table]:w-full"
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

          {upcomingEvents.map((event) => {
            const isRecurring = event.source === "recurring_task";
            const displayTitle = isRecurring ? event.title : getEventDisplayTitle(event);
            const customerName = getCustomerNameDisplay(event);
            const customerEmail = getCustomerEmailDisplay(event);
            const missingDetails = !event.customerName?.trim() || !event.customerEmail?.trim();
            return (
                <div
                  key={event.id}
              className={`
                relative group rounded-3xl border border-[#e0e3eb] 
                bg-white px-5 py-4 
                shadow-[0_5px_15px_rgba(15,23,42,0.05)] 
                transition-all duration-200 cursor-pointer 
                hover:-translate-y-0.5 hover:shadow-[0_15px_30px_rgba(15,23,42,0.12)] ${
                  deletingEventId === event.id ? "opacity-50 pointer-events-none" : ""
                }
              `}
              style={{ borderLeft: `5px solid ${getEventAccent(event)}` }}
                  onClick={() => runActionAndCollapse(() => onEventClick(event))}
              title={`${displayTitle}\n${isRecurring ? event.title : `Email: ${customerEmail}`}`}
            >
              <button
                type="button"
                aria-label="Delete event"
                className="absolute top-4 right-4 rounded-full p-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteEvent(event);
                }}
              >
                {deletingEventId === event.id ? (
                  <svg className="h-4 w-4 animate-spin text-[#9aa0a6]" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.75" />
                  </svg>
                ) : (
                  <Trash2 className="h-4 w-4 text-[#9aa0a6] hover:text-[#d93025]" />
                )}
              </button>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#202124] tracking-tight">
                <Clock8 className="h-4 w-4 text-[#1a73e8]" />
                <span className="text-base font-semibold">
                  {formatDateLabel(event.date)}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <p className="text-base font-semibold text-[#202124] leading-snug">
                  {displayTitle}
                </p>

                {formatEventTime(event) && (
                  <span className="inline-flex w-fit items-center rounded-full bg-[#1a73e8]/10 px-3 py-1 text-xs font-semibold text-[#1a73e8]">
                    {formatEventTime(event)}
                  </span>
                )}

                {!isRecurring && (
                  <div className="text-sm text-[#5f6368] leading-relaxed">
                    <p>{missingDetails ? "No customer details provided" : `Customer Name: ${customerName}`}</p>
                    <p className="text-xs">{missingDetails ? "No customer details provided" : `Email: ${customerEmail}`}</p>
                  </div>
                )}

                {event.description && (
                  <p className="text-sm text-[#5f6368] leading-relaxed line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
              
            </div>
          );})}
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
        </>
      )}
    </aside>
  );
};

export default CalendarSidebar;
