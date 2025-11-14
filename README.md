# MachineMate - Mobile Gym Machine Guide

A React Native + Expo mobile app that helps gym beginners learn how to use gym machines safely and correctly.

## Features

- 📸 **Camera Identification**: Take or upload a photo of a machine to get instant guidance via the backend `/identify` API
- 📚 **Machine Library**: Browse and search 5 seed machines with detailed instructions
- ⭐ **Favorites**: Mark machines as favorites for quick access
- 🕒 **Recent History**: View your last 5 viewed machines
- 💡 **Comprehensive Guides**: Each machine includes:
  - Setup steps
  - How-to instructions
  - Common mistakes
  - Safety tips
  - Beginner tips
- 📱 **Offline-First**: All features work without internet connection

## Tech Stack

### Mobile (React Native + Expo)
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and managed workflow
- **TypeScript** - Type safety and better DX
- **React Navigation** - Bottom tabs + stack navigation
- **React Native Paper** - Material Design UI components
- **AsyncStorage** - Local data persistence (migrating to Supabase)
- **expo-camera** - Camera functionality
- **expo-image-picker** - Importing photos from the device library

### Backend (FastAPI + Supabase)
- **FastAPI** - Modern Python web framework
- **Supabase** - Postgres database, authentication, and storage
- **SQLAlchemy** - Async ORM for database access
- **Fireworks AI** - Vision-Language Model for machine identification
- **Cloud Run** - Serverless container deployment (planned)

### Infrastructure
- **Terraform** - Infrastructure as Code
- **GitHub Actions** - CI/CD automation
- **Sentry** - Error tracking and performance monitoring
- **GCP** - Cloud platform (Cloud Run, Artifact Registry, Secret Manager)

## Architecture Overview

### End-to-End Flow

```
[Expo App] --REST--> [FastAPI @ Cloud Run] --SQL--> [Supabase Postgres]
     |                                   \--Storage--> [Supabase Buckets]
     |                                          \--AI--> [Fireworks / VLM]
     \--(Phase 3) supabase-js--> [Supabase Auth]
```

- The **Expo/React Native app** calls the FastAPI backend for machine identification and (soon) authenticated data (favorites/history/machines).
- FastAPI runs on **Cloud Run**, stores data in **Supabase Postgres**, pulls tutorial assets from Supabase Storage, and proxies calls to Fireworks AI.
- Once Phase 3 lands, the app will also use `@supabase/supabase-js` directly for user auth, then send Supabase JWTs to the backend for secure API calls.

### Infrastructure Stack

```
┌────────────────────────────┐
│ GitHub Actions             │
│  - Lint/type/test (mobile) │
│  - Backend pytest          │
│  - Supabase migration dry  │
│  - Docker build            │
│  - Health checks cron      │
└────────────┬───────────────┘
             │ artifacts / alerts
             ▼
┌────────────────────────────┐
│ Google Cloud Platform      │
│  - Artifact Registry       │
│  - Cloud Run (FastAPI)     │
│  - Secret Manager          │
│  - Cloud Logging/Monitor   │
└────────────┬───────────────┘
             │ HTTPS
             ▼
┌────────────────────────────┐
│ Supabase Cloud             │
│  - Postgres + RLS          │
│  - Auth (JWT)              │
│  - Storage buckets         │
└────────────┬───────────────┘
             │
      (REST/Webhooks)
             │
┌────────────────────────────┐
│ Clients / Automation       │
│  - Expo mobile users       │
│  - Healthcheck workflow    │
└────────────────────────────┘
```

Terraform under `terraform/` provisions the GCP side (Cloud Run, Artifact Registry, Secret Manager bindings). Supabase migrations under `supabase/migrations/` keep the schema in sync, and GitHub Actions enforce both pipelines plus the scheduled health probes.

## Project Structure

```
MachineMate/
├── App.tsx                 # Main app with context & theme
├── src/
│   ├── app/                # Global app wiring (navigation, providers)
│   │   ├── navigation/
│   │   │   ├── HomeStack.tsx
│   │   │   ├── LibraryStack.tsx
│   │   │   └── RootNavigator.tsx
│   │   └── providers/
│   │       └── MachinesProvider.tsx
│   ├── data/               # Static datasets
│   │   └── machines.json
│   ├── features/           # Feature-oriented modules
│   │   ├── home/
│   │   │   └── screens/HomeScreen.tsx
│   │   ├── identification/
│   │   │   ├── components/MachinePickerModal.tsx
│   │   │   └── screens/
│   │   │       ├── CameraScreen.tsx
│   │   │       └── MachineResultScreen.tsx
│   │   ├── library/
│   │   │   └── screens/
│   │   │       ├── LibraryScreen.tsx
│   │   │       └── MachineDetailScreen.tsx
│   │   └── settings/
│   │       └── screens/SettingsScreen.tsx
│   ├── services/           # Cross-cutting business logic
│   │   ├── recognition/identifyMachine.ts
│   │   └── storage/
│   │       ├── favoritesStorage.ts
│   │       └── historyStorage.ts
│   ├── shared/             # Shared UI primitives
│   │   └── components/
│   │       ├── MachineListItem.tsx
│   │       ├── PrimaryButton.tsx
│   │       └── SectionHeader.tsx
│   └── types/              # TypeScript contracts
│       ├── env.d.ts
│       ├── history.ts
│       ├── machine.ts
│       └── navigation.ts
└── assets/
    ├── muscle-diagrams/   # Muscle diagram images (see README)
    └── test-photos/       # Test machine photos (see README)
```

## Getting Started

### Prerequisites

**Mobile Development:**
- Node.js 18+ and npm
- iOS Simulator (Mac only) or Android Emulator
- Expo Go app (for testing on physical devices)

**Backend Development:**
- Python 3.11+
- Supabase account (free tier works for development)
- [Optional] Fireworks AI account for machine identification

**Full-Stack Development:**
- All of the above
- [Optional] GCP account for Cloud Run deployment
- [Optional] Terraform for infrastructure management

**Quick Start Guide:**
1. For **mobile-only development**: Follow "Installation" section below
2. For **full-stack development**: Follow "Installation" + "Backend Setup" sections
3. For **infrastructure/deployment**: See [docs/infrastructure/overview.md](./docs/infrastructure/overview.md) and [docs/infrastructure/secrets.md](./docs/infrastructure/secrets.md)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Sync Expo native modules (run after pulling dependencies updates):**
   ```bash
   npx expo install expo-image-picker expo-image-manipulator expo-file-system
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on your device:**
   - **iOS Simulator** (Mac only): Press `i`
   - **Android Emulator**: Press `a`
   - **Physical Device**: Scan the QR code with Expo Go app

### Backend Setup (Optional but Recommended)

The mobile app can connect to a FastAPI backend for machine identification and will soon support Supabase for authentication, favorites sync, and cloud storage.

#### 1. Configure Environment Variables

```bash
# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env
```

Edit `.env` and `backend/.env` with your actual values:
- **Supabase credentials**: Get from [app.supabase.com](https://app.supabase.com) → Your Project → Settings → API
- **Database URL**: Get from Supabase → Settings → Database → Connection string
- **Fireworks AI key** (optional): Get from [fireworks.ai](https://fireworks.ai) for ML-powered identification

See [docs/infrastructure/secrets.md](./docs/infrastructure/secrets.md) for detailed instructions on getting all credentials.

#### 2. Set Up Supabase (Required for Phase 1+)

1. **Create a Supabase project**:
   - Visit [app.supabase.com](https://app.supabase.com) and create a new project
   - Note your Project URL and API keys

2. **Run database migrations**:
   ```sql
   -- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
   -- See docs/infrastructure/supabase.md for the full schema

   create table if not exists favorites (
     user_id uuid not null,
     machine_id text not null,
     created_at timestamptz not null default now(),
     primary key(user_id, machine_id)
   );

   create table if not exists history (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null,
     machine_id text not null,
     confidence numeric,
     taken_at timestamptz not null default now()
   );

   -- Enable Row Level Security
   alter table favorites enable row level security;
   alter table history enable row level security;

   -- Add RLS policies (users can only access their own data)
   create policy "favorites_owner" on favorites
     for all using (auth.uid() = user_id);

   create policy "history_owner" on history
     for all using (auth.uid() = user_id);
   ```

#### 3. Install Backend Dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

#### 4. Test Database Connection

```bash
# Verify backend can connect to Supabase
python scripts/test_connection.py
```

If successful, you should see ✅ confirmation messages.

#### 5. Start the Backend Server

```bash
# From backend/ directory with activated venv
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or from project root:
```bash
uvicorn backend.app.main:app --reload
```

The server will be available at `http://localhost:8000`
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

#### 6. Connect Mobile App to Backend

```bash
# In your .env file, set:
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000

# Then start the Expo app
npx expo start
```

**Note**: On physical devices, replace `localhost` with your computer's local IP address (e.g., `http://192.168.1.100:8000`).

#### Troubleshooting

- **"DATABASE_URL is not set"**: Check that `backend/.env` exists and contains valid Supabase credentials
- **Connection failed**: Verify Supabase project is active and network allows connections
- **"Module not found"**: Ensure virtual environment is activated and dependencies are installed
- **Import errors**: Run `pip install -r backend/requirements.txt` again

See [backend/README.md](./backend/README.md) for more backend-specific documentation.

## Running the App

### On iOS Simulator (Mac)
```bash
npx expo start
# Press 'i' to open iOS simulator
```

### On Android Emulator
```bash
npx expo start
# Press 'a' to open Android emulator
```

### On Physical Device
1. Install Expo Go from App Store or Play Store
2. Run `npx expo start`
3. Scan the QR code with your camera (iOS) or Expo Go app (Android)

## Seed Data

The app includes 6 pre-loaded machines:

1. **Leg Press** (Lower Body, Beginner)
2. **Lat Pulldown** (Back, Beginner)
3. **Chest Press** (Chest, Beginner)
4. **Seated Row** (Back, Beginner)
5. **Shoulder Press** (Shoulders, Intermediate)
6. **Treadmill** (Cardio, Beginner)

Each machine has complete, realistic guidance including setup steps, how-to instructions, common mistakes, safety tips, and beginner tips.

## Key Features Explained

### 1. Machine Identification Service

All recognition logic lives in `src/services/recognition/identifyMachine.ts`. The client:
- Uploads the captured photo to the backend `/identify` endpoint whenever `EXPO_PUBLIC_API_BASE_URL` is set. A `{ machine, confidence }` response ≥0.7 auto-navigates to the guide; lower confidence opens the manual picker with candidates tagged as `source: 'backend_api'`.
- Falls back to a deterministic catalog suggestion (hash-based so QA is repeatable) when the API is unavailable or returns an error. This keeps the flow usable offline while making it clear that results are low-confidence (`source: 'fallback'`).

### 2. Local-First Catalog

- Machine definitions, guides, and UI chrome ship in-app.
- AsyncStorage backs favorites and recent history.
- Recognition is the only network dependency; the rest of the UX works offline.

### 3. Type-Safe Navigation

All navigation uses TypeScript for compile-time safety:

```typescript
navigation.navigate('MachineResult', {
  photoUri,
  result: {
    kind: 'catalog',
    machineId,
    candidates: [machineId],
    confidence: null,
    lowConfidence: false,
    source: 'manual',
  },
});
```

## Testing the App

### Test Camera Flow

1. From Home screen, tap "Identify a Machine"
2. Grant camera permission when prompted
3. Take a photo of anything (low-confidence or unrecognized images will open the manual picker)
4. View the machine guide with all details

### Test Library

1. Navigate to Library tab
2. Search for machines or filter by category
3. Tap any machine to view full details

### Test Favorites & History

1. Mark a few machines as favorites (star icon)
2. View machines from Library or Camera flow
3. Return to Home to see recent history
4. Close and reopen app - favorites persist!

## Adding Assets (Optional)

### Muscle Diagrams

See `assets/muscle-diagrams/README.md` for instructions on adding muscle diagram images. The app works without them but shows a placeholder.

### Test Photos

See `assets/test-photos/README.md` for instructions on adding sample machine photos for testing.

## Acceptance Criteria ✅

All MVP acceptance criteria are met:

- ✅ Camera → Capture → Identification → Guidance flow works
- ✅ Library browsing with search and filters
- ✅ Recent machines displayed on Home screen
- ✅ Favorites persist across app restarts
- ✅ Catalog, favorites, and history work offline (recognition requires connectivity)

## Future Enhancements

The codebase is architected to support these future features:

- 🤖 **On-device / custom ML** - Extend `src/services/recognition/identifyMachine.ts` with additional models
- 🖼️ **Muscle diagrams** - Add images to visualize muscles worked
- 📹 **Video demonstrations** - Add video guides for each machine
- 🏋️ **Workout tracking** - Log sets, reps, and weight
- 👤 **User profiles** - Save personal records and preferences
- ☁️ **Cloud sync** - Sync data across devices
- 🌍 **Multi-language** - Internationalization support

## Troubleshooting

### Camera not working on iOS Simulator

Physical camera doesn't work in iOS Simulator. Use a physical device or test with saved photos.

### TypeScript errors

```bash
npx tsc --noEmit
```

Should show no errors. If you see errors, ensure all dependencies are installed.

### App won't start

1. Clear cache: `npx expo start -c`
2. Delete node_modules: `rm -rf node_modules && npm install`
3. Reset Metro bundler: `npx expo start --reset-cache`

## Development Notes

### Architecture Decisions

1. **Context for State**: Machine data shared via React Context (simple and sufficient for read-only catalog)
2. **AsyncStorage**: Lightweight and perfect for favorites/history (no complex state management needed)
3. **Pluggable Identification**: Recognition lives in one service with a stable interface, making it easy to swap Hugging Face for another provider or local model later.
4. **No Backend**: Keeps MVP simple and focuses on mobile UX

### Code Quality

- ✅ TypeScript strict mode
- ✅ Component-based architecture
- ✅ Separation of concerns (UI, logic, data, types)
- ✅ Comprehensive comments
- ✅ Type-safe navigation

## License

This is a sample MVP project for demonstration purposes.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Ensure all dependencies are installed
3. Try clearing cache and restarting

---

**Built with ❤️ using React Native + Expo + TypeScript**
