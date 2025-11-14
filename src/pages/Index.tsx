import { useState, useEffect, useCallback } from "react";
import CalendarHeader from "@/components/CalendarHeader";
import CalendarGrid from "@/components/CalendarGrid";
import AddEventModal from "@/components/AddEventModal";
import EventDetailsModal from "@/components/EventDetailsModal";
import { supabase } from "@/lib/supabaseClient";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD format
}

type SupabaseEventRow = {
  id: string;
  title: string;
  description: string | null;
  date: string;
};

const normalizeEvents = (rows: SupabaseEventRow[]): CalendarEvent[] =>
  rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    date: row.date,
  }));

const Index = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const formatDate = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const loadEvents = useCallback(async (): Promise<CalendarEvent[]> => {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, date")
      .order("date", { ascending: true });

    if (error) {
      console.error("Failed to load events:", error);
      setEvents([]);
      return [];
    }

    const normalized = data ? normalizeEvents(data) : [];
    setEvents(normalized);
    return normalized;
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsAddModalOpen(true);
  };

  const saveEvent = useCallback(
    async (title: string, description: string, date: string): Promise<CalendarEvent | null> => {
      setIsSavingEvent(true);
      const { data, error } = await supabase
        .from("events")
        .insert({ title, description, date })
        .select()
        .single();

      setIsSavingEvent(false);

      if (error) {
        console.error("Failed to save event:", error);
        return null;
      }

      if (!data) {
        return null;
      }

      const normalized = normalizeEvents([data as SupabaseEventRow])[0];
      setEvents((prev) => [...prev, normalized]);
      return normalized;
    },
    []
  );

  const handleAddEvent = async (title: string, description: string) => {
    if (!selectedDate) return;
    const dateString = formatDate(selectedDate);
    const newEvent = await saveEvent(title, description, dateString);
    if (newEvent) {
      setIsAddModalOpen(false);
      setSelectedDate(null);
    }
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <CalendarHeader
          currentDate={currentDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
        <CalendarGrid
          currentDate={currentDate}
          onDateClick={handleDateClick}
          renderEvents={renderEvents}
          onEventClick={showEventDetails}
        />
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
