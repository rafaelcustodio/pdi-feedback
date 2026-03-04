import { prisma } from "@/lib/prisma";

export type GraphCalendarEvent = {
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  body: { contentType: string; content: string };
  attendees: Array<{
    emailAddress: { address: string; name?: string };
    type: string;
  }>;
  location?: {
    displayName: string;
    locationEmailAddress?: string;
  };
};

export type MeetingRoom = {
  id: string;
  emailAddress: string;
  displayName: string;
  capacity: number | null;
  building: string | null;
  floorNumber: number | null;
};

export type RoomAvailability = {
  room: MeetingRoom;
  available: boolean;
};

/** Per-day availability view from getSchedule. Key = "YYYY-MM-DD", value = availabilityView string */
export type RoomScheduleMap = Map<string, string>;

/**
 * Get a valid Microsoft access token for a user, refreshing if expired.
 * Returns null if the user has no stored tokens.
 */
export async function getUserToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      msAccessToken: true,
      msRefreshToken: true,
      msTokenExpiresAt: true,
    },
  });

  if (!user?.msAccessToken) {
    return null;
  }

  // Check if token is still valid (with 5 min buffer)
  if (user.msTokenExpiresAt && user.msTokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return user.msAccessToken;
  }

  // Token expired — try to refresh
  if (!user.msRefreshToken) {
    return null;
  }

  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    return null;
  }

  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: user.msRefreshToken,
          scope: "https://graph.microsoft.com/.default",
        }),
      }
    );

    if (!response.ok) {
      console.error("Failed to refresh Microsoft token:", response.status);
      return null;
    }

    const data = await response.json();

    await prisma.user.update({
      where: { id: userId },
      data: {
        msAccessToken: data.access_token,
        msRefreshToken: data.refresh_token ?? user.msRefreshToken,
        msTokenExpiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : null,
      },
    });

    return data.access_token as string;
  } catch (error) {
    console.error("Error refreshing Microsoft token:", error);
    return null;
  }
}

/**
 * Create a calendar event via Microsoft Graph API.
 * Returns the event ID on success, null on error.
 */
export async function createCalendarEvent(
  accessToken: string,
  event: GraphCalendarEvent
): Promise<string | null> {
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      console.error("Failed to create calendar event:", response.status);
      return null;
    }

    const data = await response.json();
    return data.id as string;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return null;
  }
}

/**
 * Update an existing calendar event via Microsoft Graph API.
 * Returns true on success, false on error.
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: Partial<GraphCalendarEvent>
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      console.error("Failed to update calendar event:", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating calendar event:", error);
    return false;
  }
}

/**
 * Delete a calendar event via Microsoft Graph API.
 * Returns true on success, false on error.
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to delete calendar event:", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    return false;
  }
}

/**
 * List all meeting rooms in the tenant via Microsoft Graph API.
 * Returns an empty array on error or if no rooms are configured.
 */
export async function listMeetingRooms(
  accessToken: string
): Promise<MeetingRoom[]> {
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/places/microsoft.graph.room",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to list meeting rooms:", response.status);
      return [];
    }

    const data = await response.json();
    const rooms: MeetingRoom[] = (data.value ?? []).map(
      (r: Record<string, unknown>) => ({
        id: r.id as string,
        emailAddress: r.emailAddress as string,
        displayName: r.displayName as string,
        capacity: (r.capacity as number) ?? null,
        building: (r.building as string) ?? null,
        floorNumber: (r.floorNumber as number) ?? null,
      })
    );

    return rooms;
  } catch (error) {
    console.error("Error listing meeting rooms:", error);
    return [];
  }
}

/**
 * Check availability of multiple rooms for a given time slot.
 * Returns a map of email → available (boolean).
 */
export async function getRoomsAvailability(
  accessToken: string,
  roomEmails: string[],
  startDateTime: string,
  endDateTime: string,
  timeZone: string = "America/Sao_Paulo"
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (roomEmails.length === 0) return result;

  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/calendar/getSchedule",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedules: roomEmails,
          startTime: { dateTime: startDateTime, timeZone },
          endTime: { dateTime: endDateTime, timeZone },
          availabilityViewInterval: 60,
        }),
      }
    );

    if (!response.ok) {
      console.error("Failed to get rooms availability:", response.status);
      for (const email of roomEmails) {
        result.set(email, true);
      }
      return result;
    }

    const data = await response.json();
    for (const schedule of data.value ?? []) {
      const email = (schedule.scheduleId as string).toLowerCase();
      const view = schedule.availabilityView as string;
      // availabilityView: 0=free, 1=tentative, 2=busy, 3=oof, 4=working elsewhere
      const available = !view || /^0+$/.test(view);
      result.set(email, available);
    }

    return result;
  } catch (error) {
    console.error("Error getting rooms availability:", error);
    for (const email of roomEmails) {
      result.set(email, true);
    }
    return result;
  }
}

/**
 * Get a room's schedule (availabilityView) for a date range.
 * Returns a Map where key = "YYYY-MM-DD" and value = availabilityView string
 * for that day from 08:00 to 18:30 (with 30-min granularity = 21 chars per day).
 *
 * Each char in availabilityView: '0'=free, '1'=tentative, '2'=busy, '3'=oof, '4'=working elsewhere
 */
export async function getRoomScheduleForDateRange(
  accessToken: string,
  roomEmail: string,
  startDate: string,
  endDate: string,
  timeZone: string = "America/Sao_Paulo"
): Promise<RoomScheduleMap> {
  const result: RoomScheduleMap = new Map();

  try {
    const startDateTime = `${startDate}T08:00:00`;
    const endDateTime = `${endDate}T18:30:00`;

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/calendar/getSchedule",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schedules: [roomEmail],
          startTime: { dateTime: startDateTime, timeZone },
          endTime: { dateTime: endDateTime, timeZone },
          availabilityViewInterval: 30,
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[getRoomScheduleForDateRange] HTTP", response.status, "for", roomEmail, body);
      return result;
    }

    const data = await response.json();
    const schedule = data.value?.[0];
    if (!schedule?.availabilityView) {
      console.warn("[getRoomScheduleForDateRange] Empty availabilityView for", roomEmail, "data:", JSON.stringify(data));
      return result;
    }

    const fullView = schedule.availabilityView as string;

    // The availabilityView is a continuous string from startDate T08:00 to endDate T18:30.
    // Each calendar day = 24h = 48 half-hour slots from the query start perspective.
    // Only the first 21 slots of each day (08:00-18:30) contain business hours data.
    const start = new Date(startDate);
    const end = new Date(endDate);
    const slotsPerFullDay = 48; // 24h * 2 slots/h
    const slotsPerBusinessWindow = 21; // 08:00 to 18:30 = 21 half-hours

    let dayIndex = 0;
    const current = new Date(start);
    while (current <= end) {
      const dateKey = current.toISOString().slice(0, 10);
      const offset = dayIndex * slotsPerFullDay;
      const dayView = fullView.slice(offset, offset + slotsPerBusinessWindow);
      if (dayView.length > 0) {
        result.set(dateKey, dayView);
      }
      current.setDate(current.getDate() + 1);
      dayIndex++;
    }

    return result;
  } catch (error) {
    console.error("Error getting room schedule for date range:", error);
    return result;
  }
}
