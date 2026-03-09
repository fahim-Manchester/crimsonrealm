# The Codex -- Help / Knowledge Base System

## Overview

Add a new protected route `/codex` with a dedicated page containing help articles about Crimson Realm. Uses collapsible accordion sections with gothic-themed styling. Accessible from the Home page dashboard grid.

## Files to Create


| File                  | Purpose                                |
| --------------------- | -------------------------------------- |
| `src/pages/Codex.tsx` | Main Codex page with all help articles |


## Files to Modify


| File                 | Change                                     |
| -------------------- | ------------------------------------------ |
| `src/App.tsx`        | Add `/codex` route (protected)             |
| `src/pages/Home.tsx` | Add "The Codex" card to the dashboard grid |


## Implementation

### 1. `src/pages/Codex.tsx`

Uses `PageLayout` wrapper with title "The Codex" and subtitle "A tome of knowledge for the weary traveler."

Content is an array of article objects, each with a title, icon, and body sections. Rendered as `Accordion` components (from existing `@radix-ui/react-accordion`). Each article is an `AccordionItem` with styled trigger and rich content inside.

**Articles:**

1. **Getting Started** -- Overview of the app, first steps after signup, navigating the Sanctum
2. **What is a Campaign** -- Explains campaign mode, sessions, quest items, time tracking within campaigns
3. **What are Chronicles** -- Resources system, how to add/organize links and notes
4. **How XP Works** -- XP earning mechanics, achievements, the Cleave system
5. **How to Track Time** -- Session clock, task timers, campaign totals, pausing/resuming
6. **Tips for Daily Use** -- Best practices, keyboard shortcuts, PWA install benefits, workflow suggestions

Each article body uses styled paragraphs, bullet lists (`ul > li`), and occasional bold highlights -- all with `font-crimson` for readability.

### 2. `src/App.tsx`

Add import for `Codex` and a new protected route:

```
<Route path="/codex" element={<RequireAuth><Codex /></RequireAuth>} />
```

### 3. `src/pages/Home.tsx`

Add a 7th card to the dashboard grid linking to `/codex` with a book/scroll icon and description: "Ancient knowledge to guide your path through the Realm."

---

## Layout

```text
PageLayout ("The Codex")
  └─ max-w-3xl centered container
       └─ Accordion (type="multiple")
            ├─ AccordionItem: Getting Started
            │    └─ AccordionContent: paragraphs + lists
            ├─ AccordionItem: What is a Campaign
            ├─ AccordionItem: What are Chronicles
            ├─ AccordionItem: How XP Works
            ├─ AccordionItem: How to Track Time
            └─ AccordionItem: Tips for Daily Use
```

Each accordion trigger has a lucide icon + title in `font-cinzel`. Content uses `font-crimson` with `text-muted-foreground` for readability.  
  


Again you should be able to access the condex from the sanctum basically, from the page where you see the options for territories, campaigns, resources and etc. There should be a button called Coden, which has all the information about everything not just the stuff listed, but everything a user needs to know aobut each section of the app and how it works.