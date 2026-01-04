# Firebase Integration Guide

## ✅ Fixes Applied

1. **Better Error Handling**: All Firebase operations now have try-catch blocks
2. **Improved Logging**: Console logs show ✓ (success), ✗ (error), ℹ (info) symbols
3. **Connection Monitor**: Firebase status is checked after DOM loads
4. **Data Validation**: Numbers are properly formatted before saving

## 🔍 How to Verify Firebase is Working

### 1. Check Browser Console (F12)
After opening the app, press F12 and look for these messages:
- `Firebase initialized successfully`
- `Firebase: Connected ✓`
- `✓ Data saved to Firebase`
- `✓ Loaded recent telemetry from Firebase: X records`

### 2. Check the UI
- Look at the top header for **"● Cloud"** badge
- **Green dot** 🟢 = Connected
- **Red dot** 🔴 = Disconnected

### 3. Check Firebase Console
1. Go to: https://console.firebase.google.com/project/fault-detection-66259/database
2. Click **"Realtime Database"** in left sidebar
3. Click **"Data"** tab
4. You should see:
   ```
   /telemetry/
     ├─ 1704445200000/
     │   ├─ temperature: 25.3
     │   ├─ humidity: 10.5
     │   ├─ voltage: 12.0
     │   ├─ health: 100
     │   └─ missionTime: "00:01:23"
   /faults/
     ├─ 1704445300000/
         ├─ message: "WARNING: High Temp | T:65.2°C..."
         ├─ type: "warning"
         └─ ...
   ```

## 🛠️ Firebase Database Rules

Make sure your Firebase Realtime Database has these rules set:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**⚠️ Note**: These are development rules. For production, use proper authentication.

## 📊 What Gets Saved

### Telemetry Data (every 2 seconds)
- Temperature (°C)
- Humidity (%)
- Voltage (V)
- Health Score (0-100)
- Mission Time

### Fault Logs (when errors occur)
- Fault message
- Severity type (critical/warning/success)
- Telemetry context (T, H, V values)
- Timestamp

## 🚨 Troubleshooting

### If you see "Firebase not initialized"
- Check that the Firebase SDK scripts are loading in index.html
- Open browser console and refresh the page

### If Cloud indicator stays red
1. Check your internet connection
2. Verify Firebase project is active
3. Check Database Rules allow read/write
4. Look for errors in browser console (F12)

### If data isn't appearing in Firebase Console
1. Wait 2-3 seconds after logging in (data saves every 2 seconds)
2. Refresh the Firebase Console page
3. Check browser console for "✓ Data saved to Firebase" messages
4. Verify you're looking at the correct project/database

## 📝 Database Structure

```
fault-detection-66259/
├─ telemetry/
│   └─ [timestamp_in_ms]/
│       ├─ timestamp: ISO string
│       ├─ temperature: number
│       ├─ humidity: number
│       ├─ voltage: number
│       ├─ health: number
│       └─ missionTime: string
│
└─ faults/
    └─ [timestamp_in_ms]/
        ├─ timestamp: ISO string
        ├─ message: string
        ├─ type: "critical" | "warning" | "success"
        ├─ temperature: number
        ├─ humidity: number
        └─ voltage: number
```

## 🔄 Live Updates

The app automatically:
- Saves telemetry data every 2 seconds
- Saves fault logs when they occur
- Monitors connection status in real-time
- Loads last 10 records on page load

## ✨ Success Indicators

You'll know Firebase is working when:
1. ✅ Green "Cloud" indicator in header
2. ✅ Console shows "✓ Data saved to Firebase" messages
3. ✅ Data appears in Firebase Console within seconds
4. ✅ No red error messages in console
