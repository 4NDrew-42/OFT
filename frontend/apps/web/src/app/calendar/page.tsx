"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { mintJWT, getMyEvents, createEvent, updateEvent, deleteEvent } from "@/lib/orionClient";
import CalendarComponent from "@/components/calendar/CalendarComponent";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  tags?: string[];
  color?: string;
  allDay?: boolean;
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const sub = session?.user?.email ?? "";

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load events on mount
  useEffect(() => {
    if (sub) {
      loadEvents();
    }
  }, [sub]);

  async function loadEvents() {
    if (!sub) return;

    try {
      setLoading(true);
      setError(null);
      const token = await mintJWT(sub);
      const response = await getMyEvents(sub, token);

      if (response.success && response.events) {
        // Convert API events to calendar format
        const calendarEvents = response.events.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start_time),
          end: new Date(event.end_time || event.start_time),
          description: event.description,
          location: event.location,
          tags: event.tags || [],
          color: event.color,
          allDay: event.all_day || false,
        }));

        setEvents(calendarEvents);
      }
    } catch (e: any) {
      console.error("Failed to load events:", e);
      setError(e?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  async function handleEventCreate(eventData: Omit<CalendarEvent, "id">) {
    if (!sub) throw new Error("Not authenticated");

    const token = await mintJWT(sub);

    const apiEventData = {
      user_email: sub,
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start_time: eventData.start.toISOString(),
      end_time: eventData.end.toISOString(),
      all_day: eventData.allDay || false,
      tags: eventData.tags || [],
      color: eventData.color,
    };

    const response = await createEvent(apiEventData, token);

    if (response.success && response.event) {
      // Add new event to state
      const newEvent: CalendarEvent = {
        id: response.event.id,
        title: response.event.title,
        start: new Date(response.event.start_time),
        end: new Date(response.event.end_time),
        description: response.event.description,
        location: response.event.location,
        tags: response.event.tags || [],
        color: response.event.color,
        allDay: response.event.all_day || false,
      };

      setEvents((prev) => [...prev, newEvent]);
    }
  }

  async function handleEventUpdate(id: string, eventData: Partial<CalendarEvent>) {
    if (!sub) throw new Error("Not authenticated");

    const token = await mintJWT(sub);

    const apiEventData: any = {};

    if (eventData.title !== undefined) apiEventData.title = eventData.title;
    if (eventData.description !== undefined) apiEventData.description = eventData.description;
    if (eventData.location !== undefined) apiEventData.location = eventData.location;
    if (eventData.start !== undefined) apiEventData.start_time = eventData.start.toISOString();
    if (eventData.end !== undefined) apiEventData.end_time = eventData.end.toISOString();
    if (eventData.allDay !== undefined) apiEventData.all_day = eventData.allDay;
    if (eventData.tags !== undefined) apiEventData.tags = eventData.tags;
    if (eventData.color !== undefined) apiEventData.color = eventData.color;

    const response = await updateEvent(id, apiEventData, token);

    if (response.success && response.event) {
      // Update event in state
      setEvents((prev) =>
        prev.map((event) =>
          event.id === id
            ? {
                ...event,
                title: response.event.title,
                start: new Date(response.event.start_time),
                end: new Date(response.event.end_time),
                description: response.event.description,
                location: response.event.location,
                tags: response.event.tags || [],
                color: response.event.color,
                allDay: response.event.all_day || false,
              }
            : event
        )
      );
    }
  }

  async function handleEventDelete(id: string) {
    if (!sub) throw new Error("Not authenticated");

    const token = await mintJWT(sub);
    const response = await deleteEvent(id, token);

    if (response.success) {
      // Remove event from state
      setEvents((prev) => prev.filter((event) => event.id !== id));
    }
  }

  return (
    <main className="p-4 pb-24 h-screen flex flex-col">
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <CalendarComponent
          events={events}
          onEventCreate={handleEventCreate}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleEventDelete}
          loading={loading}
        />
      </div>
    </main>
  );
}

