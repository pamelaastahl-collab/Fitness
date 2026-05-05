# FitFlow Platform — UI Style Guide
> Fitness Membership Management & Recreational Booking Platform  
> Version 1.1 | Light Mode First | Electric Blue & White | Modern SaaS

---

## 🎯 Design Personality

**One-sentence aesthetic:** Clean, energetic SaaS — welcoming like a community rec center, sharp like a premium fitness app.

**Tone:** Confident but approachable. Never cold. Never corporate. Motion is purposeful, not decorative.

**Inspiration:** Stripe meets Whoop — structured layouts with electric accents, generous whitespace, subtle depth.

---

## 🎨 Color Palette

### Core Colors
| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#2563EB` | Primary actions, links, highlights |
| `--color-primary-light` | `#EFF6FF` | Primary tints, hover backgrounds |
| `--color-primary-dark` | `#1D4ED8` | Hover/active states on primary |
| `--color-accent` | `#06B6D4` | Secondary highlights, badges, tags |
| `--color-white` | `#FFFFFF` | Page background, card surfaces |
| `--color-surface` | `#F8FAFC` | Page-level background (off-white) |
| `--color-surface-raised` | `#FFFFFF` | Cards, modals, panels |
| `--color-border` | `#E2E8F0` | Dividers, input borders, card outlines |
| `--color-border-strong` | `#CBD5E1` | Focused inputs, emphasized dividers |

### Text Colors
| Token | Hex | Usage |
|---|---|---|
| `--color-text-primary` | `#0F172A` | Headings, primary body copy |
| `--color-text-secondary` | `#475569` | Subtext, labels, captions |
| `--color-text-muted` | `#94A3B8` | Placeholders, disabled text, timestamps |
| `--color-text-inverse` | `#FFFFFF` | Text on primary/dark backgrounds |

### Semantic Colors
| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#10B981` | Confirmed bookings, active memberships |
| `--color-success-light` | `#ECFDF5` | Success backgrounds |
| `--color-warning` | `#F59E0B` | Pending, expiring soon, waitlist |
| `--color-warning-light` | `#FFFBEB` | Warning backgrounds |
| `--color-error` | `#EF4444` | Errors, cancellations, overdue |
| `--color-error-light` | `#FEF2F2` | Error backgrounds |
| `--color-info` | `#2563EB` | Informational alerts (same as primary) |

---

## 🔤 Typography

### Font Families
```css
/* Display / Headings */
font-family: 'Plus Jakarta Sans', sans-serif;
/* Import: https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap */

/* Body / UI */
font-family: 'DM Sans', sans-serif;
/* Import: https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap */

/* Monospace (stats, codes, IDs) */
font-family: 'DM Mono', monospace;
/* Import: https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap */
```

### Type Scale
| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `--text-xs` | 11px | 500 | 1.4 | Tags, micro-labels |
| `--text-sm` | 13px | 400 | 1.5 | Captions, helper text |
| `--text-base` | 15px | 400 | 1.6 | Body copy, form labels |
| `--text-md` | 17px | 500 | 1.5 | Subheadings, card titles |
| `--text-lg` | 20px | 600 | 1.4 | Section headings |
| `--text-xl` | 24px | 700 | 1.3 | Page titles |
| `--text-2xl` | 32px | 800 | 1.2 | Hero headings |
| `--text-3xl` | 40px | 800 | 1.1 | Display / landing |

---

## 📐 Spacing System

**Base unit:** 4px

| Token | Value | Common Usage |
|---|---|---|
| `--space-1` | 4px | Icon gaps, tight inline spacing |
| `--space-2` | 8px | Input padding (vertical), tag padding |
| `--space-3` | 12px | Button padding (vertical), list gaps |
| `--space-4` | 16px | Card padding (small), form field gaps |
| `--space-5` | 20px | Standard element spacing |
| `--space-6` | 24px | Card padding (standard), section gaps |
| `--space-8` | 32px | Section padding, large gaps |
| `--space-10` | 40px | Page section spacing |
| `--space-12` | 48px | Large section breaks |
| `--space-16` | 64px | Hero padding, page-level breathing room |

---

## 🔘 Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Small chips, tooltips |
| `--radius-md` | 10px | Cards, modals, dropdowns, inputs |
| `--radius-lg` | 14px | Large cards, feature panels |
| `--radius-xl` | 20px | Hero cards, image containers |
| `--radius-full` | 9999px | Pills, badges, avatar rings, **all buttons** |

> **Rule:** Buttons are always pill-shaped (`--radius-full`). Cards use `--radius-md` or `--radius-lg`.

---

## 🌑 Shadows & Elevation

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(15,23,42,0.05)` | Subtle input focus rings |
| `--shadow-sm` | `0 2px 8px rgba(15,23,42,0.07)` | Cards at rest |
| `--shadow-md` | `0 4px 16px rgba(15,23,42,0.10)` | Hovered cards, dropdowns |
| `--shadow-lg` | `0 8px 32px rgba(15,23,42,0.12)` | Modals, popovers |
| `--shadow-primary` | `0 4px 14px rgba(37,99,235,0.25)` | Primary button hover glow |

---

## 🧩 Component Patterns

### Buttons
```
Primary:   bg-primary, text-white, pill, shadow-primary on hover, scale(1.02) on hover
Secondary: bg-white, border-border, text-primary, pill, shadow-sm on hover
Ghost:     bg-transparent, text-secondary, pill, bg-primary-light on hover
Danger:    bg-error, text-white, pill
Sizes:     sm (h-8, px-4, text-sm) | md (h-10, px-5, text-base) | lg (h-12, px-6, text-md)
```

### Cards
```
Background:   --color-surface-raised (white)
Border:       1px solid --color-border
Border-radius: --radius-md (10px)
Shadow:       --shadow-sm at rest, --shadow-md on hover
Padding:      --space-6 (24px) standard
Transition:   shadow 200ms ease, transform 200ms ease
Hover:        translateY(-2px) with shadow-md
```

### Inputs & Form Fields
```
Height:       40px (md), 36px (sm)
Border:       1px solid --color-border
Border-radius: --radius-md (10px)
Background:   white
Focus:        border-primary, shadow-xs (subtle blue ring)
Label:        text-sm, font-500, color-text-secondary, mb-space-1
Helper text:  text-xs, color-text-muted
Error state:  border-error, helper text in color-error
```

### Badges & Status Pills
```
Shape:        pill (radius-full)
Padding:      2px 10px
Font:         text-xs, font-600, uppercase tracking-wide
Active:       bg-success-light, text-success
Pending:      bg-warning-light, text-warning
Cancelled:    bg-error-light, text-error
Info:         bg-primary-light, text-primary
```

### Navigation (Sidebar)
```
Width:        240px (expanded), 64px (collapsed)
Background:   white, border-right 1px solid --color-border
Nav items:    h-10, px-space-3, radius-md, text-sm font-500
Active item:  bg-primary-light, text-primary, left border accent 3px solid primary
Hover item:   bg-surface, text-text-primary
Icons:        20px, always present even in collapsed state
```

### Data Tables
```
Header:       bg-surface, text-xs font-600 uppercase tracking-wide, text-muted
Row:          bg-white, border-bottom 1px border
Row hover:    bg-primary-light (very subtle)
Cell padding: space-4 vertical, space-5 horizontal
Striping:     none (use hover instead)
```

---

## 📏 Layout Rules

| Property | Value |
|---|---|
| Max content width | 1280px |
| Page padding (horizontal) | 32px desktop, 16px mobile |
| Sidebar width | 240px |
| Main content area | calc(100% - 240px) |
| Top nav height | 60px |
| Card grid | 3-col desktop, 2-col tablet, 1-col mobile |
| Section gap | 32px |

---

## ✨ Motion & Animation

**Principle:** Motion should feel instant but smooth. Never slow. Never flashy.

| Property | Value |
|---|---|
| Default transition | `all 200ms ease` |
| Page transitions | `opacity + translateY(8px), 250ms ease` |
| Modal enter | `scale(0.97) → scale(1), 200ms ease` |
| Hover lift (cards) | `translateY(-2px), 200ms ease` |
| Button press | `scale(0.98), 100ms ease` |
| Skeleton loading | `pulse animation, 1.5s ease-in-out infinite` |

> **Rule:** No animation should exceed 350ms. Prefer `ease` over `linear`.

---

## 🏋️ Domain-Specific Patterns

### Booking Status Colors
- **Available** → `--color-success` (green)
- **Waitlisted** → `--color-warning` (amber)
- **Full / Closed** → `--color-error` (red)
- **Upcoming (yours)** → `--color-primary` (blue)
- **Completed** → `--color-text-muted` (gray)

### Membership Tier Visual Treatment
- **Basic** → gray badge, no accent
- **Standard** → blue (`--color-primary`) badge
- **Premium** → cyan (`--color-accent`) badge with subtle shimmer
- **VIP / Staff** → dark (`--color-text-primary`) badge

---

## 🖱️ Interaction Patterns & Standards

---

### 🔷 Icons

**Package:** [Lucide React](https://lucide.dev) — one package only. Never mix icon libraries.

```bash
npm install lucide-react
# Usage: import { Calendar, Users, Dumbbell } from 'lucide-react'
```

| Property | Value |
|---|---|
| Stroke width | `1.75` (default Lucide) |
| Size — inline/nav | `18px` |
| Size — buttons | `16px` |
| Size — feature/empty state | `32–48px` |
| Size — stat cards | `24px` |
| Color | Inherit from text color unless semantic |
| Pairing rule | Always pair with a label except in icon-only toolbars with tooltips |

**Common FitFlow icons:**
| Use Case | Lucide Icon |
|---|---|
| Dashboard | `LayoutDashboard` |
| Members | `Users` |
| Bookings / Schedule | `Calendar` |
| Classes / Activities | `Dumbbell` |
| Payments | `CreditCard` |
| Reports | `BarChart2` |
| Settings | `Settings` |
| Notifications | `Bell` |
| Check-in | `ScanLine` |
| Waitlist | `Clock` |
| Success | `CheckCircle` |
| Error / Warning | `AlertCircle` |
| Delete / Remove | `Trash2` |
| Edit | `Pencil` |
| Add / New | `Plus` |
| Search | `Search` |
| Filter | `SlidersHorizontal` |
| Close / Dismiss | `X` |
| Back | `ChevronLeft` |
| Expand / More | `ChevronDown` |
| External link | `ExternalLink` |

---

### 💬 Confirmation Dialogs

**Rule:** Use a modal dialog for all destructive or irreversible actions. Use an inline confirmation (e.g. button state change) only for low-stakes, easily reversible actions.

#### Destructive Dialog (e.g. cancel membership, delete record)
```
Title:      Short, specific verb phrase — "Cancel Membership?" not "Are you sure?"
Body:       One sentence explaining consequence. Name the thing being affected.
            Example: "John Smith's Premium membership will be cancelled immediately.
            This cannot be undone."
Icon:       AlertCircle in --color-error, 24px, top-left of body
Buttons:    [Cancel] [Confirm Action]  ← right-aligned, Cancel is secondary/ghost
            Confirm button: Danger style (bg-error), label matches the action verb
            Example: "Cancel Membership" / "Delete Record" / "Remove Member"
```

#### Non-Destructive Confirmation (e.g. submit booking, send notification)
```
Title:      "Confirm Booking?" / "Send Notification?"
Body:       Brief summary of what will happen.
Icon:       CheckCircle or relevant icon in --color-primary
Buttons:    [Cancel] [Confirm]  ← right-aligned
            Confirm button: Primary style
```

#### Button Label Rules for Dialogs
| Never use | Always use |
|---|---|
| OK | The action verb ("Book Class", "Delete", "Send") |
| Yes / No | Cancel / [Specific Action] |
| Confirm | Describe what's being confirmed |
| Are you sure? | "[Verb] [Object]?" (e.g. "Remove Member?") |

#### Dialog Specs
```
Width:        480px max, full-width on mobile with 16px margin
Border-radius: --radius-lg (14px)
Shadow:       --shadow-lg
Overlay:      rgba(15,23,42,0.4) backdrop, blur(2px)
Enter:        scale(0.97) to scale(1), opacity 0 to 1, 200ms ease
Exit:         scale(1) to scale(0.97), opacity 1 to 0, 150ms ease
Header:       padding space-6, border-bottom 1px border
Footer:       padding space-4 space-6, border-top 1px border, flex justify-end gap-space-2
```

---

### 🔔 Notifications & Feedback

#### Toast Notifications
Use for: non-blocking feedback after an action (saved, booked, sent, error).
Never use for: actions requiring user response (use a dialog instead).

```
Position:     Top-right, 16px from edge
Width:        320px
Stack order:  Newest on top, max 3 visible
Auto-dismiss: Success/Info 4s | Warning 6s | Error stays until dismissed
Border-radius: --radius-md
Shadow:       --shadow-lg
```

| Type | Icon | Left border color | Background |
|---|---|---|---|
| Success | `CheckCircle` | `--color-success` | white |
| Error | `AlertCircle` | `--color-error` | white |
| Warning | `AlertTriangle` | `--color-warning` | white |
| Info | `Info` | `--color-primary` | white |

#### Inline Errors (Forms)
```
Trigger:    On blur (when user leaves field) + on submit attempt
Placement:  Below the input field, not in a toast
Format:     text-xs, color-error, with AlertCircle icon 12px inline
Message:    Specific and actionable — "Enter a valid email" not "Invalid input"
```

#### Empty States
```
Icon:       Relevant Lucide icon, 40px, color-text-muted
Heading:    text-md, font-600, color-text-primary — "No classes scheduled"
Body:       text-sm, color-text-secondary, max-width 280px, centered
            Explain why it's empty and what to do next
Action:     Optional primary button below — "Schedule a Class", "Add Member"
Layout:     Centered vertically and horizontally in the container
Padding:    space-16 top and bottom minimum
```

#### Loading States
```
Skeleton:   Use for content that takes >300ms to load
            Match the shape/size of the content being loaded
            Animate: shimmer (left-to-right gradient sweep, 1.5s infinite)
            Color: --color-border to --color-surface (light pulse)
Spinner:    Use only for actions (button submit, page transition)
            Size: 16px inline in button | 32px full-page
            Color: currentColor (inherits from context)
Full-page:  Centered spinner + "Loading..." text-sm text-muted
            Only when entire page content is loading
```

---

### 📋 Form Behavior Standards

#### Validation Timing
```
On blur:    Validate individual fields when user leaves them
On submit:  Re-validate all fields, scroll to first error
On change:  Only clear errors as user fixes them (never show new errors on keypress)
```

#### Required Fields
```
Mark:       Asterisk (*) after label in color-error — "Full Name *"
Never:      Show "(required)" in helper text — use * only
Optional:   Add "(optional)" in text-muted after label when most fields are required
```

#### Form Layout
```
Single column: Always for modals and side panels
Two column:    Allowed on full-page forms for related pairs (First / Last name, Start / End date)
Field gap:     space-5 (20px) between fields
Section gap:   space-8 (32px) between field groups, with a subtle divider or group label
Submit button: Full width in modals | Right-aligned on full-page forms
```

---

### 🧭 Navigation & Flow Standards

#### After a Successful Action
| Action Type | What Happens Next |
|---|---|
| Create new record | Redirect to the new record's detail page |
| Edit / Save record | Stay on page, show success toast |
| Delete record | Redirect to list page, show success toast |
| Book a class | Show confirmation modal, then redirect to "My Bookings" |
| Send a message / email | Stay on page, show success toast |
| Complete a multi-step form | Redirect to summary/confirmation page |

#### Page Titles & Breadcrumbs
```
Page title:   Always present, text-xl font-700, top of main content area
Breadcrumb:   Show when 3+ levels deep — "Members / John Smith / Edit"
              text-sm, color-text-muted, with ChevronRight separator (12px)
              Last item: color-text-primary, not a link
```

#### Modals vs. Full Pages
```
Use a modal for:   Quick edits, confirmations, single-field updates,
                   viewing details without losing list context
Use a full page for: Multi-step flows, complex forms (5+ fields),
                     new record creation, detailed record editing
Rule:              Never nest modals. Never open a modal from a modal.
```

---

### 🗒️ Microcopy Standards

#### Button & Action Labels
```
Format:     Verb + Object — "Book Class", "Add Member", "Export Report"
Never:      Noun-only labels — "Booking", "Member", "Report"
Never:      Vague labels — "Submit", "OK", "Done" (unless truly context-free)
Casing:     Title Case for buttons | Sentence case for body text and labels
```

#### Date & Time Formatting
| Context | Format | Example |
|---|---|---|
| Full date | MMM D, YYYY | Jan 14, 2026 |
| Date + time | MMM D, YYYY · h:mm A | Jan 14, 2026 · 9:00 AM |
| Relative (within 7 days) | Weekday + time | Tuesday · 9:00 AM |
| Time only | h:mm A | 9:00 AM |
| Duration | Xh Ym | 1h 30m |
| Date range | MMM D – D, YYYY | Jan 14–21, 2026 |

#### Names & People
```
In lists/tables:  Full name — "Jane Smith"
In greetings:     First name only — "Welcome back, Jane"
In confirmations: Full name — "Jane Smith's membership will be cancelled"
Avatars:          Initials if no photo — first + last initial, e.g. "JS"
```

#### Error Messages
```
Format:   Specific, human, actionable. Never blame the user.
Bad:      "Invalid input" / "An error occurred" / "Error 422"
Good:     "This email is already linked to an account"
Good:     "The class is now full — you've been added to the waitlist"
Good:     "Session expired. Please sign in again to continue"
```

---

## 🗣️ How to Use This Guide with Claude

Paste the following at the top of every new module session:

```
Use the FitFlow Style Guide below. Match all colors, fonts, spacing, 
border-radius, shadow, and component patterns exactly as specified. 
Do not introduce new colors or fonts.

[paste this document]
```

For component requests, add:
```
Build this using the exact button, card, input, and badge patterns 
defined in the style guide.
```

---

*FitFlow Style Guide v1.1 — Update this doc whenever a new canonical component or interaction pattern is approved.*
