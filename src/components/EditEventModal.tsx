import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarEvent } from "@/pages/Index";

interface EditEventModalProps {
  isOpen: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: (updatedEvent: CalendarEvent) => void;
  isSaving?: boolean;
}

const EditEventModal = ({ isOpen, event, onClose, onSave, isSaving = false }: EditEventModalProps) => {
  const [formData, setFormData] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (event && event.source !== "recurring_task") {
      setFormData({ ...event });
    }
  }, [event, isOpen]);

  if (!isOpen || !formData) return null;

  const handleChange = (field: keyof CalendarEvent, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative bg-card rounded-lg shadow-[var(--shadow-lg)] max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          aria-label="Close modal"
          onClick={onClose}
          disabled={isSaving}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-semibold text-foreground mb-6">Edit Event</h2>

        <div className="space-y-4">
          {/* Service Type / Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              Service Type / Title
            </Label>
            <Input
              id="title"
              value={formData.title || ""}
              onChange={(e) => handleChange("title", e.target.value)}
              className="mt-1"
              disabled={isSaving}
            />
          </div>

          {/* Customer Name */}
          <div>
            <Label htmlFor="customerName" className="text-sm font-medium">
              Customer Name
            </Label>
            <Input
              id="customerName"
              value={formData.customerName || ""}
              onChange={(e) => handleChange("customerName", e.target.value)}
              className="mt-1"
              disabled={isSaving}
            />
          </div>

          {/* Customer Email */}
          <div>
            <Label htmlFor="customerEmail" className="text-sm font-medium">
              Customer Email
            </Label>
            <Input
              id="customerEmail"
              type="email"
              value={formData.customerEmail || ""}
              onChange={(e) => handleChange("customerEmail", e.target.value)}
              className="mt-1"
              disabled={isSaving}
            />
          </div>

          {/* Phone Number */}
          <div>
            <Label htmlFor="phoneNumber" className="text-sm font-medium">
              Phone Number
            </Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber || ""}
              onChange={(e) => handleChange("phoneNumber", e.target.value)}
              className="mt-1"
              disabled={isSaving}
            />
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="duration" className="text-sm font-medium">
              Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration || 60}
              onChange={(e) => handleChange("duration", parseInt(e.target.value, 10))}
              className="mt-1"
              disabled={isSaving}
            />
          </div>

          {/* Meeting Link */}
          <div>
            <Label htmlFor="meetingLink" className="text-sm font-medium">
              Meeting Link
            </Label>
            <Input
              id="meetingLink"
              type="url"
              value={formData.meetingLink || ""}
              onChange={(e) => handleChange("meetingLink", e.target.value)}
              className="mt-1"
              placeholder="https://..."
              disabled={isSaving}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving}
              rows={3}
            />
          </div>

          {/* Type of Meeting */}
          <div>
            <Label htmlFor="typeOfMeeting" className="text-sm font-medium">
              Type of Meeting
            </Label>
            <Select
              value={formData.typeOfMeeting || undefined}
              onValueChange={(value) => handleChange("typeOfMeeting", value)}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="On Call">On Call</SelectItem>
                <SelectItem value="On Google Meet / Zoom Call">On Google Meet / Zoom Call</SelectItem>
                <SelectItem value="In Person">In Person</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-8">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditEventModal;
