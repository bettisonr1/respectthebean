# Coffee Tracker — Product Document

## Purpose

Coffee Tracker is a mobile-first Progressive Web App (PWA) for home baristas using espresso machines. It helps users dial in their espresso shots over time by logging key variables, learning from the history, and recommending machine settings before each pull. An AI-powered latte art feedback feature adds a fun, visual dimension to tracking progress.

The application is built for personal use first, with a data model that supports community-driven recommendations in the future.

---

## Target User

Someone who owns a barista-style home espresso machine (e.g. Breville Barista MAX), experiments with different beans, and wants to improve the consistency and quality of their shots over time. They pull their phone out next to the machine — so the UX must be fast and frictionless.

---

## Core Concepts

### Machine
The espresso machine the user owns. Grind settings are machine-specific, so recommendations are always scoped to a machine. Multiple machines can be added.

### Bean
A bag of coffee beans. Defined by roaster, name, origin, roast level, and roast date. Users add beans as they buy new bags, either by scanning the barcode on the bag or entering details manually.

### Shot Log
A single espresso pull. Captures:
- **Before the pull:** bean selected, grind setting, dose in (grams)
- **After the pull:** yield out (grams), extraction time (seconds), taste rating (sour / balanced / bitter), optional latte art photo

The ratio (yield / dose) is calculated automatically.

---

## User Flows

### 1. Adding a Machine
User adds their espresso machine by name and model. This is typically done once at setup.

### 2. Adding Beans
User adds a new bag of beans when they buy it. They can:
- Scan the barcode on the bag (best-effort — falls back to manual entry if not found in database)
- Enter details manually: roaster, bean name, origin, roast level, roast date, tasting notes

### 3. Logging a Shot (core loop)
**Before the pull:**
1. Open app → select bean and machine
2. App displays recommended settings based on previous shots with this bean/machine combination
3. User confirms or adjusts: grind setting, dose in
4. User pulls the shot

**After the pull:**
5. User logs: yield out, extraction time, taste rating
6. Optionally uploads a photo of the latte art
7. App saves the log and updates its recommendation model

### 4. Getting a Recommendation
When a user selects a bean they have used before, the app analyses their shot history for that bean/machine combination and surfaces the settings that most consistently produced a "balanced" rating. On first use with a new bean, sensible defaults are shown based on roast level.

### 5. Latte Art Feedback
After uploading a photo, Claude's vision API analyses the image and returns structured feedback: pattern recognition, technique observations, and suggestions for improvement.

---

## Key Features

| Feature | Description |
|---|---|
| Shot logging | Frictionless two-stage flow (before / after the pull) |
| Bean management | Add via barcode scan or manual entry |
| Machine management | Multiple machines supported |
| Recommendations | AI-driven settings suggestions per bean/machine combination |
| Latte art feedback | Photo upload → Claude vision analysis |
| History & trends | Shot history with trend visualisation over time |
| Community data (future) | Recommendations pooled from users with the same machine and bean |

---

## Out of Scope (v1)

- User authentication beyond a simple user ID (auth can be added later)
- Native mobile app (PWA covers the mobile use case without App Store friction)
- Milk steaming / temperature tracking
- Social sharing of shots
- Community features (data model supports it; UI deferred)
