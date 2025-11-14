import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

const AddEventModal = () => {
  return (
    <div
      id="eventModal"
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden items-center justify-center p-4"
    >
      <div className="bg-card rounded-lg shadow-[var(--shadow-lg)] max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Add Event</h2>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selected Date Display */}
        <div className="mb-4 text-sm text-muted-foreground">
          <span id="selectedDateDisplay">Selected Date</span>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 mb-6">
          <div>
            <label
              htmlFor="eventTitle"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Event Title
            </label>
            <Input
              id="eventTitle"
              type="text"
              placeholder="Enter event title"
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="eventDesc"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Event Description
            </label>
            <Textarea
              id="eventDesc"
              placeholder="Enter event description"
              className="w-full min-h-[120px] resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" className="hover:bg-secondary">
            Cancel
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            Save Event
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddEventModal;
