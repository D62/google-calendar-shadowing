// ============================================================
// Configuration — copy this file to Config.js and fill in your values.
// Config.js is gitignored to keep your email addresses private.
// ============================================================

const CONFIG = {
  // The calendar you want to READ from (must be shared with the account running this script).
  // Usually the email address of the source Google account.
  SOURCE_CAL_ID: "source-account@gmail.com",

  // The calendar you want to WRITE "Busy" placeholders into.
  // Usually the email address of the target Google account (the one running this script).
  TARGET_CAL_ID: "target-account@example.com",

  // The email address of the target account.
  // Used to detect whether the target account is already invited to an event
  // (in which case no placeholder is needed).
  TARGET_EMAIL: "target-account@example.com",

  // Title displayed on placeholder events in the target calendar.
  PLACEHOLDER_TITLE: "Busy",

  // Color index for placeholder events (Google Calendar color ids: 1–11).
  // 1=Lavender 2=Sage 3=Grape 4=Flamingo 5=Banana 6=Tangerine
  // 7=Peacock 8=Graphite 9=Blueberry 10=Basil 11=Tomato
  PLACEHOLDER_COLOR: "8",

  // How many days ahead to synchronize.
  LOOKAHEAD_DAYS: 60,

  // Internal tag written in the description of each placeholder.
  // Change this only if you run multiple instances and need to distinguish them.
  SYNC_TAG: "gcal_shadow_v1",
};
