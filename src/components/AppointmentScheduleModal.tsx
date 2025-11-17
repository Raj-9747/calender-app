import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface AppointmentScheduleModalProps {
  isOpen: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onAddAppointment: (values: {
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
  }) => Promise<void>;
  isSaving: boolean;
  isAdmin: boolean;
  teamMembers: string[];
  initialTeamMember?: string | null;
}

const AppointmentScheduleModal = ({
  isOpen,
  selectedDate,
  onClose,
  onAddAppointment,
  isSaving,
  isAdmin,
  teamMembers,
  initialTeamMember,
}: AppointmentScheduleModalProps) => {
  const [serviceType, setServiceType] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTeamMember, setSelectedTeamMember] = useState("");

  useEffect(() => {
    if (isOpen && selectedDate) {
      setDate(selectedDate.toISOString().slice(0, 10));
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      setServiceType("");
      setCustomerName("");
      setCustomerEmail("");
      setPhoneNumber("");
      setDate("");
      setTime("");
      setDuration("60");
      setMeetingLink("");
      setDescription("");
      setSelectedTeamMember("");
      return;
    }

    if (isAdmin) {
      const fallbackMember = initialTeamMember ?? teamMembers[0] ?? "";
      setSelectedTeamMember(fallbackMember);
    }
  }, [isOpen, isAdmin, initialTeamMember, teamMembers]);

  const handleSubmit = async () => {
    if (!serviceType.trim() || !date || !time) return;
    if (isAdmin && !selectedTeamMember) return;

    try {
      await onAddAppointment({
        serviceType,
        customerName,
        customerEmail,
        phoneNumber,
        date,
        time,
        duration,
        meetingLink,
        description,
        teamMember: isAdmin ? selectedTeamMember : undefined,
      });
    } catch (error) {
      console.error("Failed to save appointment:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#202124]">Appointment schedule</h2>
            <p className="text-sm text-[#5f6368]">Create a calendar event with customer details.</p>
          </div>
          <button type="button" className="text-[#5f6368] hover:text-[#202124]" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#5f6368]">
                Consultancy / Service type
              </label>
              <Input
                placeholder="Brand strategy session"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#5f6368]">Customer name</label>
              <Input
                placeholder="Alex Johnson"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#5f6368]">Customer email</label>
              <Input
                type="email"
                placeholder="alex@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#5f6368]">Phone number</label>
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-[#5f6368]">Booking date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-[#5f6368]">Booking time</label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#5f6368]">Duration (minutes)</label>
              <Input
                type="number"
                min="15"
                step="15"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#5f6368]">Meeting link</label>
              <Input
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#5f6368]">Description</label>
              <Textarea
                placeholder="Share agenda or preparation notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            {isAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5f6368]">
                  Select team member
                </label>
                <Select
                  value={selectedTeamMember || undefined}
                  onValueChange={(value) => setSelectedTeamMember(value)}
                  disabled={teamMembers.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member} value={member}>
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" className="border-[#d2d6e3]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-[#1a73e8] hover:bg-[#155fc8]"
            disabled={!serviceType.trim() || !date || !time || (isAdmin && !selectedTeamMember) || isSaving}
            onClick={handleSubmit}
          >
            {isSaving ? "Saving..." : "Save appointment"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentScheduleModal;

