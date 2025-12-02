# Recurring Tasks Implementation Guide

## Overview
This implementation adds support for fetching and displaying recurring tasks from the `recurring_tasks` table when viewing a team member's calendar. Recurring tasks are displayed with distinct visual styling to differentiate them from regular bookings.

## Changes Made

### 1. **Database Schema Support**
- **Table**: `public.recurring_tasks`
- **Fields**:
  - `id`: Unique identifier
  - `team_member`: Name of the team member (e.g., "shafoli")
  - `event_title`: Title of the recurring task
  - `event_date`: Date in YYYY-MM-DD format
  - `start_time`: Start time in HH:MM:SS format
  - `end_time`: End time in HH:MM:SS format
  - `batch_id`: Optional batch identifier for grouped tasks
  - `created_at`: Timestamp of creation

### 2. **Type Definitions** (`src/pages/Index.tsx`)
- Added `RecurringTask` interface to represent database records
- Updated `CalendarEvent` interface with new `source` property to distinguish between:
  - `"booking"`: Regular appointment bookings
  - `"recurring_task"`: Tasks from recurring_tasks table

### 3. **Data Fetching Functions** (`src/pages/Index.tsx`)

#### `normalizeRecurringTasks(rows: RecurringTask[]): CalendarEvent[]`
- Converts recurring task records into CalendarEvent format
- Generates ISO timestamps from date and time fields
- Calculates duration based on start and end times
- Sets `source: "recurring_task"` for identification

#### `loadRecurringTasks(): Promise<CalendarEvent[]>`
- Fetches recurring tasks for the current user (non-admin) or selected team member (admin)
- Queries the `recurring_tasks` table filtered by team member
- Returns normalized calendar events

#### `loadRecurringTasksForDate(date: Date): Promise<CalendarEvent[]>`
- Fetches recurring tasks for a specific date
- Used in day view to show tasks for that particular day
- Filters by date and team member

### 4. **Visual Styling Changes**

#### Color Scheme for Recurring Tasks
Recurring tasks use a distinct color palette:
- 🔴 Red (#ea4335)
- 🟡 Yellow (#fbbc04)
- 🟢 Green (#34a853)
- 🔵 Teal (#00897b)
- 🔵 Dark Blue (#1565c0)
- 🟣 Purple (#6f42c1)

Colors are assigned based on the team member name's first character.

#### Visual Indicators
- **📌 Pin Emoji**: Displayed with recurring task titles
- **Thicker Border**: 8px left border (vs 4px for bookings)
- **Distinct Background**: Slightly different opacity/color intensity
- **Label**: "Recurring Task" displayed instead of customer info

### 5. **Component Updates**

#### `CalendarGrid.tsx`
- Updated `getEventColor()` function to detect and color recurring tasks
- Added visual indicators (pin emoji, thicker border) to recurring tasks
- Modified tooltip to indicate recurring task source

#### `DayView.tsx`
- Updated `getEventColor()` for recurring task detection
- Enhanced event cards with:
  - Pin emoji indicator
  - Thicker left border (8px)
  - "Recurring Task" label in place of customer info
  - Different background opacity

#### `Index.tsx` (Mobile Sheet)
- Updated `getMobileEventAccent()` to use recurring task color palette
- Enhanced mobile event display with:
  - Pin emoji in title
  - Thicker left border
  - "Recurring Task" badge
  - Different styling for better visual separation

### 6. **Event Combination Logic**
- `renderEvents()` combines both bookings and recurring tasks for a given date
- Day view merges both event sources for comprehensive daily display
- Events are sorted by date and time for chronological display

## Usage

### For Admin Users
When viewing a specific team member's calendar:
1. Select team member from dropdown filter
2. Recurring tasks for that member will be fetched and displayed
3. Both bookings and recurring tasks are shown together

### For Non-Admin Users (e.g., "shafoli")
- Login with team member credentials
- Automatic fetching of personal recurring tasks
- Tasks appear alongside regular bookings

### How to Tell Them Apart
- **📌 Pin Icon**: Indicates a recurring task
- **Color**: Different color palette (more vibrant)
- **Border**: Thicker left border on cards
- **Label**: "Recurring Task" appears in event details
- **Background**: Slightly more opaque background

## Technical Details

### Data Flow
```
User Login → Load Bookings + Load Recurring Tasks → Combine Events → Display with Distinct Styling
```

### State Management
- `events`: Regular bookings from bookings table
- `recurringTaskEvents`: Tasks from recurring_tasks table
- Both are combined in `renderEvents()` for display

### Fetch Logic
- Fetches only for the current user (non-admin) or selected filter (admin)
- Admin viewing all → No recurring tasks shown
- Admin viewing specific member → Shows that member's recurring tasks
- Non-admin → Shows personal recurring tasks only

## Future Enhancements
- Add ability to create recurring tasks from UI
- Implement recurring task editing
- Add filtering to hide/show recurring tasks
- Export recurring tasks to calendar
- Recurring task notifications/reminders

## Testing Checklist
- [ ] Verify recurring tasks appear when logged in as "shafoli"
- [ ] Check recurring tasks display with correct colors
- [ ] Verify 📌 emoji appears on recurring tasks
- [ ] Check admin can view other members' recurring tasks
- [ ] Test day view shows recurring tasks correctly
- [ ] Verify mobile view displays recurring tasks properly
- [ ] Check event details modal for recurring tasks
- [ ] Verify delete functionality works for recurring tasks
