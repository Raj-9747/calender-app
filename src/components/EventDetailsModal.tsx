import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { CalendarEvent } from "@/pages/Index";

interface EventDetailsModalProps {
  isOpen: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
}

const EventDetailsModal = ({ isOpen, event, onClose }: EventDetailsModalProps) => {
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + "T00:00:00");
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  if (!isOpen || !event) return null;

  return (
    <div
      id="eventDetails"
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg shadow-[var(--shadow-lg)] max-w-md w-full p-6 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h2 id="detailTitle" className="text-2xl font-semibold text-foreground mb-1">
              {event.title}
            </h2>
            <p id="detailDate" className="text-sm text-muted-foreground">
              {formatDateDisplay(event.date)}
            </p>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close modal"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
          <p id="detailDesc" className="text-sm text-muted-foreground leading-relaxed">
            {event.description || "No description provided"}
          </p>
        </div>

        <div
          id="detailMeetingLink"
          className={`mb-6 ${event.meetingLink ? "" : "hidden"}`}
        >
          <h3 className="text-sm font-medium text-foreground mb-2">Meeting Link</h3>
          {event.meetingLink && (
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="text-[#1a73e8] text-sm font-medium hover:underline"
            >
              Join Meeting
            </a>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <Button variant="outline" className="hover:bg-secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
