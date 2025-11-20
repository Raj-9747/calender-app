import { Button } from "@/components/ui/button";
import { X, Video, Clock, User } from "lucide-react";
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

  // Convert 24-hour time to 12-hour format for display
  const formatTime12Hour = (isoString?: string): string => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getPaymentStatusClasses = (status?: string | null) => {
    if (!status) return "hidden";
    const s = status.toLowerCase();
    if (s === "paid") return "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800";
    if (s === "pending") return "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800";
    if (s === "unpaid" || s === "failed") return "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-800";
    if (s === "refunded") return "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800";
    return "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800";
  };

  if (!isOpen || !event) return null;

  // Format times in 12-hour format for display
  const startTime = event.startTime ? formatTime12Hour(event.startTime) : null;
  const endTime = event.endTime ? formatTime12Hour(event.endTime) : null;
  const duration = event.duration ?? null;

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
            <div className="flex items-center gap-3">
              <p id="detailDate" className="text-sm text-muted-foreground">
                {formatDateDisplay(event.date)}
              </p>
              {event.paymentStatus && (
                <span className={getPaymentStatusClasses(event.paymentStatus)}>
                  {`${event.paymentStatus.charAt(0).toUpperCase()}${event.paymentStatus.slice(1)}`}
                </span>
              )}
            </div>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close modal"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Time Information */}
        {(startTime || endTime || duration) && (
          <div className="mb-6 space-y-2">
            {startTime && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Start:</span>
                <span className="text-foreground font-medium">{startTime}</span>
              </div>
            )}
            {endTime && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">End:</span>
                <span className="text-foreground font-medium">{endTime}</span>
              </div>
            )}
            {duration && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duration:</span>
                <span className="text-foreground font-medium">{duration} minutes</span>
              </div>
            )}
          </div>
        )}

        {/* Team Member */}
        {event.teamMember && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Team Member</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-6">{event.teamMember}</p>
          </div>
        )}

        {/* Customer Name */}
        {event.customerName && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Customer Name</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-6">{event.customerName}</p>
          </div>
        )}

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
          <p id="detailDesc" className="text-sm text-muted-foreground leading-relaxed">
            {event.description || "No description provided"}
          </p>
        </div>

        {/* Meeting Link */}
        {event.meetingLink && (
          <div id="detailMeetingLink" className="mb-6">
            <div className="flex items-center gap-2 text-sm mb-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Meeting Link</h3>
            </div>
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="text-[#1a73e8] text-sm font-medium hover:underline ml-6"
            >
              {event.meetingLink}
            </a>
          </div>
        )}

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
