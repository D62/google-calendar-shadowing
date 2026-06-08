# Google Calendar Shadowing

A Google Apps Script that mirrors events from one Google Calendar into another as "Busy" placeholders — useful when you maintain two Google accounts and want your secondary calendar to reflect your primary account's availability without exposing event details.

**Typical use case:** you have a personal Gmail and a work Google Workspace account. You share your personal calendar (read-only) with your work account, and this script runs on the work account to create `Busy` blocks for every personal event that you're not already invited to.

## How it works

Every 15 minutes, the script:

1. Reads events from the **source calendar** (the one shared with the account running the script).
2. For each non-all-day event where the target account is **not** already an organizer or guest, it creates a `Busy` placeholder in the **target calendar**.
3. If the timing of an existing placeholder changes, it updates it.
4. If a source event was deleted, it removes the orphaned placeholder.
5. If the target account is later added as a guest to a source event, the duplicate placeholder is cleaned up.

Event titles, descriptions, guests, and locations are **not** copied — only start/end time and the `Busy` title, preserving privacy.

## Prerequisites

- [Node.js](https://nodejs.org/) (to install `clasp`)
- A Google account that has access to **both** calendars (source shared in read, target owned)
- The [Apps Script API](https://script.google.com/home/usersettings) enabled on your Google account

## Setup

### 1. Install clasp

```bash
npm install -g @google/clasp
clasp login
```

This opens a browser window to authorize clasp with your Google account.

### 2. Clone this repository

```bash
git clone https://github.com/d62/google-calendar-shadowing.git
cd google-calendar-shadowing
```

### 3. Create a new Apps Script project

```bash
clasp create --title "Google Calendar Shadowing" --type standalone
```

This creates a `.clasp.json` file with your new script ID. Alternatively, if you already have a script project, copy `.clasp.json.example` to `.clasp.json` and paste your script ID from `script.google.com`.

### 4. Configure

```bash
cp Config.example.js Config.js
```

Open `Config.js` and fill in your values:

```js
const CONFIG = {
  SOURCE_CAL_ID: "your-personal@gmail.com",   // calendar to read from
  TARGET_CAL_ID: "your-work@example.com",      // calendar to write placeholders into
  TARGET_EMAIL:  "your-work@example.com",      // same as above
  PLACEHOLDER_TITLE: "Busy",
  PLACEHOLDER_COLOR: "8",                      // 8 = Graphite
  LOOKAHEAD_DAYS: 60,
  SYNC_TAG: "gcal_shadow_v1",
};
```

> **Important:** `Config.js` is listed in `.gitignore`. Never commit it — it contains your email addresses.

#### Finding calendar IDs

In [Google Calendar](https://calendar.google.com), go to **Settings → [calendar name] → Integrate calendar**. The calendar ID is shown there (usually an email address or a long `...@group.calendar.google.com` string).

#### Sharing the source calendar

The source calendar must be shared with the Google account that will run this script:

1. In Google Calendar, open the source calendar settings.
2. Under **Share with specific people**, add the target account email with **"See all event details"** permission.

#### Color reference

| ID | Color |
|----|-------|
| 1  | Lavender |
| 2  | Sage |
| 3  | Grape |
| 4  | Flamingo |
| 5  | Banana |
| 6  | Tangerine |
| 7  | Peacock |
| 8  | Graphite |
| 9  | Blueberry |
| 10 | Basil |
| 11 | Tomato |

#### Timezone

Edit `appsscript.json` and set `timeZone` to your local timezone (e.g. `"Europe/Paris"`, `"America/New_York"`). See the [list of supported timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

### 5. Push the code

```bash
clasp push
```

### 6. Run setup (once)

Open your script in the browser:

```bash
clasp open
```

In the Apps Script editor:

1. Select the `setup` function from the function dropdown.
2. Click **Run**.
3. Accept the permission prompts (the script needs access to Google Calendar).
4. Check the **Execution log** — you should see both calendars confirmed and a trigger created.

That's it. The script will now run automatically every 15 minutes.

## Manual utilities

These functions can be run from the Apps Script editor at any time:

| Function | What it does |
|---|---|
| `setup()` | Verifies calendar access and (re)creates the 15-min trigger |
| `syncCalendars()` | Runs a sync immediately |
| `fixPlaceholderColors()` | Reapplies the configured color to all existing placeholders |
| `removeAllPlaceholders()` | Deletes all placeholders (full reset) |

## Updating the script

After editing files locally:

```bash
clasp push
```

No need to re-run `setup()` unless you change `SOURCE_CAL_ID` or `TARGET_CAL_ID`.

## Troubleshooting

**"Cannot access source calendar"**
The source calendar is not shared with the account running the script. See the sharing step above.

**"Cannot access target calendar"**
Make sure the script is deployed under the same Google account that owns the target calendar. Check **File → Project properties** in the Apps Script editor.

**Placeholders not appearing**
Run `syncCalendars()` manually and check the **Execution log** for errors. Also verify the source calendar has upcoming events that are not all-day.

**Duplicate placeholders**
Run `removeAllPlaceholders()` to reset, then run `syncCalendars()` to rebuild from scratch.

**Trigger not firing**
Go to the Apps Script editor → **Triggers** (clock icon on the left). If no trigger exists, run `setup()` again.

## License

MIT
