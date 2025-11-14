import CalendarHeader from "@/components/CalendarHeader";
import CalendarGrid from "@/components/CalendarGrid";
import AddEventModal from "@/components/AddEventModal";
import EventDetailsModal from "@/components/EventDetailsModal";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <CalendarHeader />
        <CalendarGrid />
      </div>
      
      <AddEventModal />
      <EventDetailsModal />
    </div>
  );
};

export default Index;
