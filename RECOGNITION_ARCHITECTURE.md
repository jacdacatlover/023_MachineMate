# Machine Recognition Architecture

## Overview
MachineMate uses **machines.json as the single source of truth** for all machine data and recognition configuration. This unified approach ensures that the library, UI, and recognition systems always stay in sync.

## Architecture Decision

We implemented **Option 1: Extended machines.json** based on industry best practices used by popular fitness apps (JEFIT, Strong, Fitbod).

## Structure

### Type Definitions
All recognition types are defined in `src/types/machine.ts`:

```typescript
export interface MachineRecognition {
  visualPrompts: string[];    // SigLIP-specific descriptions
  labelId?: string;            // Mapping to gymMachineLabels
  synonyms?: string[];         // Alternative names
  keywords?: string[];         // Key visual features
}

export interface MachineDefinition {
  // ... existing fields ...
  recognition?: MachineRecognition;
}
```

### Data Coverage
All **15 machines** in the library now have complete recognition data:

| Machine ID | Label ID | Visual Prompts | Synonyms | Keywords |
|------------|----------|----------------|----------|----------|
| leg_press | leg_press_sled | 3 | 3 | 3 |
| lat_pulldown | lat_pulldown_station | 4 | 3 | 4 |
| chest_press | chest_press_machine | 3 | 3 | 3 |
| seated_row | seated_row_machine | 3 | 3 | 3 |
| shoulder_press | shoulder_press_machine | 3 | 3 | 3 |
| treadmill | treadmill_cardio | 3 | 3 | 3 |
| rowing_machine | rowing_erg_machine | 3 | 3 | 3 |
| elliptical_machine | elliptical_trainer | 3 | 3 | 3 |
| exercise_bike | exercise_bike | 3 | 4 | 4 |
| stair_climber | stair_climber | 3 | 4 | 4 |
| smith_machine_squat | smith_machine | 3 | 3 | 4 |
| cable_crossover | cable_crossover | 3 | 3 | 3 |
| preacher_curl_machine | preacher_curl | 3 | 3 | 4 |
| tricep_extension_machine | tricep_extension | 3 | 3 | 4 |
| leg_extension_machine | leg_extension | 3 | 3 | 4 |

## Tools & Scripts

### Label Generator
`scripts/generateLabels.ts` - Auto-generates `gymMachineLabels.ts` from `machines.json`

**Usage:**
```bash
npm run generate-labels
```

This ensures labels always stay in sync with the machine library.

### Validation
`src/data/validateMachines.ts` - Validates machine data completeness

Functions:
- `validateMachineData()` - Check all required fields
- `logValidationResults()` - Log validation status
- `assertValidMachines()` - Throw error if invalid (for dev mode)

## Recognition Flow

1. **User takes photo** → CameraScreen
2. **Frontend sends to backend** → identifyMachine.ts
3. **Backend API identifies machine** using VLM
4. **Returns machine name** (e.g., "Seated Leg Press")
5. **Frontend matches to machines.json** using name lookup
6. **Display result** with full machine details

## Current Implementation

The frontend `identifyMachine.ts` has been simplified to:
- **Primary**: Backend API identification
- **Fallback**: Random selection (deterministic)

The recognition data in `machines.json` is primarily used by:
- Backend API for machine identification
- Documentation and reference
- Future client-side recognition (if re-enabled)

## Benefits

✅ **Single Source of Truth** - All machine data in one place
✅ **No Drift** - Library and recognition always aligned
✅ **Type Safe** - TypeScript validates structure
✅ **Easy to Maintain** - Add new machines by updating one file
✅ **Auto-Generation** - Labels generated from machines.json
✅ **Validation** - Build-time checks catch errors early

## Adding New Machines

To add a new machine:

1. Add entry to `src/data/machines.json`:
```json
{
  "id": "new_machine",
  "name": "New Machine Name",
  "category": "Category",
  "primaryMuscles": [...],
  // ... other fields ...
  "recognition": {
    "visualPrompts": [
      "detailed description of machine appearance",
      "unique visual features",
      "context in gym environment"
    ],
    "labelId": "new_machine_label",
    "synonyms": ["alternative name 1", "alternative name 2"],
    "keywords": ["key", "visual", "features"]
  }
}
```

2. Run label generator:
```bash
npm run generate-labels
```

3. Verify with type checking:
```bash
npm run type-check
```

That's it! The new machine is now available in:
- Library screen
- Recognition system
- Search/filtering
- All UI components

## Migration Notes

**What Changed:**
- ❌ Removed hardcoded `MACHINE_PROMPT_OVERRIDES` from identifyMachine.ts
- ❌ Removed HuggingFace SigLIP client-side recognition
- ✅ Added `MachineRecognition` interface
- ✅ Extended all 15 machines with recognition data
- ✅ Created label generation script
- ✅ Added validation utilities

**Why:**
- Simpler, more maintainable architecture
- Backend API handles recognition complexity
- Frontend focuses on UI/UX
- Easier to add new machines
- No manual sync between multiple files

## Future Enhancements

Potential improvements:
1. **Client-side recognition** - Re-enable SigLIP for offline mode
2. **A/B testing** - Test different visual prompts
3. **Machine learning** - Improve prompts based on success rates
4. **User feedback** - Let users report misidentifications
5. **Multi-language** - Translate prompts for international markets

---

Last Updated: 2025-11-07
