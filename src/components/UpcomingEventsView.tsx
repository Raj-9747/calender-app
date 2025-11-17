import { useMemo, useState } from "react";
import { CalendarEvent } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  Search,
  Video,
  ExternalLink,
  ArrowLeft,
  UserCircle2,
} from "lucide-react";

type SectionKey = "today" | "tomorrow" | "thisWeek" | "nextWeek" | "later";

const SECTION_ORDER: { key: SectionKey; title: string }[] = [
  { key: "today", title: "Today" },
  { key: "tomorrow", title: "Tomorrow" },
  { key: "thisWeek", title: "This Week" },
  { key: "nextWeek", title: "Next Week" },
  { key: "later", title: "Later" },
];

interface UpcomingEventsViewProps {
  events: CalendarEvent[];
  isAdmin: boolean;
  teamMemberColors?: Map<string, string>;
  availableTeamMembers: string[];
  selectedTeamMemberFilter: string | null;
  onTeamMemberFilterChange: (value: string | null) => void;
  onBackToCalendar: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onCreateEvent: () => void;
}

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date: Date, amount: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const formatDateWithWeekday = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const formatTimeRange = (event: CalendarEvent) => {
  const startIso = event.startTime ?? event.bookingTime;
  if (!startIso) return null;

  const start = new Date(startIso);
  const duration = event.duration ?? 60;
  const end = event.endTime
    ? new Date(event.endTime)
    : new Date(start.getTime() + duration * 60000);

  const fmt = (date: Date) =>
    date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  return `${fmt(start)} – ${fmt(end)}`;
};

const getSectionKey = (date: Date, today: Date): SectionKey => {
  const tomorrow = addDays(today, 1);
  const endOfWeek = addDays(today, 6 - today.getDay());
  const startOfNextWeek = addDays(endOfWeek, 1);
  const endOfNextWeek = addDays(startOfNextWeek, 6);

  if (startOfDay(date).getTime() === today.getTime()) return "today";
  if (startOfDay(date).getTime() === tomorrow.getTime()) return "tomorrow";
  if (date <= endOfWeek) return "thisWeek";
  if (date >= startOfNextWeek && date <= endOfNextWeek) return "nextWeek";
  return "later";
};

const getAccentColor = (
  event: CalendarEvent,
  isAdmin: boolean,
  teamMemberColors?: Map<string, string>,
) => {
  if (isAdmin && event.teamMember && teamMemberColors) {
    return teamMemberColors.get(event.teamMember) ?? "#1a73e8";
  }
  return "#1a73e8";
};

const UpcomingEventsView = ({
  events,
  isAdmin,
  teamMemberColors,
  availableTeamMembers,
  selectedTeamMemberFilter,
  onTeamMemberFilterChange,
  onBackToCalendar,
  onEventClick,
  onCreateEvent,
}: UpcomingEventsViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const groupedSections = useMemo(() => {
    const today = startOfDay(new Date());
    const filtered = events
      .map((event) => {
        const dateObj = new Date(event.date);
        return { ...event, dateObj };
      })
      .filter(({ dateObj }) => startOfDay(dateObj) >= today)
      .filter((event) => {
        if (!searchTerm.trim()) return true;
        const haystack = `${event.title} ${event.description ?? ""} ${event.teamMember ?? ""}`.toLowerCase();
        return haystack.includes(searchTerm.toLowerCase());
      })
      .filter((event) => {
        if (!selectedTeamMemberFilter) return true;
        return event.teamMember === selectedTeamMemberFilter;
      });

    const map: Record<SectionKey, CalendarEvent[]> = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      nextWeek: [],
      later: [],
    };

    filtered
      .sort((a, b) => {
        const aDate = new Date(a.startTime ?? a.bookingTime ?? `${a.date}T00:00:00`);
        const bDate = new Date(b.startTime ?? b.bookingTime ?? `${b.date}T00:00:00`);
        return aDate.getTime() - bDate.getTime();
      })
      .forEach((event) => {
        const section = getSectionKey(event.dateObj, today);
        map[section].push(event);
      });

    return SECTION_ORDER.map(({ key, title }) => ({
      key,
      title,
      events: map[key],
    })).filter((section) => section.events.length > 0);
  }, [events, searchTerm, selectedTeamMemberFilter]);

  const isEmpty = groupedSections.length === 0;

  // a reasonable per-event card height for minHeight fallback
  const totalEventsCount = groupedSections.reduce((acc, s) => acc + s.events.length, 0);
  const innerMinHeight = Math.max(600, totalEventsCount * 140);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white animate-upcoming-fade">
      {/* Header - fixed height */}
      <div className="flex-shrink-0 flex flex-col gap-6 border-b border-[#e0e3eb] px-6 py-6 bg-white z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold text-[#202124]">Upcoming Events</p>
            <p className="text-sm text-[#5f6368]">Stay ahead with your schedule</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa0a6]" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search events"
                className="w-64 rounded-full border-[#e0e3eb] pl-9"
              />
            </div>

            {isAdmin && (
              <Select
                value={selectedTeamMemberFilter ?? "all"}
                onValueChange={(value) => {
                  onTeamMemberFilterChange(value === "all" ? null : value);
                }}
              >
                <SelectTrigger className="w-[200px] rounded-full border-[#e0e3eb]">
                  <SelectValue placeholder="Filter team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All team members</SelectItem>
                  {availableTeamMembers.map((member) => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="outline" className="rounded-full border-[#d2d6e3]" onClick={onBackToCalendar}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Calendar
            </Button>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#e0e3eb] to-transparent" />
      </div>

      <div className="flex-1 overflow-auto px-6 py-8 scrollbar-hide min-h-0" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* content wrapper - keeps visual layout identical */}
        <div style={{ minHeight: `${innerMinHeight}px`, minWidth: "100%" }}>
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-[#5f6368]">
              <CalendarClock className="mb-4 h-16 w-16 text-[#c1c7d0]" />
              <p className="text-2xl font-semibold text-[#202124]">No upcoming events</p>
              <p className="mt-1 text-sm">You're all caught up!</p>
              <Button className="mt-6 rounded-full bg-[#1a73e8]" onClick={onCreateEvent}>
                Create Event
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedSections.map((section) => (
                <div key={section.key}>
                  <div className="mb-4 flex items-center gap-4">
                    <h3 className="text-xl font-semibold text-[#202124]">{section.title}</h3>
                    <span className="flex-1 border-t border-dashed border-[#d2d6e3]" />
                  </div>

                  <div className="space-y-4">
                    {section.events.map((event) => {
                      const accent = getAccentColor(event, isAdmin, teamMemberColors);
                      const duration = event.duration ?? 60;
                      const timeRange = formatTimeRange(event);
                      const dateLabel = formatDateWithWeekday(new Date(event.date));

                      return (
                        <div
                          key={event.id}
                          className="rounded-3xl border border-[#e0e3eb] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(15,23,42,0.15)] cursor-pointer"
                          style={{ borderLeft: `6px solid ${accent}` }}
                          onClick={() => onEventClick(event)}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-2">
                              <div className="text-xs uppercase tracking-[0.2em] text-[#9aa0a6]">
                                {dateLabel}
                              </div>
                              <p className="text-lg font-semibold text-[#202124]">{event.title}</p>
                              {event.description && (
                                <p className="text-sm text-[#5f6368] line-clamp-2">{event.description}</p>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-2 text-sm text-[#5f6368]">
                              {timeRange && <span className="font-semibold text-[#1a73e8]">{timeRange}</span>}
                              <span>{duration} mins</span>
                              {event.meetingLink && (
                                <a
                                  href={event.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center text-[#1a73e8] hover:text-[#155fc8]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Video className="mr-1 h-4 w-4" />
                                  Join link
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center rounded-full bg-[#1a73e8]/10 px-3 py-1 text-xs font-semibold text-[#1a73e8]">
                              <CalendarClock className="mr-1 h-3 w-3" />
                              {timeRange ?? "Time TBD"}
                            </span>
                            <span className="text-xs text-[#5f6368]">{duration} minute event</span>
                            {isAdmin && event.teamMember && (
                              <Badge
                                className="border-0 px-3 text-xs"
                                style={{
                                  backgroundColor: `${accent}20`,
                                  color: accent,
                                }}
                              >
                                <UserCircle2 className="mr-1 h-3 w-3" />
                                Created by: {event.teamMember}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpcomingEventsView;
