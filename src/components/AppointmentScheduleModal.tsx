import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

interface AppointmentScheduleModalProps {
  isOpen: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onAddAppointment: (
    title: string,
    date: string,
    time: string,
    duration: string,
    location: string,
    notes: string
  ) => void;
}

const AppointmentScheduleModal = ({
  isOpen,
  selectedDate,
  onClose,
  onAddAppointment,
}: AppointmentScheduleModalProps) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen && selectedDate) {
      setDate(selectedDate.toISOString().slice(0, 10));
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDate("");
      setTime("");
      setDuration("30");
      setLocation("");
      setNotes("");
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!title.trim() || !date || !time) return;
    onAddAppointment(title, date, time, duration, location, notes);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#202124]">Appointment schedule</h2>
          <button type="button" className="text-[#5f6368] hover:text-[#202124]" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[#5f6368]" htmlFor="apptTitle">
              Title
            </label>
            <Input
              id="apptTitle"
              placeholder="Intro consultation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#5f6368]" htmlFor="apptDate">
              Date
            </label>
            <Input id="apptDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#5f6368]" htmlFor="apptTime">
              Start time
            </label>
            <Input id="apptTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#5f6368]" htmlFor="apptDuration">
              Duration (minutes)
            </label>
            <Input
              id="apptDuration"
              type="number"
              min="15"
              step="15"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#5f6368]" htmlFor="apptLocation">
              Meeting link or location
            </label>
            <Input
              id="apptLocation"
              placeholder="https://meet.google.com/..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[#5f6368]" htmlFor="apptNotes">
              Notes
            </label>
            <Textarea
              id="apptNotes"
              placeholder="Share booking instructions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" className="border-[#d2d6e3]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-[#1a73e8] hover:bg-[#155fc8]"
            disabled={!title.trim() || !date || !time}
            onClick={handleSubmit}
          >
            Save schedule
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentScheduleModal;

