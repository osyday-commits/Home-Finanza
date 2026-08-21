import { GoogleCalendarEvent, Subscription, SavingsGoal, SmartReminderRecommendation } from '../types';
import { getCachedAccessToken } from './driveService';

/**
 * Lists upcoming financial and general events from Google Calendar.
 */
export const listUpcomingEvents = async (
  maxResults: number = 20
): Promise<GoogleCalendarEvent[]> => {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace access token missing. Please sign in with Google.');
  }

  const now = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&singleEvents=true&orderBy=startTime&maxResults=${maxResults}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list Google Calendar events: ${errText}`);
  }

  const data = await res.json();
  const items: any[] = data.items || [];

  return items.map((item) => ({
    id: item.id,
    summary: item.summary || '(Untitled Event)',
    description: item.description || '',
    start: item.start || {},
    end: item.end || {},
    htmlLink: item.htmlLink,
    isFinancialReminder: (item.summary || '').includes('💰') || (item.summary || '').includes('💳') || (item.summary || '').includes('Aura') || (item.summary || '').includes('Due:') || (item.summary || '').includes('Reminder')
  }));
};

/**
 * Creates a single financial reminder event on Google Calendar.
 */
export const createFinancialCalendarEvent = async (
  title: string,
  dueDate: string, // YYYY-MM-DD
  amount?: number,
  notes?: string
): Promise<GoogleCalendarEvent> => {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace access token missing. Please sign in with Google.');
  }

  const summary = `💳 Due: ${title} ${amount ? `($${amount.toFixed(2)})` : ''} - Aura Finance`;
  const description = `${notes || ''}\n\nAutomated financial due date reminder created by Aura Finance.`;

  const eventPayload = {
    summary,
    description,
    start: {
      date: dueDate
    },
    end: {
      date: dueDate
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 }, // 1 day before
        { method: 'popup', minutes: 120 }   // 2 hours before
      ]
    },
    colorId: '11' // Red / Flamingo highlight in Google Calendar
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventPayload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create calendar event: ${errText}`);
  }

  const created = await res.json();
  return {
    id: created.id,
    summary: created.summary,
    description: created.description,
    start: created.start,
    end: created.end,
    htmlLink: created.htmlLink,
    isFinancialReminder: true
  };
};

/**
 * Creates an AI-analyzed Smart Reminder on Google Calendar with tailored notification lead times.
 */
export const createSmartCalendarReminder = async (
  recommendation: SmartReminderRecommendation
): Promise<GoogleCalendarEvent> => {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace access token missing. Please sign in with Google.');
  }

  // Format overrides based on recommendation lead minutes or defaults
  const minutesList = recommendation.notificationLeadMinutes && recommendation.notificationLeadMinutes.length > 0
    ? recommendation.notificationLeadMinutes
    : (recommendation.optimalReminderLeadDays >= 7
        ? [10080, 4320, 1440] // 7d, 3d, 1d
        : recommendation.optimalReminderLeadDays >= 3
          ? [4320, 1440, 120]  // 3d, 1d, 2h
          : [1440, 120]);       // 1d, 2h

  const overrides = minutesList.slice(0, 5).map((mins) => ({
    method: 'popup' as const,
    minutes: mins
  }));

  // Choose color according to urgency
  // 11 = Flamingo (Red - High Urgency)
  // 6 = Tangerine (Orange - Medium Urgency)
  // 9 = Blueberry (Blue - Standard)
  const colorId = recommendation.urgencyLevel === 'High' ? '11' : recommendation.urgencyLevel === 'Medium' ? '6' : '9';

  const fullDescription = [
    `🔔 Aura Finance Smart Bill Reminder`,
    `----------------------------------------`,
    `Service / Merchant: ${recommendation.provider || recommendation.name}`,
    `Amount Due: $${recommendation.amount.toFixed(2)} (${recommendation.billingCycle})`,
    `Due Date: ${recommendation.predictedDueDate}`,
    `Urgency Level: ${recommendation.urgencyLevel.toUpperCase()}`,
    recommendation.cancellationWindowNotes ? `\n⚠️ Cancellation Notice:\n${recommendation.cancellationWindowNotes}` : '',
    recommendation.aiInsight ? `\n💡 Gemini AI Insight:\n${recommendation.aiInsight}` : '',
    recommendation.potentialAnnualSavings ? `\n💰 Estimated Annual Cost/Savings: $${recommendation.potentialAnnualSavings.toFixed(2)}/yr` : '',
    `\n---\nCreated with Gemini AI Smart Reminder on Aura Finance`
  ].filter(Boolean).join('\n');

  const eventPayload = {
    summary: recommendation.calendarEventTitle || `💳 Due: ${recommendation.name || recommendation.provider} ($${recommendation.amount.toFixed(2)}) - Aura Smart Reminder`,
    description: fullDescription,
    start: {
      date: recommendation.predictedDueDate
    },
    end: {
      date: recommendation.predictedDueDate
    },
    reminders: {
      useDefault: false,
      overrides
    },
    colorId
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventPayload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Smart Calendar Reminder: ${errText}`);
  }

  const created = await res.json();
  return {
    id: created.id,
    summary: created.summary,
    description: created.description,
    start: created.start,
    end: created.end,
    htmlLink: created.htmlLink,
    isFinancialReminder: true
  };
};

/**
 * Batch syncs all Smart Reminder recommendations to Google Calendar.
 */
export const batchSyncSmartRemindersToCalendar = async (
  recommendations: SmartReminderRecommendation[]
): Promise<{
  syncedCount: number;
  events: GoogleCalendarEvent[];
  updatedRecommendations: SmartReminderRecommendation[];
  errors: string[];
}> => {
  const createdEvents: GoogleCalendarEvent[] = [];
  const errors: string[] = [];
  const updated = [...recommendations];

  for (let i = 0; i < updated.length; i++) {
    const rec = updated[i];
    try {
      const event = await createSmartCalendarReminder(rec);
      createdEvents.push(event);
      updated[i] = {
        ...rec,
        isSyncedToCalendar: true,
        calendarEventId: event.id
      };
    } catch (err: any) {
      console.error(`Failed to sync Smart Reminder for ${rec.name}:`, err);
      errors.push(`${rec.name || rec.provider}: ${err.message || 'Unknown error'}`);
    }
  }

  return {
    syncedCount: createdEvents.length,
    events: createdEvents,
    updatedRecommendations: updated,
    errors
  };
};

/**
 * Batch syncs all active subscription due dates and savings goal target milestones to Google Calendar.
 */
export const syncSubscriptionsToCalendar = async (
  subscriptions: Subscription[],
  savingsGoals: SavingsGoal[]
): Promise<{ addedCount: number; events: GoogleCalendarEvent[] }> => {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace access token missing. Please sign in with Google.');
  }

  const createdEvents: GoogleCalendarEvent[] = [];
  const today = new Date();

  for (const sub of subscriptions) {
    if (sub.status === 'Cancelled') continue;

    // Determine upcoming renewal date
    let dueDate = sub.nextBillingDate;
    if (!dueDate) {
      // Default to next occurrence this month
      const nextMonth = new Date(today.getFullYear(), today.getMonth(), 15);
      dueDate = nextMonth.toISOString().split('T')[0];
    }

    try {
      const ev = await createFinancialCalendarEvent(
        sub.name || sub.provider,
        dueDate,
        sub.amount,
        `Billing cycle: ${sub.billingCycle} | Category: ${sub.category || 'Subscriptions'}`
      );
      createdEvents.push(ev);
    } catch (e) {
      console.error(`Failed to schedule calendar reminder for ${sub.name || sub.provider}`, e);
    }
  }

  // Add savings milestones if deadline is in the future
  for (const goal of savingsGoals) {
    if (goal.targetDate && new Date(goal.targetDate) > today) {
      try {
        const remaining = Math.max(0, goal.targetAmount - goal.currentSaved);
        const ev = await createFinancialCalendarEvent(
          `Goal Target: ${goal.title}`,
          goal.targetDate,
          remaining,
          `Target: $${goal.targetAmount} (Saved: $${goal.currentSaved})`
        );
        createdEvents.push(ev);
      } catch (e) {
        console.error(`Failed to schedule milestone for ${goal.title}`, e);
      }
    }
  }

  return {
    addedCount: createdEvents.length,
    events: createdEvents
  };
};

/**
 * Deletes an event from Google Calendar (after explicit confirmation).
 */
export const deleteCalendarEvent = async (eventId: string): Promise<boolean> => {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace access token missing.');
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  return res.ok;
};
