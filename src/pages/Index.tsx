import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, CircleUserRound, LogOut, Calendar as CalendarIcon } from "lucide-react";
import CalendarHeader from "@/components/CalendarHeader";
import CalendarGrid from "@/components/CalendarGrid";
import DayView from "@/components/DayView";
import UpcomingEventsView from "@/components/UpcomingEventsView";
import AddEventModal from "@/components/AddEventModal";
import EventDetailsModal from "@/components/EventDetailsModal";
import { supabase } from "@/lib/supabaseClient";
import CalendarSidebar from "@/components/CalendarSidebar";
import { Input } from "@/components/ui/input";
import AddTaskModal from "@/components/AddTaskModal";
import AppointmentScheduleModal from "@/components/AppointmentScheduleModal";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD format
  meetingLink?: string;
  teamMember?: string;
  duration?: number; // Duration in minutes
  startTime?: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  bookingTime?: string; // Original booking_time from database
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  notes: string;
}

export interface AppointmentSchedule {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  notes: string;
}

type SupabaseBookingRow = {
  id: string;
  product_name: string | null;
  summary: string | null;
  booking_time: string;
  meet_link: string | null;
  team_member: string | null;
  duration: number | null;
};

const normalizeEvents = (rows: SupabaseBookingRow[]): CalendarEvent[] =>
  rows.map((row) => {
    // Extract date from booking_time (TIMESTAMPTZ format)
    const bookingDate = row.booking_time ? new Date(row.booking_time) : new Date();
    // Format date as YYYY-MM-DD
    const year = bookingDate.getFullYear();
    const month = String(bookingDate.getMonth() + 1).padStart(2, "0");
    const day = String(bookingDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    
    // Calculate start and end times
    const startTime = row.booking_time;
    const duration = row.duration ?? 60; // Default to 60 minutes if not provided
    const endTime = startTime
      ? new Date(new Date(startTime).getTime() + duration * 60000).toISOString()
      : undefined;
    
    return {
      id: row.id,
      title: row.product_name ?? "",
      description: row.summary ?? "",
      date: dateStr,
      meetingLink: row.meet_link ?? "",
      teamMember: row.team_member ?? undefined,
      duration: duration,
      startTime: startTime,
      endTime: endTime,
      bookingTime: row.booking_time,
    };
  });

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

type ViewMode = "month" | "day" | "upcoming";

const Index = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [dayViewDate, setDayViewDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dayViewEvents, setDayViewEvents] = useState<CalendarEvent[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentSchedule[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [teamMember, setTeamMember] = useState<string | null>(null);
  const [selectedTeamMemberFilter, setSelectedTeamMemberFilter] = useState<string | null>(null);
  const [availableTeamMembers, setAvailableTeamMembers] = useState<string[]>([]);

  // Load team member from localStorage on mount
  useEffect(() => {
    const storedTeamMember = localStorage.getItem("team_member");
    setTeamMember(storedTeamMember);
  }, []);

  // Check if user is admin
  const isAdmin = useMemo(() => {
    return teamMember?.toLowerCase() === "admin";
  }, [teamMember]);

  // Fetch distinct team members from bookings table (for admin dropdown)
  const fetchTeamMembers = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("team_member")
        .not("team_member", "is", null);

      if (error) {
        console.error("Failed to fetch team members:", error);
        return;
      }

      // Get distinct team members
      const distinctMembers = Array.from(
        new Set(data.map((row) => row.team_member).filter((member): member is string => member !== null))
      ).sort();

      setAvailableTeamMembers(distinctMembers);
    } catch (err) {
      console.error("Error fetching team members:", err);
    }
  }, [isAdmin]);

  // Fetch team members when admin logs in
  useEffect(() => {
    if (isAdmin) {
      fetchTeamMembers();
    }
  }, [isAdmin, fetchTeamMembers]);

  // Generate color map for team members (admin only)
  // Uses hash function to ensure same team member always gets same color
  const teamMemberColors = useMemo(() => {
    if (!isAdmin) return undefined;

    const colors = [
      "#1a73e8", // Blue
      "#ea4335", // Red
      "#34a853", // Green
      "#fbbc04", // Yellow
      "#9c27b0", // Purple
      "#ff9800", // Orange
      "#00bcd4", // Cyan
      "#e91e63", // Pink
      "#4caf50", // Light Green
      "#3f51b5", // Indigo
      "#ff5722", // Deep Orange
      "#009688", // Teal
      "#795548", // Brown
      "#607d8b", // Blue Grey
      "#cddc39", // Lime
      "#ffc107", // Amber
    ];

    // Simple hash function to get consistent color for same team member
    const hashString = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    };

    const colorMap = new Map<string, string>();
    const uniqueMembers = new Set<string>();

    // Collect all unique team members from events (both month and day view)
    [...events, ...dayViewEvents].forEach((event) => {
      if (event.teamMember) {
        uniqueMembers.add(event.teamMember);
      }
    });

    // Assign colors to team members using hash for consistency
    // This ensures same team member always gets same color
    Array.from(uniqueMembers).forEach((member) => {
      const hash = hashString(member);
      const colorIndex = hash % colors.length;
      colorMap.set(member, colors[colorIndex]);
    });

    return colorMap;
  }, [events, dayViewEvents, isAdmin]);

  const handleLogout = () => {
    localStorage.removeItem("team_member");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const formatDate = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const loadEvents = useCallback(async (): Promise<CalendarEvent[]> => {
    // Get team member from localStorage
    const teamMember = localStorage.getItem("team_member");

    if (!teamMember) {
      console.error("No team member found in localStorage");
      setEvents([]);
      return [];
    }

    // Build query based on role
    let query = supabase
      .from("bookings")
      .select("id, product_name, summary, booking_time, meet_link, team_member, duration");

    // If admin and a specific team member is selected, filter by that member
    if (teamMember.toLowerCase() === "admin" && selectedTeamMemberFilter) {
      query = query.eq("team_member", selectedTeamMemberFilter);
    } else if (teamMember.toLowerCase() !== "admin") {
      // If not admin, filter by team_member
      query = query.eq("team_member", teamMember);
    }
    // If admin and no filter selected, show all events (no filter applied)

    // Order by booking_time
    query = query.order("booking_time", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load events:", error);
      toast.error("Failed to load events", {
        description: error.message || "Please check your connection and try again.",
      });
      setEvents([]);
      return [];
    }

    const normalized = data ? normalizeEvents(data) : [];
    setEvents(normalized);
    return normalized;
  }, [selectedTeamMemberFilter]);

  // Load events for a specific date (for day view)
  const loadDayViewEvents = useCallback(
    async (date: Date): Promise<CalendarEvent[]> => {
      // Get team member from localStorage
      const teamMember = localStorage.getItem("team_member");

      if (!teamMember) {
        console.error("No team member found in localStorage");
        setDayViewEvents([]);
        return [];
      }

      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      // Build query - filter by date
      let query = supabase
        .from("bookings")
        .select("id, product_name, summary, booking_time, meet_link, team_member, duration")
        .gte("booking_time", `${dateStr}T00:00:00Z`)
        .lt("booking_time", `${dateStr}T23:59:59Z`);

      // If admin and a specific team member is selected, filter by that member
      if (teamMember.toLowerCase() === "admin" && selectedTeamMemberFilter) {
        query = query.eq("team_member", selectedTeamMemberFilter);
      } else if (teamMember.toLowerCase() !== "admin") {
        // If not admin, filter by team_member
        query = query.eq("team_member", teamMember);
      }
      // If admin and no filter selected, show all events (no filter applied)

      // Order by booking_time
      query = query.order("booking_time", { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error("Failed to load day events:", error);
        toast.error("Failed to load events", {
          description: error.message || "Please check your connection and try again.",
        });
        setDayViewEvents([]);
        return [];
      }

      const normalized = data ? normalizeEvents(data) : [];
      setDayViewEvents(normalized);
      return normalized;
    },
    [selectedTeamMemberFilter]
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Reload events when team member filter changes
  useEffect(() => {
    if (viewMode === "day") {
      loadDayViewEvents(dayViewDate);
    }
  }, [selectedTeamMemberFilter, viewMode, dayViewDate, loadDayViewEvents]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const openEventModal = (date: Date) => {
    setSelectedDate(date);
    setIsAddModalOpen(true);
  };

  const handleDateClick = (date: Date) => {
    openEventModal(date);
  };

  const handleSidebarDateSelect = (date: Date) => {
    const selectedDateObj = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setCurrentDate(selectedDateObj);
    setDayViewDate(selectedDateObj);
    setViewMode("day");
    loadDayViewEvents(selectedDateObj);
  };

  const handleViewUpcomingEvents = () => {
    setViewMode("upcoming");
  };

  // Load day view events when dayViewDate changes
  useEffect(() => {
    if (viewMode === "day") {
      loadDayViewEvents(dayViewDate);
    }
  }, [dayViewDate, viewMode, loadDayViewEvents]);

  const handleCreateAction = (type: "event" | "task" | "appointment") => {
    if (type === "event") {
      openEventModal(currentDate);
      return;
    }
    if (type === "task") {
      setIsTaskModalOpen(true);
      return;
    }
    setIsAppointmentModalOpen(true);
  };

  const saveEvent = useCallback(
    async (title: string, description: string, date: string, meetingLink?: string): Promise<CalendarEvent | null> => {
      // Convert empty string to null to avoid unique constraint violations
      const meetingLinkRaw = meetingLink?.trim() ?? "";
      const meetingLinkValue = meetingLinkRaw === "" ? null : meetingLinkRaw;

      // Convert date string (YYYY-MM-DD) to TIMESTAMPTZ format
      // Append time 00:00:00 and timezone to make it a proper timestamp
      const bookingTime = `${date}T00:00:00Z`;

      // Get team member from localStorage
      const teamMember = localStorage.getItem("team_member");
      if (!teamMember) {
        toast.error("Authentication error", {
          description: "Please log in again.",
        });
        return null;
      }

      setIsSavingEvent(true);
      
      try {
        const { data, error } = await supabase
          .from("bookings")
          .insert({ 
            product_name: title, 
            summary: description, 
            booking_time: bookingTime, 
            meet_link: meetingLinkValue,
            team_member: teamMember
          })
          .select()
          .single();

        setIsSavingEvent(false);

        if (error) {
          console.error("Failed to save event:", error);
          
          // Provide user-friendly error messages
          let errorMessage = "Failed to save event. ";
          if (error.code === "42501" || error.message.includes("permission") || error.message.includes("policy")) {
            errorMessage += "Permission denied. Please check your Supabase Row Level Security (RLS) policies.";
          } else if (error.code === "PGRST116" || error.message.includes("JWT")) {
            errorMessage += "Authentication error. Please check your Supabase credentials.";
          } else if (error.message.includes("network") || error.message.includes("fetch")) {
            errorMessage += "Network error. Please check your internet connection.";
          } else if (error.code === "23505" || error.message.includes("duplicate key") || error.message.includes("unique constraint")) {
            errorMessage += "This meeting link is already in use. Please use a different link or leave it empty.";
          } else {
            errorMessage += error.message || "Unknown error occurred.";
          }
          
          toast.error("Error Saving Event", {
            description: errorMessage,
            duration: 5000,
          });
          return null;
        }

        if (!data) {
          toast.error("Error Saving Event", {
            description: "No data returned from server.",
          });
          return null;
        }

        const normalized = normalizeEvents([data as SupabaseBookingRow])[0];
        setEvents((prev) => [...prev, normalized]);
        toast.success("Event saved successfully!");
        return normalized;
      } catch (err) {
        setIsSavingEvent(false);
        console.error("Unexpected error saving event:", err);
        toast.error("Error Saving Event", {
          description: err instanceof Error ? err.message : "An unexpected error occurred.",
        });
        return null;
      }
    },
    []
  );

  const handleAddEvent = async (title: string, description: string, meetingLink?: string) => {
    if (!selectedDate) {
      toast.error("No date selected", {
        description: "Please select a date for the event.",
      });
      return;
    }
    const dateString = formatDate(selectedDate);
    const newEvent = await saveEvent(title, description, dateString, meetingLink);
    if (newEvent) {
      setIsAddModalOpen(false);
      setSelectedDate(null);
    }
    // Error handling is done in saveEvent, so we don't need to show another error here
  };

  const renderEvents = useCallback(
    (date: Date): CalendarEvent[] => {
      const dateStr = formatDate(date);
      return events.filter((event) => event.date === dateStr);
    },
    [events, formatDate]
  );

  const showEventDetails = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailsModalOpen(true);
  };

  const handleAddTask = (title: string, dueDate: string, notes: string) => {
    setTasks((prev) => [...prev, { id: generateId(), title, dueDate, notes }]);
    setIsTaskModalOpen(false);
  };

  const handleAddAppointment = (
    title: string,
    date: string,
    time: string,
    duration: string,
    location: string,
    notes: string
  ) => {
    setAppointments((prev) => [
      ...prev,
      { id: generateId(), title, date, time, duration, location, notes },
    ]);
    setIsAppointmentModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b border-[#e0e3eb] bg-white px-4 py-3 shadow-sm md:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d2d6e3] bg-white text-lg font-semibold text-[#1a73e8]">
                14
              </div>
              <span className="text-xl font-semibold text-[#5f6368]">Calendar</span>
            </div>
          </div>
{/* 
          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-full border border-[#d2d6e3] bg-[#f1f3f4] px-4 py-2 text-sm text-[#5f6368] md:flex">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Search people and events"
              className="h-auto border-none bg-transparent p-0 text-sm placeholder:text-[#5f6368] focus-visible:ring-0"
            />
          </div> */}

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Select
                value={selectedTeamMemberFilter || "all"}
                onValueChange={(value) => {
                  setSelectedTeamMemberFilter(value === "all" ? null : value);
                }}
              >
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {availableTeamMembers.map((member) => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {teamMember && (
              <span className="hidden text-sm text-[#5f6368] md:inline-flex">
                {teamMember}
              </span>
            )}
            {/* <button
              type="button"
              className="hidden rounded-full border border-[#d2d6e3] px-4 py-2 text-sm font-medium text-[#5f6368] hover:bg-[#f1f3f4] md:inline-flex"
            >
              Support
            </button> */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
            <CircleUserRound className="h-9 w-9 text-[#5f6368]" />
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <CalendarSidebar
            currentDate={currentDate}
            events={events}
            tasks={tasks}
            appointments={appointments}
            onSelectDate={handleSidebarDateSelect}
            onCreate={handleCreateAction}
            onEventClick={showEventDetails}
            teamMemberColors={teamMemberColors}
            isAdmin={isAdmin}
            onViewUpcoming={handleViewUpcomingEvents}
          />

          <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
            {viewMode === "month" && (
              <>
                <div className="px-4 py-6 sm:px-6 lg:px-10">
                  <CalendarHeader
                    currentDate={currentDate}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    onToday={handleToday}
                  />
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6 lg:px-10">
                  <CalendarGrid
                    currentDate={currentDate}
                    onDateClick={handleDateClick}
                    renderEvents={renderEvents}
                    onEventClick={showEventDetails}
                    teamMemberColors={teamMemberColors}
                    isAdmin={isAdmin}
                  />
                </div>
              </>
            )}

            {viewMode === "day" && (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0e3eb] bg-white">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setViewMode("month");
                        setCurrentDate(dayViewDate);
                      }}
                      className="text-[#5f6368] hover:text-[#202124]"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Back to Month View
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const prevDay = new Date(dayViewDate);
                        prevDay.setDate(prevDay.getDate() - 1);
                        setDayViewDate(prevDay);
                      }}
                    >
                      Previous Day
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        setDayViewDate(today);
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextDay = new Date(dayViewDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        setDayViewDate(nextDay);
                      }}
                    >
                      Next Day
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <DayView
                    date={dayViewDate}
                    events={dayViewEvents}
                    onEventClick={showEventDetails}
                    teamMemberColors={teamMemberColors}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>
            )}

            {viewMode === "upcoming" && (
              <UpcomingEventsView
                events={events}
                isAdmin={isAdmin}
                teamMemberColors={teamMemberColors}
                availableTeamMembers={availableTeamMembers}
                selectedTeamMemberFilter={selectedTeamMemberFilter}
                onTeamMemberFilterChange={setSelectedTeamMemberFilter}
                onBackToCalendar={() => setViewMode("month")}
                onEventClick={showEventDetails}
                onCreateEvent={() => handleCreateAction("event")}
              />
            )}
          </main>
        </div>
      </div>

      <AddEventModal
        isOpen={isAddModalOpen}
        selectedDate={selectedDate}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedDate(null);
        }}
        onAddEvent={handleAddEvent}
        isSaving={isSavingEvent}
      />

      <AddTaskModal
        isOpen={isTaskModalOpen}
        selectedDate={currentDate}
        onClose={() => setIsTaskModalOpen(false)}
        onAddTask={handleAddTask}
      />

      <AppointmentScheduleModal
        isOpen={isAppointmentModalOpen}
        selectedDate={currentDate}
        onClose={() => setIsAppointmentModalOpen(false)}
        onAddAppointment={handleAddAppointment}
      />

      <EventDetailsModal
        isOpen={isDetailsModalOpen}
        event={selectedEvent}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
};

export default Index;
