import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, CircleUserRound, LogOut, Calendar as CalendarIcon, X, Trash2 } from "lucide-react";
import CalendarHeader from "@/components/CalendarHeader";
import CalendarGrid from "@/components/CalendarGrid";
import DayView from "@/components/DayView";
import WeekView from "@/components/WeekView";
import UpcomingEventsView from "@/components/UpcomingEventsView";
import EventDetailsModal from "@/components/EventDetailsModal";
import EditEventModal from "@/components/EditEventModal";
import { supabase } from "@/lib/supabaseClient";
import CalendarSidebar from "@/components/CalendarSidebar";
import AppointmentScheduleModal from "@/components/AppointmentScheduleModal";
import DeleteEventModal from "@/components/DeleteEventModal";
import { toast } from "sonner";
import { getColorForTitle, getBrowserTimeZone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

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
  typeOfMeeting?: string | null;
  isActive?: boolean;
  source?: "booking" | "recurring_task"; // Distinguish between bookings and recurring tasks
  recurringDays?: string[]; // Days of week for recurring tasks
}

export interface RecurringTask {
  id: number;
  team_member: string;
  event_title: string;
  event_date: string; // YYYY-MM-DD format
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  batch_id?: string | null;
  selected_days?: string | null; // Comma-separated days (e.g., "Monday,Tuesday,Wednesday")
  created_at?: string;
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
    typeOfMeeting?: string;
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
  typeOfMeeting: string | null;
  isActive: boolean | null;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const shiftBookingTime = (isoString?: string): Date | null => {
  if (!isoString) return null;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const normalizeEvents = (rows: SupabaseBookingRow[]): CalendarEvent[] =>
  rows.map((row) => {
    const tz = getBrowserTimeZone();
    const start = row.booking_time ? new Date(row.booking_time) : new Date();
    const dateStr = start.toLocaleDateString("en-CA", { timeZone: tz });

    const duration = row.duration ?? 60;
    const end = new Date(start.getTime() + duration * 60000);

    return {
      id: row.id,
      title: row.product_name ?? "",
      description: row.summary ?? "",
      date: dateStr,
      meetingLink: row.meet_link ?? "",
      teamMember: row.team_member ?? undefined,
      duration: duration,
      startTime: row.booking_time,
      endTime: end.toISOString(),
      bookingTime: row.booking_time,
      originalBookingTime: row.booking_time,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      phoneNumber: row.phone_number,
      paymentStatus: row.payment_status ?? null,
      typeOfMeeting: row.typeOfMeeting ?? null,
      isActive: row.isActive ?? true,
      source: "booking",
    };
  });

const normalizeRecurringTasks = (rows: RecurringTask[]): CalendarEvent[] =>
  rows.map((row) => {
    const tz = getBrowserTimeZone();
    const baseDate = row.event_date;
    const startUtc = new Date(`${baseDate}T${row.start_time}Z`);
    const endUtc = new Date(`${baseDate}T${row.end_time}Z`);
    const duration = Math.max(Math.round((endUtc.getTime() - startUtc.getTime()) / 60000), 1);

    const localDateStr = startUtc.toLocaleDateString("en-CA", { timeZone: tz });

    const recurringDays = row.selected_days
      ? row.selected_days.split(",").map((d) => d.trim()).filter((d) => d.length > 0)
      : [];

    return {
      id: `recurring-${row.id}`,
      title: row.event_title ?? "Untitled Task",
      description: "",
      date: localDateStr,
      meetingLink: "",
      teamMember: row.team_member,
      duration,
      startTime: startUtc.toISOString(),
      endTime: endUtc.toISOString(),
      bookingTime: startUtc.toISOString(),
      originalBookingTime: startUtc.toISOString(),
      customerName: null,
      customerEmail: null,
      phoneNumber: null,
      paymentStatus: null,
      typeOfMeeting: null,
      isActive: true,
      source: "recurring_task",
      recurringDays,
    };
  });

type ViewMode = "month" | "week" | "day" | "upcoming";
const defaultTeamMembers = ["Gauri", "Merilo", "Monica", "Shafoli", "Farahnaz" ];

const Index = () => {
  const navigate = useNavigate();
  const isMobileViewport = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [dayViewDate, setDayViewDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dayViewEvents, setDayViewEvents] = useState<CalendarEvent[]>([]);
  const [recurringTaskEvents, setRecurringTaskEvents] = useState<CalendarEvent[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [teamMember, setTeamMember] = useState<string | null>(null);
  const [selectedTeamMemberFilter, setSelectedTeamMemberFilter] = useState<string | null>(null);
  const [availableTeamMembers, setAvailableTeamMembers] = useState<string[]>(defaultTeamMembers);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [isSavingEditEvent, setIsSavingEditEvent] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileEventsSheetOpen, setIsMobileEventsSheetOpen] = useState(false);
  const [mobileSheetEvents, setMobileSheetEvents] = useState<CalendarEvent[]>([]);
  const [mobileSheetDate, setMobileSheetDate] = useState<Date | null>(null);
  const [isMobileSheetVisible, setIsMobileSheetVisible] = useState(false);
  const mobileSheetCloseTimeout = useRef<number | null>(null);
  const MOBILE_SHEET_TRANSITION_MS = 280;
  const getMobileEventAccent = (event: CalendarEvent): string => {
    // Title-based color takes highest precedence for recurring tasks
    if (event.source === "recurring_task") {
      const titleColor = getColorForTitle(event.title);
      if (titleColor) return titleColor;
    }

    // Prefer explicit team-member color mapping so recurring tasks match bookings.
    if (event.teamMember && teamMemberColors?.get(event.teamMember)) {
      return teamMemberColors.get(event.teamMember)!;
    }

    // Fallback palette for recurring tasks (if no explicit mapping exists)
    if (event.source === "recurring_task") {
      const recurringTaskColors = [
        "#ea4335", // Red
        "#fbbc04", // Yellow
        "#34a853", // Green
        "#00897b", // Teal
        "#1565c0", // Dark Blue
        "#6f42c1", // Purple
      ];
      if (event.teamMember) {
        const colorIndex = event.teamMember.charCodeAt(0) % recurringTaskColors.length;
        return recurringTaskColors[colorIndex];
      }
      return recurringTaskColors[0];
    }

    return "#1a73e8";
  };
  const hexToRgba = (hex: string, alpha: number): string => {
    const sanitized = hex.replace("#", "");
    const bigint = Number.parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  useEffect(() => {
    return () => {
      if (mobileSheetCloseTimeout.current) {
        window.clearTimeout(mobileSheetCloseTimeout.current);
      }
    };
  }, []);
  const closeMobileSheet = useCallback(() => {
    if (!isMobileEventsSheetOpen) return;
    setIsMobileSheetVisible(false);
    if (mobileSheetCloseTimeout.current) {
      window.clearTimeout(mobileSheetCloseTimeout.current);
    }
    mobileSheetCloseTimeout.current = window.setTimeout(() => {
      setIsMobileEventsSheetOpen(false);
      setMobileSheetEvents([]);
      setMobileSheetDate(null);
      mobileSheetCloseTimeout.current = null;
    }, MOBILE_SHEET_TRANSITION_MS);
  }, [isMobileEventsSheetOpen, MOBILE_SHEET_TRANSITION_MS]);

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
        setAvailableTeamMembers(defaultTeamMembers);
        return;
      }

      // Get distinct team members
      const distinctMembers = Array.from(
        new Set(data.map((row) => row.team_member).filter((member): member is string => member !== null))
      ).sort();

      const nonDefault = distinctMembers.filter((m) => !defaultTeamMembers.includes(m));
      const mergedMembers = [...defaultTeamMembers, ...nonDefault];
      setAvailableTeamMembers(mergedMembers);
    } catch (err) {
      console.error("Error fetching team members:", err);
      setAvailableTeamMembers(defaultTeamMembers);
    }
  }, [isAdmin]);

  // Fetch team members when admin logs in
  useEffect(() => {
    if (isAdmin) {
      fetchTeamMembers();
    }
  }, [isAdmin, fetchTeamMembers]);

  const teamMemberColors = useMemo(() => {
    const colors = [
      "#1a73e8", // Blue
      "#34a853", // Green
      "#fbbc04", // Yellow
      "#9c27b0", // Purple
      "#009688", // Teal
      "#00bcd4", // Cyan
      "#4caf50", // Light Green
      "#3f51b5", // Indigo
      "#ff9800", // Orange
    ];

    // Ensure available team members (defaults + fetched) are included so recurring-only members get colors
    const members = Array.from(
      new Set(
        [
          ...availableTeamMembers,
          ...events.map((e) => e.teamMember),
          ...dayViewEvents.map((e) => e.teamMember),
        ].filter((m): m is string => !!m)
      )
    ).sort();

    const map = new Map<string, string>();
    members.forEach((m, i) => {
      map.set(m, colors[i % colors.length]);
    });
    return map;
  }, [events, dayViewEvents]);

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

  const loadRecurringTasks = useCallback(async (): Promise<CalendarEvent[]> => {
    // Get team member from localStorage
    const teamMember = localStorage.getItem("team_member");

    if (!teamMember) {
      console.error("No team member found in localStorage");
      setRecurringTaskEvents([]);
      return [];
    }

    // Only fetch recurring tasks for non-admin users or for admin viewing specific member
    // If admin, fetch for the selected team member; otherwise fetch for current user
    let fetchForMember = teamMember;
    if (teamMember.toLowerCase() === "admin" && selectedTeamMemberFilter) {
      fetchForMember = selectedTeamMemberFilter;
    } else if (teamMember.toLowerCase() === "admin") {
      // Admin viewing all - don't fetch recurring tasks (or fetch for all members)
      // For now, we'll not fetch for admin viewing all
      setRecurringTaskEvents([]);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("recurring_tasks")
        .select("id, team_member, event_title, event_date, start_time, end_time, batch_id, selected_days, created_at")
        .eq("team_member", fetchForMember)
        .order("event_date", { ascending: true });

      if (error) {
        console.error("Failed to load recurring tasks:", error);
        setRecurringTaskEvents([]);
        return [];
      }

      const normalized = data ? normalizeRecurringTasks(data as RecurringTask[]) : [];
      setRecurringTaskEvents(normalized);
      return normalized;
    } catch (err) {
      console.error("Error fetching recurring tasks:", err);
      setRecurringTaskEvents([]);
      return [];
    }
  }, [selectedTeamMemberFilter]);

  const loadRecurringTasksForDate = useCallback(
    async (date: Date): Promise<CalendarEvent[]> => {
      // Get team member from localStorage
      const teamMember = localStorage.getItem("team_member");

      if (!teamMember) {
        console.error("No team member found in localStorage");
        return [];
      }

      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      // Only fetch recurring tasks for non-admin users or for admin viewing specific member
      let fetchForMember = teamMember;
      if (teamMember.toLowerCase() === "admin" && selectedTeamMemberFilter) {
        fetchForMember = selectedTeamMemberFilter;
      } else if (teamMember.toLowerCase() === "admin") {
        // Admin viewing all - don't fetch recurring tasks
        return [];
      }

      try {
        const { data, error } = await supabase
          .from("recurring_tasks")
          .select("id, team_member, event_title, event_date, start_time, end_time, batch_id, selected_days, created_at")
          .eq("team_member", fetchForMember)
          .eq("event_date", dateStr)
          .order("start_time", { ascending: true });

        if (error) {
          console.error("Failed to load recurring tasks for date:", error);
          return [];
        }

        const normalized = data ? normalizeRecurringTasks(data as RecurringTask[]) : [];
        return normalized;
      } catch (err) {
        console.error("Error fetching recurring tasks for date:", err);
        return [];
      }
    },
    [selectedTeamMemberFilter]
  );

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
      .select("id, product_name, summary, booking_time, meet_link, team_member, duration, customer_name, customer_email, phone_number, payment_status, typeOfMeeting, isActive");

    // If admin and a specific team member is selected, filter by that member
    if (teamMember.toLowerCase() === "admin" && selectedTeamMemberFilter) {
      query = query.eq("team_member", selectedTeamMemberFilter);
    } else if (teamMember.toLowerCase() !== "admin") {
      // If not admin, filter by team_member
      query = query.eq("team_member", teamMember);
    }
    // If admin and no filter selected, show all events (no filter applied)

    // Order by booking_time and include only active (or legacy null) events
    query = query
      .order("booking_time", { ascending: true })
      .or("isActive.eq.true,isActive.is.null");

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
    const activeOnly = normalized.filter((event) => event.isActive ?? true);
    setEvents(activeOnly);
    return activeOnly;
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

      // Build query
      let query = supabase
        .from("bookings")
        .select("id, product_name, summary, booking_time, meet_link, team_member, duration, customer_name, customer_email, phone_number, payment_status, typeOfMeeting, isActive")
        .order("booking_time", { ascending: true });

      // If admin and a specific team member is selected, filter by that member
      if (teamMember.toLowerCase() === "admin" && selectedTeamMemberFilter) {
        query = query.eq("team_member", selectedTeamMemberFilter);
      } else if (teamMember.toLowerCase() !== "admin") {
        // If not admin, filter by team_member
        query = query.eq("team_member", teamMember);
      }
      // If admin and no filter selected, show all events (no filter applied)

      // Include active (or legacy null) records
      query = query.or("isActive.eq.true,isActive.is.null");

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
      const filtered = normalized.filter((event) => (event.isActive ?? true) && event.date === dateStr);
      setDayViewEvents(filtered);
      return filtered;
    },
    [selectedTeamMemberFilter]
  );

  useEffect(() => {
    const loadAllEvents = async () => {
      const bookingEvents = await loadEvents();
      const recurringEvents = await loadRecurringTasks();
      // Combine both - recurring tasks will be shown with different styling based on 'source'
    };
    loadAllEvents();
  }, [loadEvents, loadRecurringTasks]);

  // Reload events when team member filter changes
  useEffect(() => {
    if (viewMode === "day") {
      const loadAllDayEvents = async () => {
        await loadDayViewEvents(dayViewDate);
        await loadRecurringTasksForDate(dayViewDate);
      };
      loadAllDayEvents();
    }
  }, [selectedTeamMemberFilter, viewMode, dayViewDate, loadDayViewEvents, loadRecurringTasksForDate]);

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

  const startOfWeek = (date: Date) => {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay(); // 0=Sun
    const diff = (day + 6) % 7; // Monday start
    copy.setDate(copy.getDate() - diff);
    return copy;
  };

  const handlePrevWeek = () => {
    const sow = startOfWeek(currentDate);
    const prev = new Date(sow);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const sow = startOfWeek(currentDate);
    const next = new Date(sow);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleTodayWeek = () => {
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
    if (isMobileViewport) {
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateKey = formatDate(targetDate);
      const bookingEventsForDay = events.filter((event) => event.date === dateKey);
      const recurringTasksForDay = recurringTaskEvents.filter((event) => event.date === dateKey);
      const allEventsForDay = [...bookingEventsForDay, ...recurringTasksForDay];
      setMobileSheetDate(targetDate);
      setMobileSheetEvents(allEventsForDay);
      if (mobileSheetCloseTimeout.current) {
        window.clearTimeout(mobileSheetCloseTimeout.current);
        mobileSheetCloseTimeout.current = null;
      }
      setIsMobileEventsSheetOpen(true);
      requestAnimationFrame(() => setIsMobileSheetVisible(true));
      closeSidebar();
      return;
    }
    openAppointmentModal(date);
  };

  const handleSidebarDateSelect = (date: Date) => {
    const today = new Date();
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    const selectedDateObj = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setCurrentDate(selectedDateObj);

    if (isToday) {
      setDayViewDate(selectedDateObj);
      setViewMode("day");
      loadDayViewEvents(selectedDateObj);
      if (!isDesktopViewport) {
        closeSidebar();
      }
      return;
    }

    if (isMobileViewport) {
      handleDateClick(date);
      return;
    }

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

  const renderEvents = useCallback(
    (date: Date): CalendarEvent[] => {
      const dateStr = formatDate(date);
      const bookingEvents = events.filter((event) => event.date === dateStr);
      const recurringTasksForDate = recurringTaskEvents.filter((event) => event.date === dateStr);
      return [...bookingEvents, ...recurringTasksForDate];
    },
    [events, recurringTaskEvents, formatDate]
  );

  const showEventDetails = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteEvent = useCallback((event: CalendarEvent) => {
    setEventToDelete(event);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async (sendEmail: boolean) => {
    if (!eventToDelete) return;
    const fullEventObject = {
      id: eventToDelete.id,
      title: eventToDelete.title ?? "",
      description: eventToDelete.description ?? "",
      date: eventToDelete.date,
      meetingLink: eventToDelete.meetingLink ?? null,
      teamMember: eventToDelete.teamMember ?? null,
      duration: eventToDelete.duration ?? null,
      startTime: eventToDelete.startTime ?? null,
      endTime: eventToDelete.endTime ?? null,
      bookingTime: eventToDelete.bookingTime ?? eventToDelete.originalBookingTime ?? null,
      customerName: eventToDelete.customerName ?? null,
      customerEmail: eventToDelete.customerEmail ?? null,
      phoneNumber: eventToDelete.phoneNumber ?? null,
      paymentStatus: eventToDelete.paymentStatus ?? null,
      isActive: eventToDelete.isActive ?? true,
    };
    setDeletingEventId(eventToDelete.id);
    try {
      const response = await fetch("https://n8n.srv898271.hstgr.cloud/webhook/delete-client-meeting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event: fullEventObject, sendEmail }),
      });

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`Delete webhook responded with status ${response.status}`);
      }

      // Parse the JSON response
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        // If response is not JSON, treat as error
        throw new Error("Invalid response from server");
      }

      // Check for success status
      if (responseData?.status === "success") {
        // Success - refresh events and update UI
        toast.success("Event deleted successfully");
        
        // Close modals
        setIsDeleteModalOpen(false);
        setIsDetailsModalOpen(false);
        setEventToDelete(null);
        setSelectedEvent(null);
        
        // Refresh events from database
        const refreshedEvents = await loadEvents();
        
        // If in day view, also refresh day view events
        if (viewMode === "day") {
          await loadDayViewEvents(dayViewDate);
        }
        
        // Also refresh recurring tasks
        const refreshedRecurringTasks = await loadRecurringTasks();
        
        // Update mobile sheet events if open (use refreshed data)
        if (mobileSheetDate && mobileSheetEvents.length > 0) {
          const dateKey = formatDate(mobileSheetDate);
          const bookingEventsForDay = refreshedEvents.filter((event) => event.date === dateKey);
          const recurringTasksForDay = refreshedRecurringTasks.filter((event) => event.date === dateKey);
          setMobileSheetEvents([...bookingEventsForDay, ...recurringTasksForDay]);
        }
      } else {
        // Non-success response
        const errorMessage = responseData?.message || "Failed to delete the event. Please try again.";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete the event. Please try again.";
      toast.error("Failed to delete the event. Please try again.", {
        description: errorMessage,
      });
      // Event remains visible - don't remove it from UI
    } finally {
      // Always remove loading state
      setDeletingEventId(null);
    }
  }, [eventToDelete, loadEvents, loadDayViewEvents, loadRecurringTasks, viewMode, dayViewDate, events, recurringTaskEvents, mobileSheetDate, mobileSheetEvents, formatDate]);

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

      const utcIso = bookingDateTime.toISOString();

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
            booking_time: utcIso,
            meet_link: sanitizedMeetingLink,
            team_member: normalizedTeamMember,
            duration: durationMinutes,
            customer_name: values.customerName.trim() || null,
            customer_email: values.customerEmail.trim() || null,
            phone_number: values.phoneNumber.trim() || null,
             typeOfMeeting: values.typeOfMeeting?.trim() || null,
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

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEventToEdit(event);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveEditEvent = useCallback(
    async (updatedEvent: CalendarEvent): Promise<void> => {
      if (!updatedEvent || updatedEvent.source === "recurring_task") {
        toast.error("Cannot edit recurring events");
        return;
      }

      setIsSavingEditEvent(true);

      try {
        const { error } = await supabase
          .from("bookings")
          .update({
            product_name: updatedEvent.title || null,
            summary: updatedEvent.description || null,
            booking_time: updatedEvent.bookingTime,
            meet_link: updatedEvent.meetingLink || null,
            duration: updatedEvent.duration || 60,
            customer_name: updatedEvent.customerName || null,
            customer_email: updatedEvent.customerEmail || null,
            phone_number: updatedEvent.phoneNumber || null,
            typeOfMeeting: updatedEvent.typeOfMeeting || null,
          })
          .eq("id", updatedEvent.id);

        if (error) {
          console.error("Failed to update event:", error);
          toast.error("Error updating event", {
            description: error.message || "Please try again.",
          });
          return;
        }

        // Refresh events from the server so all calendar views stay in sync
        const refreshedEvents = await loadEvents();
        setEvents(refreshedEvents);

        if (viewMode === "day") {
          await loadDayViewEvents(dayViewDate);
        }

        // Also update any already-selected event / mobile sheet events in memory
        setSelectedEvent((prev) =>
          prev && prev.id === updatedEvent.id ? { ...prev, ...updatedEvent } : prev
        );
        setMobileSheetEvents((prev) =>
          prev.map((e) => (e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e))
        );

        toast.success("Event updated successfully!");
        setIsEditModalOpen(false);
        setEventToEdit(null);
      } catch (err) {
        console.error("Unexpected error updating event:", err);
        toast.error("Error updating event", {
          description: err instanceof Error ? err.message : "An unexpected error occurred.",
        });
      } finally {
        setIsSavingEditEvent(false);
      }
    },
    [dayViewDate, loadDayViewEvents, loadEvents, viewMode]
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="flex h-screen flex-col">
        <header className="border-b border-[#e0e3eb] bg-white px-4 py-3 shadow-sm md:px-8">
          <div className="flex w-full items-center gap-2 flex-nowrap">
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
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d2d6e3] bg-white text-lg font-semibold text-[#1a73e8]">
                14
              </div>
              <span className="text-xl font-semibold text-[#5f6368] truncate">Calendar</span>
            </div>
            
            {isAdmin && (
              <Select
                value={selectedTeamMemberFilter || "all"}
                onValueChange={(value) => {
                  setSelectedTeamMemberFilter(value === "all" ? null : value);
                }}
              >
                <SelectTrigger className="hidden h-9 w-[150px] text-sm sm:inline-flex">
                  <SelectValue placeholder="Team member" />
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
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              {teamMember && (
                <span className="text-sm text-[#5f6368] flex-shrink-0">{teamMember}</span>
              )}
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
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden w-full">
          {isDesktopViewport && (
            <CalendarSidebar
              currentDate={currentDate}
              events={events}
              onSelectDate={handleSidebarDateSelect}
              onCreateAppointment={() => openAppointmentModal(currentDate)}
              onEventClick={showEventDetails}
              onDeleteEvent={handleDeleteEvent}
              teamMemberColors={teamMemberColors}
              isAdmin={isAdmin}
              onViewUpcoming={handleViewUpcomingEvents}
              isOpen
              onClose={closeSidebar}
              isDesktop
              isCollapsed={isSidebarCollapsed}
              deletingEventId={deletingEventId}
            />
          )}

          <main className="flex-1 min-w-0 w-full overflow-hidden flex flex-col">
            {viewMode === "month" && (
              <>
                <div className="px-4 py-6 sm:px-6 lg:px-10">
                  <CalendarHeader
                    currentDate={currentDate}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    onToday={handleToday}
                    viewMode={viewMode}
                    onChangeViewMode={(m) => setViewMode(m)}
                  />
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6 lg:px-10">
                  <CalendarGrid
                    currentDate={currentDate}
                    onDateClick={handleDateClick}
                    renderEvents={renderEvents}
                    onEventClick={showEventDetails}
                    onDeleteEvent={handleDeleteEvent}
                    teamMemberColors={teamMemberColors}
                    isAdmin={isAdmin}
                    deletingEventId={deletingEventId}
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
                    events={[...dayViewEvents, ...recurringTaskEvents.filter((e) => e.date === formatDate(dayViewDate))]}
                    onEventClick={showEventDetails}
                    onDeleteEvent={handleDeleteEvent}
                    teamMemberColors={teamMemberColors}
                    isAdmin={isAdmin}
                    deletingEventId={deletingEventId}
                  />
                </div>
              </div>
            )}

            {viewMode === "week" && (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0e3eb] bg-white">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setViewMode("month")} className="text-[#5f6368] hover:text-[#202124]">
                      Back to Month View
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevWeek}>Previous Week</Button>
                    <Button variant="outline" size="sm" onClick={() => { setViewMode("week"); handleTodayWeek(); }}>Today</Button>
                    <Button variant="outline" size="sm" onClick={handleNextWeek}>Next Week</Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <WeekView
                    startOfWeek={startOfWeek(currentDate)}
                    events={[...events, ...recurringTaskEvents]}
                    onEventClick={showEventDetails}
                    onDeleteEvent={handleDeleteEvent}
                    teamMemberColors={teamMemberColors}
                    isAdmin={isAdmin}
                    deletingEventId={deletingEventId}
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
                onCreateAppointment={() => openAppointmentModal(currentDate)}
                onDeleteEvent={handleDeleteEvent}
                deletingEventId={deletingEventId}
              />
            )}
          </main>
        </div>
      </div>

      {!isDesktopViewport && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ease-in-out lg:hidden ${
              isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={closeSidebar}
          />
          <CalendarSidebar
            currentDate={currentDate}
            events={events}
            onSelectDate={handleSidebarDateSelect}
            onCreateAppointment={() => openAppointmentModal(currentDate)}
            onEventClick={showEventDetails}
            onDeleteEvent={handleDeleteEvent}
            teamMemberColors={teamMemberColors}
            isAdmin={isAdmin}
            onViewUpcoming={handleViewUpcomingEvents}
            isOpen={isSidebarOpen}
            onClose={closeSidebar}
            isDesktop={false}
            isCollapsed={false}
            deletingEventId={deletingEventId}
          />
        </>
      )}

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
        onDeleteEvent={handleDeleteEvent}
        onEditEvent={handleEditEvent}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedEvent(null);
        }}
        teamMemberColors={teamMemberColors}
      />

      <EditEventModal
        isOpen={isEditModalOpen}
        event={eventToEdit}
        onClose={() => {
          setIsEditModalOpen(false);
          setEventToEdit(null);
        }}
        onSave={handleSaveEditEvent}
        isSaving={isSavingEditEvent}
      />

      <DeleteEventModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (deletingEventId) return;
          setIsDeleteModalOpen(false);
          setEventToDelete(null);
        }}
        onConfirm={confirmDelete}
        eventTitle={eventToDelete?.title}
      />

      {isMobileEventsSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
              isMobileSheetVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={closeMobileSheet}
          />
          <div
            className={`absolute inset-x-0 bottom-0 rounded-t-3xl bg-white shadow-2xl max-h-[85vh] overflow-y-auto p-6 transform transition-transform duration-300 ease-out ${
              isMobileSheetVisible ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="absolute top-3 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[#d2d6e3]" />
            <button
              type="button"
              aria-label="Close events"
              className="absolute top-3 right-4 rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]"
              onClick={closeMobileSheet}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="pt-8 pb-4 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-[#5f6368]">
                {mobileSheetDate?.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  timeZone: getBrowserTimeZone(),
                })}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[#202124]">
                {mobileSheetEvents.length
                  ? `${mobileSheetEvents.length} event${mobileSheetEvents.length === 1 ? "" : "s"}`
                  : "No events"}
              </h3>
            </div>

            {mobileSheetEvents.length === 0 ? (
              <p className="text-sm text-center text-[#5f6368]">You’re all caught up for this date.</p>
            ) : (
              <div className="space-y-4 pb-4">
                {mobileSheetEvents.map((event) => {
                  const tz = getBrowserTimeZone();
                  const startTime = event.startTime
                    ? new Date(event.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: tz })
                    : "N/A";
                  const endTime = event.endTime
                    ? new Date(event.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: tz })
                    : null;
                  const accent = getMobileEventAccent(event);
                  const isRecurringTask = event.source === "recurring_task";
                  return (
                    <div
                      key={event.id}
                      className={`relative rounded-2xl border border-[#e0e3eb] p-4 shadow-sm ${
                        deletingEventId === event.id ? "opacity-50 pointer-events-none" : ""
                      }`}
                      style={{
                        borderLeft: isRecurringTask ? `8px solid ${accent}` : `5px solid ${accent}`,
                        backgroundColor: hexToRgba(accent, isRecurringTask ? 0.12 : 0.92),
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Delete event"
                        className={`absolute top-3 right-3 rounded-full p-1.5 transition ${
                          deletingEventId === event.id ? "opacity-50 pointer-events-none" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event);
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
                      <p className="text-base font-semibold text-[#202124] mb-1 flex items-center gap-2">
                        {isRecurringTask && <span className="text-lg">📌</span>}
                        {event.title || "Untitled Event"}
                      </p>
                      <p className="text-sm text-[#5f6368] mb-2">
                        {isRecurringTask ? (
                          <span className="font-medium text-[#005fcc]">Recurring Task</span>
                        ) : (
                          <>Customer: {(!event.customerName?.trim() || !event.customerEmail?.trim()) ? "No customer details provided" : event.customerName}</>
                        )}
                      </p>
                      <div className="text-sm text-[#202124] flex flex-wrap gap-x-4 gap-y-1 mb-3">
                        <span>
                          Time: {startTime}
                          {endTime ? ` – ${endTime}` : ""}
                        </span>
                        {event.duration && <span>Duration: {event.duration} min</span>}
                      </div>
                      {event.meetingLink && (
                        <a
                          href={event.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute bottom-4 right-4 text-sm text-[#1a73e8] font-medium hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Join meeting
                        </a>
                      )}
                      {event.teamMember && (
                        <p className="mt-2 text-xs text-[#5f6368]">Owner: {event.teamMember}</p>
                      )}
                      <Button
                        variant="link"
                        className="px-0 mt-2 text-sm"
                        onClick={() => {
                          closeMobileSheet();
                          setSelectedEvent(event);
                          setIsDetailsModalOpen(true);
                        }}
                      >
                        View details
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
