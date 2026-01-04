# 📍 Button Location Guide

## Where to Find the Firebase Sync Buttons

The buttons are located on the **LEFT SIDE** of the dashboard, inside the **Control Panel** card.

### Visual Layout:

```
┌─────────────────────────────────────┐
│     CONTROL PANEL (Left Column)    │
├─────────────────────────────────────┤
│  Fault Injection                    │
│  ┌──────────┐ ┌──────────┐         │
│  │Solar Flare│ │Power Drain│        │
│  └──────────┘ └──────────┘         │
│  ┌──────────┐                       │
│  │Sensor Flt│                       │
│  └──────────┘                       │
├─────────────────────────────────────┤
│  System Controls                    │
│  ┌──────────┐ ┌──────────┐         │
│  │Reset Sys │ │Download  │         │
│  └──────────┘ └──────────┘         │
├─────────────────────────────────────┤
│  Firebase Debug                     │
│  ┌──────────┐ ┌──────────┐         │
│  │🧪 Test   │ │🔍 Check  │         │
│  └──────────┘ └──────────┘         │
│  ┌─────────────────────────────┐   │
│  │ 🔄 Sync from Firebase       │   │ ← CLICK THIS!
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 📤 Push Current to Firebase │   │ ← OR THIS!
│  └─────────────────────────────┘   │
│                                     │
│  [Firebase Debug Panel]             │
│  [Live Firebase Data Viewer]        │
└─────────────────────────────────────┘
```

## What Each Button Does:

### 🔄 Sync from Firebase
- **Purpose**: Pull the latest values from Firebase `/test/` node
- **Action**: Updates the telemetry cards with Firebase values
- **Shows**: Alert with Temperature, Humidity, and Voltage from Firebase

### 📤 Push Current to Firebase
- **Purpose**: Push the current simulated values to Firebase
- **Action**: Writes current dashboard values to `/test/` node
- **Shows**: Alert confirming data was pushed

### 🧪 Test Firebase
- **Purpose**: Test Firebase connection with test values
- **Action**: Writes 99.99/88.88/77.77 test data

### 🔍 Check Data
- **Purpose**: Inspect what's in Firebase database
- **Action**: Shows last 5 entries from `/telemetry/` node

## Steps to See Real Firebase Values:

1. **Login** to the dashboard
2. **Scroll down** in the left panel to "Firebase Debug"
3. **Click** the blue button that says "🔄 Sync from Firebase"
4. You'll see an alert showing the Firebase values
5. The telemetry cards will update with those values!

## Troubleshooting:

If you don't see the buttons:
1. **Hard refresh**: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
2. **Wait 2-3 minutes** for GitHub Pages to deploy
3. **Clear browser cache**
4. **Check console** (F12) for any errors

## Current Firebase Values:
Based on your screenshot, the `/test/` node contains:
- Temperature: 26°C
- Humidity: 66%
- Voltage: 1.49V

Click "🔄 Sync from Firebase" to load these values onto your dashboard!
