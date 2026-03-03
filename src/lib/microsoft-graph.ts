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
};

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
