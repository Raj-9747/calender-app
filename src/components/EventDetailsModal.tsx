import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const EventDetailsModal = () => {
  return (
    <div
      id="eventDetails"
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden items-center justify-center p-4"
    >
      <div className="bg-card rounded-lg shadow-[var(--shadow-lg)] max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h2 id="detailTitle" className="text-2xl font-semibold text-foreground mb-1">
              Event Title
            </h2>
            <p id="detailDate" className="text-sm text-muted-foreground">
              Event Date
            </p>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
          <p id="detailDesc" className="text-sm text-muted-foreground leading-relaxed">
            Event description will appear here
          </p>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <Button variant="outline" className="hover:bg-secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
