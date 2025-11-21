import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, CircleUserRound, LogOut, Calendar as CalendarIcon, X } from "lucide-react";
import CalendarHeader from "@/components/CalendarHeader";
import CalendarGrid from "@/components/CalendarGrid";
import DayView from "@/components/DayView";
import UpcomingEventsView from "@/components/UpcomingEventsView";
import EventDetailsModal from "@/components/EventDetailsModal";
import { supabase } from "@/lib/supabaseClient";
import CalendarSidebar from "@/components/CalendarSidebar";
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
  bookingTime?: string; // Display-adjusted booking time (ISO)
  originalBookingTime?: string; // Raw booking_time from database
  customerName?: string | null;
  customerEmail?: string | null;
  phoneNumber?: string | null;
  paymentStatus?: string | null;
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  notes: string;
}

export interface AppointmentSchedule {
  id: string;
  serviceType: string;
  date: string;
  time: string;
  duration: string;
  meetingLink: string;
  description: string;
  customerName: string;
  customerEmail: string;
}

type AppointmentFormValues = {
  serviceType: string;
  customerName: string;
  customerEmail: string;
  phoneNumber: string;
  date: string;
  time: string;
  duration: string;
  meetingLink: string;
  description: string;
  teamMember?: string;
};

type SupabaseBookingRow = {
  id: string;
  product_name: string | null;
  summary: string | null;
  booking_time: string;
  meet_link: string | null;
  team_member: string | null;
  duration: number | null;
  customer_name: string | null;
  customer_email: string | null;
  phone_number: string | null;
  payment_status: string | null;
};

const DISPLAY_TIME_OFFSET_MINUTES = 0; // 5 hours 30 minutes
const DISPLAY_TIME_OFFSET_MS = DISPLAY_TIME_OFFSET_MINUTES * 60 * 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const shiftBookingTime = (isoString?: string): Date | null => {
  if (!isoString) return null;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getTime() - DISPLAY_TIME_OFFSET_MS);
};

const normalizeEvents = (rows: SupabaseBookingRow[]): CalendarEvent[] =>
  rows.map((row) => {
    const adjustedStartDate = shiftBookingTime(row.booking_time);
    const fallbackDate =
      adjustedStartDate ??
      (row.booking_time ? new Date(row.booking_time) : new Date());
    // Format date as YYYY-MM-DD
    const year = fallbackDate.getFullYear();
    const month = String(fallbackDate.getMonth() + 1).padStart(2, "0");
    const day = String(fallbackDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    
    // Calculate start and end times
    const duration = row.duration ?? 60; // Default to 60 minutes if not provided
    const startTimeISO = adjustedStartDate?.toISOString();
    const endTimeISO = adjustedStartDate
      ? new Date(adjustedStartDate.getTime() + duration * 60000).toISOString()
      : undefined;
    
    return {
      id: row.id,
      title: row.product_name ?? "",
      description: row.summary ?? "",
      date: dateStr,
      meetingLink: row.meet_link ?? "",
      teamMember: row.team_member ?? undefined,
      duration: duration,
      startTime: startTimeISO,
      endTime: endTimeISO,
      bookingTime: startTimeISO ?? row.booking_time,
      originalBookingTime: row.booking_time,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      phoneNumber: row.phone_number,
      paymentStatus: row.payment_status ?? null,
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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentSchedule[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [teamMember, setTeamMember] = useState<string | null>(null);
  const [selectedTeamMemberFilter, setSelectedTeamMemberFilter] = useState<string | null>(null);
  const [availableTeamMembers, setAvailableTeamMembers] = useState<string[]>([]);
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Load team member from localStorage on mount
  useEffect(() => {
    const storedTeamMember = localStorage.getItem("team_member");
    setTeamMember(storedTeamMember);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const handleViewportChange = (matches: boolean) => {
      setIsDesktopViewport(matches);
      if (matches) {
        setIsSidebarOpen(true);
        setIsSidebarCollapsed(false);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleViewportChange(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      handleViewportChange(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
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
      .select("id, product_name, summary, booking_time, meet_link, team_member, duration, customer_name, customer_email, phone_number, payment_status");

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

      const utcStart = new Date(`${dateStr}T00:00:00Z`);
      const rangeStart = new Date(utcStart.getTime() + DISPLAY_TIME_OFFSET_MS);
      const rangeEnd = new Date(rangeStart.getTime() + DAY_IN_MS);

      // Build query - filter by date
      let query = supabase
        .from("bookings")
        .select("id, product_name, summary, booking_time, meet_link, team_member, duration, customer_name, customer_email, phone_number, payment_status")
        .gte("booking_time", rangeStart.toISOString())
        .lt("booking_time", rangeEnd.toISOString());

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
      const filtered = normalized.filter((event) => event.date === dateStr);
      setDayViewEvents(filtered);
      return filtered;
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

  const openAppointmentModal = (date?: Date) => {
    const effectiveDate = date ?? currentDate;
    setSelectedDate(effectiveDate);
    setIsAppointmentModalOpen(true);
  };

  const toggleSidebar = () => {
    if (isDesktopViewport) {
      setIsSidebarCollapsed((prev) => !prev);
      return;
    }
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    if (isDesktopViewport) return;
    setIsSidebarOpen(false);
  };

  const handleDateClick = (date: Date) => {
    openAppointmentModal(date);
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
    if (type === "event" || type === "appointment") {
      openAppointmentModal(currentDate);
      return;
    }
    if (type === "task") {
      setIsTaskModalOpen(true);
      return;
    }
    setIsAppointmentModalOpen(true);
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

  const handleAddAppointment = useCallback(
    async (values: AppointmentFormValues): Promise<void> => {
      if (!values.date || !values.time) {
        toast.error("Missing booking details", {
          description: "Please choose both a booking date and time.",
        });
        return;
      }

      const bookingDateTime = new Date(`${values.date}T${values.time}`);
      if (Number.isNaN(bookingDateTime.getTime())) {
        toast.error("Invalid booking time", {
          description: "Please provide a valid date and time.",
        });
        return;
      }

      const formatTimestamp = (date: Date) => {
        const iso = date.toISOString(); // 2025-11-14T18:11:06.115Z
        const [datePart, timePart] = iso.split("T");
        return `${datePart} ${timePart.replace("Z", "+00")}`;
      };

      const storedTeamMember = localStorage.getItem("team_member");
      if (!storedTeamMember) {
        toast.error("Authentication error", {
          description: "Please log in again.",
        });
        return;
      }

      const normalizedTeamMember =
        storedTeamMember.toLowerCase() === "admin"
          ? values.teamMember ?? ""
          : storedTeamMember;

      if (!normalizedTeamMember.trim()) {
        toast.error("Select team member", {
          description: "Please choose which team member owns this appointment.",
        });
        return;
      }

      const durationValue = Number.parseInt(values.duration, 10);
      const durationMinutes =
        Number.isNaN(durationValue) || durationValue <= 0 ? 60 : durationValue;

      const meetingLinkValue = values.meetingLink.trim();
      const sanitizedMeetingLink = meetingLinkValue === "" ? null : meetingLinkValue;

      const serviceTypeValue = values.serviceType.trim();

      setIsSavingAppointment(true);

      try {
        const { data, error } = await supabase
          .from("bookings")
          .insert({
            product_name: serviceTypeValue || null,
            summary: values.description.trim() || null,
            booking_time: formatTimestamp(bookingDateTime),
            meet_link: sanitizedMeetingLink,
            team_member: normalizedTeamMember,
            duration: durationMinutes,
            customer_name: values.customerName.trim() || null,
            customer_email: values.customerEmail.trim() || null,
            phone_number: values.phoneNumber.trim() || null,
          })
          .select()
          .single();

        setIsSavingAppointment(false);

        if (error) {
          console.error("Failed to schedule appointment:", error);
          let message = "Failed to schedule appointment. ";
          if (error.code === "42501" || error.message.includes("permission")) {
            message += "Permission denied. Please review Supabase policies.";
          } else if (error.code === "23505" || error.message.includes("duplicate")) {
            message += "This meeting link is already in use. Please provide a unique link.";
          } else if (error.message.includes("JWT")) {
            message += "Authentication expired. Please log in again.";
          } else if (error.message.toLowerCase().includes("network")) {
            message += "Network error. Please check your connection.";
          } else {
            message += error.message || "Unknown error occurred.";
          }

          toast.error("Error Saving Appointment", {
            description: message,
            duration: 5000,
          });
          return;
        }

        if (!data) {
          toast.error("Error Saving Appointment", {
            description: "No data returned from server.",
          });
          return;
        }

        const normalized = normalizeEvents([data as SupabaseBookingRow])[0];
        setEvents((prev) => [...prev, normalized]);

        if (viewMode === "day") {
          await loadDayViewEvents(dayViewDate);
        }

        toast.success("Appointment scheduled successfully!");

        setAppointments((prev) => [
          ...prev,
          {
            id: generateId(),
            serviceType: serviceTypeValue,
            date: values.date,
            time: values.time,
            duration: `${durationMinutes}`,
            meetingLink: values.meetingLink,
            description: values.description,
            customerName: values.customerName,
            customerEmail: values.customerEmail,
          },
        ]);

        setIsAppointmentModalOpen(false);
        setSelectedDate(null);
      } catch (err) {
        setIsSavingAppointment(false);
        console.error("Unexpected error scheduling appointment:", err);
        toast.error("Error Saving Appointment", {
          description: err instanceof Error ? err.message : "An unexpected error occurred.",
        });
      }
    },
    [dayViewDate, loadDayViewEvents, viewMode]
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b border-[#e0e3eb] bg-white px-4 py-3 shadow-sm md:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]"
              aria-label="Toggle navigation sidebar"
              onClick={toggleSidebar}
              aria-expanded={isDesktopViewport ? true : isSidebarOpen}
              aria-controls="calendar-sidebar"
            >
              {!isDesktopViewport && isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
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
          {!isDesktopViewport && (
            <div
              className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ease-in-out lg:hidden ${
                isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              }`}
              onClick={closeSidebar}
            />
          )}
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
            isOpen={isDesktopViewport ? true : isSidebarOpen}
            onClose={closeSidebar}
            isDesktop={isDesktopViewport}
            isCollapsed={isDesktopViewport ? isSidebarCollapsed : false}
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

      <AddTaskModal
        isOpen={isTaskModalOpen}
        selectedDate={currentDate}
        onClose={() => setIsTaskModalOpen(false)}
        onAddTask={handleAddTask}
      />

      <AppointmentScheduleModal
        isOpen={isAppointmentModalOpen}
        selectedDate={selectedDate ?? currentDate}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setSelectedDate(null);
        }}
        onAddAppointment={handleAddAppointment}
        isSaving={isSavingAppointment}
        isAdmin={isAdmin}
        teamMembers={availableTeamMembers}
        initialTeamMember={selectedTeamMemberFilter}
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
