import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

interface AddEventModalProps {
  isOpen: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onAddEvent: (title: string, description: string) => Promise<void>;
  isSaving: boolean;
}

const AddEventModal = ({
  isOpen,
  selectedDate,
  onClose,
  onAddEvent,
  isSaving,
}: AddEventModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setMeetingLink("");
    }
  }, [isOpen]);

  const formatDateDisplay = (date: Date | null): string => {
    if (!date) return "No date selected";
    
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const handleSubmit = async () => {
    if (!title.trim() || isSaving) return;
    await onAddEvent(title, description);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="eventModal"
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg shadow-[var(--shadow-lg)] max-w-md w-full p-6 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Add Event</h2>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close modal"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selected Date Display */}
        <div className="mb-4 text-sm text-muted-foreground">
          <span id="selectedDateDisplay">{formatDateDisplay(selectedDate)}</span>
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>

          <div>
            <label
              htmlFor="eventMeetingLink"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Meeting Link
            </label>
            <Input
              id="eventMeetingLink"
              type="url"
              placeholder="https://meet.google.com/..."
              className="w-full"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" className="hover:bg-secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? "Saving..." : "Save Event"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddEventModal;
