# 📍 Campus Guide

**Campus Guide** is a **React Native mobile application** built to help students, staff, and visitors navigate Concordia University's **SGW** and **Loyola** campuses.  
It features interactive maps, GPS tracking, shuttle schedules, and turn-by-turn navigation which are all designed for a seamless campus experience.

---

## ✨ Features

- 🗺️ **Interactive Campus Maps** — View buildings across both campuses with Google Maps integration and OpenStreetMap polygons
- 🔍 **Building Search** — Find buildings instantly by name or code
- 📍 **Real-Time GPS Tracking** — Detect your current position and nearest building using haversine distance
- 🧭 **Directions** — Get routes between buildings for walking, driving, transit, and shuttle
- 🚌 **Shuttle Schedules** — View inter-campus shuttle times for weekdays
- 🏫 **Building Info** — Tap a building for code, name, address, and campus details
- 🔄 **Dual Campus Support** — Toggle between SGW and Loyola maps

---

## 🧰 Tech Stack

| Category | Technology |
|-----------|-------------|
| **Framework** | Expo SDK 54 |
| **Language** | TypeScript (strict mode) |
| **Mobile Runtime** | React Native 0.81.5 |
| **UI Library** | React 19.1 |
| **Testing** | Jest + React Testing Library |
| **CI/CD** | GitHub Actions + Codecov |

---

## ⚙️ Prerequisites

Before starting, ensure the following are installed:

- [Node.js 22](https://nodejs.org/)
- npm (included with Node.js)
- [Expo Go app](https://expo.dev/client) on your device
- (Optional) Android Studio or Xcode for emulators

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Only-Raw-Data/soen390-only-raw-data.git
cd soen390-only-raw-data/campus-guide
```

### 2. Install dependencies

```bash
npm run build
```

### 3. Set environment variables

```bash
cp .env.example .env
```

Then fill in your API keys (see `.env.example` for reference).

### 4. Start the app

```bash
npm start
```

Scan the QR code with **Expo Go** (Android) or your **Camera app** (iOS) to launch the app.

---

## 💾 Environment Variables

| Variable | Description |
|-----------|-------------|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key used for rendering maps, markers, and directions |
| `EXPO_PUBLIC_OVERPASS_URL` | Overpass API endpoint for querying OpenStreetMap building data |

---

# End-to-End Testing with Maestro

## Prerequisites
- **Android Studio** (for emulator) - [Download](https://developer.android.com/studio)
- **Android SDK** (installed via Android Studio)
- **Java JDK 11+**
- **ANDROID_HOME environment variable set**
- **Node.js 18+** and npm
- **Maestro** - [Installation Guide](https://docs.maestro.dev/getting-started/installing-maestro)

## Running Tests

### 1. Double check your dependencies

```bash
npm run build
```

### 2. Launch your Android emulator

### 3. Launch app (Android)

```bash
npm run android
```

### 3. In another terminal, run tests (e.g.: User Story 1.5)

```bash
maestro test campus-guide/.maestro/US-1.5-test.yml
```
