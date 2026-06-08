// ============================================================
// Google Calendar Shadowing
// Reads a source calendar (shared in read) and writes "Busy"
// placeholders into a target calendar. Handles create, update
// (time changes), and delete. Skips all-day events and events
// where the target account is already a guest or organizer.
// Trigger: every 15 minutes (set up via setup()).
// ============================================================

// ============================================================
// MAIN — run on time-driven trigger (every 15 min)
// ============================================================
function syncCalendars() {
  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + CONFIG.LOOKAHEAD_DAYS);

  const sourceEvents = getSourceCalendarEvents(now, end);
  const targetCal = CalendarApp.getCalendarById(CONFIG.TARGET_CAL_ID);

  // Split the target calendar into our placeholders vs. the user's real events.
  // The source calendar is shared as free/busy only, so we cannot read its
  // organizer/guest details. Instead we detect "the target is already busy for
  // this event" by checking whether a native (non-placeholder) target event
  // already occupies the same time slot — which is exactly what happens when the
  // target account is the organizer or a guest of the source event.
  const targetEvents = targetCal.getEvents(now, end);
  const existingPlaceholders = targetEvents.filter(isPlaceholder);
  const nativeEvents = targetEvents.filter(e => !isPlaceholder(e));

  const placeholderMap = {};
  existingPlaceholders.forEach(e => {
    const id = extractSourceId(e);
    if (id) placeholderMap[id] = e;
  });

  let created = 0, updated = 0, deleted = 0, skipped = 0;

  for (const event of sourceEvents) {
    const sourceEventId = event.getId();

    if (event.isAllDayEvent()) {
      skipped++;
      continue;
    }

    const existing = placeholderMap[sourceEventId];

    if (hasMatchingNativeEvent(nativeEvents, event)) {
      // Target is already busy at this exact time via a real event (organizer or
      // guest) — no placeholder needed. Remove any stale placeholder.
      if (existing) {
        try {
          existing.deleteEvent();
          deleted++;
          Logger.log(`Removed duplicate (target already busy): ${event.getStartTime()}`);
        } catch (e) {
          Logger.log(`Error removing duplicate: ${e.message}`);
        }
      } else {
        skipped++;
      }
      continue;
    }

    // Target is free at this time — placeholder needed.
    if (!existing) {
      try {
        const placeholder = targetCal.createEvent(
          CONFIG.PLACEHOLDER_TITLE,
          event.getStartTime(),
          event.getEndTime(),
          { description: buildTag(sourceEventId) }
        );
        placeholder.setColor(CONFIG.PLACEHOLDER_COLOR);
        created++;
        Logger.log(`Created: ${event.getTitle()} (${event.getStartTime()})`);
      } catch (e) {
        Logger.log(`Error creating placeholder: ${e.message}`);
      }
    } else {
      const startChanged = existing.getStartTime().getTime() !== event.getStartTime().getTime();
      const endChanged = existing.getEndTime().getTime() !== event.getEndTime().getTime();

      if (startChanged || endChanged) {
        try {
          existing.setTime(event.getStartTime(), event.getEndTime());
          updated++;
          Logger.log(`Updated: ${event.getTitle()} (${event.getStartTime()})`);
        } catch (e) {
          Logger.log(`Error updating placeholder: ${e.message}`);
        }
      } else {
        skipped++;
      }
    }
  }

  const orphansDeleted = cleanupOrphanedPlaceholders(existingPlaceholders, sourceEvents);
  deleted += orphansDeleted;

  Logger.log(`Done. Created: ${created}, Updated: ${updated}, Deleted: ${deleted}, Skipped: ${skipped}`);
}

// ============================================================
// SETUP — run once manually from the Apps Script editor
// ============================================================
function setup() {
  const sourceCal = CalendarApp.getCalendarById(CONFIG.SOURCE_CAL_ID);
  const targetCal = CalendarApp.getCalendarById(CONFIG.TARGET_CAL_ID);

  if (!sourceCal) throw new Error(`Cannot access source calendar: ${CONFIG.SOURCE_CAL_ID}`);
  if (!targetCal) throw new Error(`Cannot access target calendar: ${CONFIG.TARGET_CAL_ID}`);

  Logger.log(`Source calendar: "${sourceCal.getName()}" ✓`);
  Logger.log(`Target calendar: "${targetCal.getName()}" ✓`);

  // Remove any existing trigger to avoid duplicates
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "syncCalendars")
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("syncCalendars")
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log("Trigger created. Sync will run every 15 minutes.");
}

// ============================================================
// UTILITY — fix colors on existing placeholders (run manually)
// ============================================================
function fixPlaceholderColors() {
  const targetCal = CalendarApp.getCalendarById(CONFIG.TARGET_CAL_ID);
  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + CONFIG.LOOKAHEAD_DAYS);

  const placeholders = getExistingPlaceholders(targetCal, now, end);
  placeholders.forEach(e => e.setColor(CONFIG.PLACEHOLDER_COLOR));
  Logger.log(`Updated ${placeholders.length} placeholder(s).`);
}

// ============================================================
// UTILITY — remove all placeholders (full reset, run manually)
// ============================================================
function removeAllPlaceholders() {
  const targetCal = CalendarApp.getCalendarById(CONFIG.TARGET_CAL_ID);
  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + CONFIG.LOOKAHEAD_DAYS);

  const placeholders = getExistingPlaceholders(targetCal, now, end);
  placeholders.forEach(e => {
    try { e.deleteEvent(); } catch (err) { Logger.log(`Error: ${err.message}`); }
  });
  Logger.log(`Removed ${placeholders.length} placeholder(s).`);
}

// ============================================================
// Helpers
// ============================================================

function isPlaceholder(event) {
  return (event.getDescription() || "").includes(CONFIG.SYNC_TAG);
}

// True when the target calendar already has a real (non-placeholder) event at
// the exact same start/end as the source event. This is how an event where the
// target is the organizer or a guest shows up natively, so no placeholder is
// needed for it.
function hasMatchingNativeEvent(nativeEvents, sourceEvent) {
  const start = sourceEvent.getStartTime().getTime();
  const end = sourceEvent.getEndTime().getTime();
  return nativeEvents.some(n =>
    n.getStartTime().getTime() === start && n.getEndTime().getTime() === end
  );
}

function getSourceCalendarEvents(start, end) {
  try {
    const cal = CalendarApp.getCalendarById(CONFIG.SOURCE_CAL_ID);
    if (!cal) {
      Logger.log("Could not access source calendar.");
      return [];
    }
    return cal.getEvents(start, end);
  } catch (e) {
    Logger.log(`Error fetching source events: ${e.message}`);
    return [];
  }
}

function getExistingPlaceholders(targetCal, start, end) {
  return targetCal.getEvents(start, end).filter(isPlaceholder);
}

function extractSourceId(placeholderEvent) {
  const match = (placeholderEvent.getDescription() || "").match(/source_id:([^\s]+)/);
  return match ? match[1] : null;
}

function buildTag(sourceEventId) {
  return `${CONFIG.SYNC_TAG} source_id:${sourceEventId}`;
}

function cleanupOrphanedPlaceholders(placeholders, sourceEvents) {
  const activeIds = new Set(sourceEvents.map(e => e.getId()));
  let deleted = 0;

  for (const placeholder of placeholders) {
    const sourceId = extractSourceId(placeholder);
    if (sourceId && !activeIds.has(sourceId)) {
      try {
        placeholder.deleteEvent();
        deleted++;
        Logger.log(`Deleted orphaned placeholder: ${placeholder.getStartTime()}`);
      } catch (e) {
        Logger.log(`Error deleting placeholder: ${e.message}`);
      }
    }
  }

  return deleted;
}