import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type DeleteEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sendEmail: boolean) => Promise<void>;
  eventTitle?: string;
};

export default function DeleteEventModal({ isOpen, onClose, onConfirm, eventTitle }: DeleteEventModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => {
        if (isLoading) return;
        onClose();
      }}
    >
      <div
        className={`relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl transition-transform duration-200 ease-out ${
          isLoading ? "" : "animate-in fade-in zoom-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4] disabled:opacity-50"
          onClick={onClose}
          disabled={isLoading}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold text-[#202124]">Delete Event?</h2>
        {isLoading ? (
          <div className="mt-4 flex items-center gap-3">
            <svg className="h-5 w-5 animate-spin text-[#1a73e8]" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.75" />
            </svg>
            <p className="text-sm font-medium text-[#202124]">Deleting event… please wait</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#5f6368]">
            Are you sure you want to delete event: {eventTitle || "Untitled Event"}?
          </p>
        )}

        {!isLoading && (
          <label className="mt-4 flex items-center gap-2 text-sm text-[#5f6368] select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border border-[#c4c7cf] text-[#1a73e8] focus:ring-[#1a73e8]"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            disabled={isLoading}
          />
          <span>Send email notification for this deleted event</span>
        </label>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="text-[#5f6368]"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="bg-[#d93025] hover:bg-[#b3261e]"
            onClick={async () => {
              if (isLoading) return;
              setIsLoading(true);
              try {
                await onConfirm(sendEmail);
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}