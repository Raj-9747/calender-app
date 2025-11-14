import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

interface AddTaskModalProps {
  isOpen: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onAddTask: (title: string, dueDate: string, notes: string) => void;
}

const AddTaskModal = ({ isOpen, selectedDate, onClose, onAddTask }: AddTaskModalProps) => {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen && selectedDate) {
      setDueDate(selectedDate.toISOString().slice(0, 10));
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDueDate("");
      setNotes("");
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!title.trim() || !dueDate) return;
    onAddTask(title, dueDate, notes);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#202124]">Create task</h2>
          <button type="button" className="text-[#5f6368] hover:text-[#202124]" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#5f6368]" htmlFor="taskTitle">
              Title
            </label>
            <Input
              id="taskTitle"
              placeholder="Prepare presentation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#5f6368]" htmlFor="taskDueDate">
              Due date
            </label>
            <Input
              id="taskDueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#5f6368]" htmlFor="taskNotes">
              Notes
            </label>
            <Textarea
              id="taskNotes"
              placeholder="Add context or subtasks"
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
          <Button className="bg-[#1a73e8] hover:bg-[#155fc8]" disabled={!title.trim() || !dueDate} onClick={handleSubmit}>
            Save task
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;

