import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Meeting {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  organizer: { fullName: string };
  participant: { fullName: string };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
}

const API_URL = "https://nexus-production-abcc.up.railway.app/api/meetings";

export default function MeetingCalendar() {
  const { token } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      if (!token) return;
      try {
        const res = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const mapped = res.data.meetings.map((m: Meeting) => ({
          id: m._id,
          title: `${m.title} (${m.status})`,
          start: new Date(m.startTime),
          end: new Date(m.endTime),
          status: m.status,
        }));

        setEvents(mapped);
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, [token]);

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#3174ad"; // pending - blue
    if (event.status === "accepted") backgroundColor = "#28a745"; // green
    if (event.status === "rejected") backgroundColor = "#dc3545"; // red
    if (event.status === "cancelled") backgroundColor = "#6c757d"; // grey

    return { style: { backgroundColor, borderRadius: "4px", color: "white" } };
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading meetings...</div>;
  }

  return (
    <div style={{ height: "600px", padding: "20px" }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        eventPropGetter={eventStyleGetter}
        style={{ height: "100%" }}
      />
    </div>
  );
}