# MachineMate - Quick Start Guide

## Get Running in 3 Steps

### 1. Navigate to the project
```bash
cd MachineMate
```

### 2. Install dependencies (if needed)
```bash
npm install
```

### 3. Start the app
```bash
npx expo start
```

Then press:
- `i` for iOS Simulator (Mac only)
- `a` for Android Emulator
- Scan QR code for physical device (with Expo Go app)

## What You Can Do

### Test the Camera Flow
1. Tap "Identify a Machine" on Home screen
2. Grant camera permission
3. Take a photo
4. See machine guidance with alternatives

### Browse the Library
1. Go to Library tab
2. Search or filter machines
3. Tap any machine for full details

### Use Favorites & History
1. Star machines to favorite them
2. Recent machines appear on Home
3. Favorites persist after closing the app

## All MVP Features Are Working

✅ 6 screens fully implemented
✅ 5 seed machines with realistic content
✅ Camera identification flow (stub logic)
✅ Search & filter in Library
✅ Favorites & recent history (persisted)
✅ Offline-first architecture
✅ TypeScript + React Native Paper UI
✅ Type-safe navigation

## Next Steps

1. **Add Images** (optional):
   - See `assets/muscle-diagrams/README.md`
   - See `assets/test-photos/README.md`

2. **Customize**:
   - Add more machines to `src/data/machines.json`
   - Change theme colors in `App.tsx`

3. **Future Enhancement**:
   - Replace stub in `src/logic/identifyMachine.ts` with real ML

Enjoy building with MachineMate! 🏋️
