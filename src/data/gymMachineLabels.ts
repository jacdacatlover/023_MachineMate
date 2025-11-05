// Canonical vocabulary of gym machine concepts used for zero-shot recognition.
// These prompts are embedded once and reused to classify incoming photos.

export interface GymMachineLabel {
  id: string;
  name: string;
  prompt: string;
  synonyms: string[];
  category: string;
  keywords?: string[];
}

export const GYM_MACHINE_LABELS: GymMachineLabel[] = [
  {
    id: 'lat_pulldown_station',
    name: 'Lat Pulldown Machine',
    category: 'Back',
    prompt:
      'lat pulldown cable machine in a gym with wide grip bar overhead, weight stack, padded thigh restraints, seated pull down exercise',
    synonyms: ['lat pulldown', 'wide grip pulldown', 'cable pulldown'],
    keywords: ['cable station', 'wide bar', 'thigh pad', 'pull-down'],
  },
  {
    id: 'seated_row_machine',
    name: 'Seated Row Machine',
    category: 'Back',
    prompt:
      'seated cable row machine with chest pad and low pulley handle, weight stack, horizontal row in fitness center',
    synonyms: ['seated row', 'machine row', 'cable row'],
    keywords: ['chest pad', 'low pulley', 'rowing handle'],
  },
  {
    id: 'leg_press_sled',
    name: 'Leg Press Machine',
    category: 'Lower Body',
    prompt:
      'seated leg press sled with large angled footplate and weight stack, lower body push machine in gym',
    synonyms: ['leg press', 'sled press', 'seated leg press'],
    keywords: ['footplate', 'sled', 'lower body'],
  },
  {
    id: 'hack_squat_machine',
    name: 'Hack Squat Machine',
    category: 'Lower Body',
    prompt:
      'hack squat machine with angled sled and shoulder pads, lower body gym equipment with foot platform',
    synonyms: ['hack squat', 'sled squat', 'machine squat'],
    keywords: ['sled', 'shoulder pads', 'foot platform'],
  },
  {
    id: 'smith_machine',
    name: 'Smith Machine',
    category: 'Full Body',
    prompt:
      'smith machine with guided barbell on vertical rails inside gym rack, safety hooks and adjustable stops',
    synonyms: ['smith machine', 'guided barbell', 'smith rack'],
    keywords: ['guided barbell', 'rails', 'rack'],
  },
  {
    id: 'chest_press_machine',
    name: 'Chest Press Machine',
    category: 'Chest',
    prompt:
      'seated chest press machine with horizontal handles at chest height, weight stack, padded backrest, pushing exercise station',
    synonyms: ['chest press', 'machine press', 'seated press'],
    keywords: ['horizontal handles', 'padded seat', 'push'],
  },
  {
    id: 'pec_deck_machine',
    name: 'Pec Deck / Fly Machine',
    category: 'Chest',
    prompt:
      'pec deck fly machine with dual arms and elbow pads, seated fly exercise equipment in fitness club',
    synonyms: ['pec deck', 'chest fly machine', 'butterfly machine'],
    keywords: ['dual arms', 'elbow pads', 'fly motion'],
  },
  {
    id: 'shoulder_press_machine',
    name: 'Shoulder Press Machine',
    category: 'Shoulders',
    prompt:
      'seated shoulder press machine with overhead handles, vertical pushing movement, weight stack and back support',
    synonyms: ['shoulder press', 'overhead press machine', 'military press machine'],
    keywords: ['overhead handles', 'vertical press', 'weight stack'],
  },
  {
    id: 'treadmill_cardio',
    name: 'Treadmill',
    category: 'Cardio',
    prompt:
      'treadmill cardio machine with running belt, console display, hand rails in indoor gym or fitness center',
    synonyms: ['treadmill', 'running machine', 'cardio treadmill'],
    keywords: ['running belt', 'console', 'handrails'],
  },
  {
    id: 'elliptical_trainer',
    name: 'Elliptical Trainer',
    category: 'Cardio',
    prompt:
      'elliptical cross trainer with moving handles and foot pedals, cardio machine in gym, low impact stride motion',
    synonyms: ['elliptical', 'cross trainer', 'orbitrek'],
    keywords: ['moving handles', 'pedals', 'elliptical'],
  },
  {
    id: 'rowing_erg_machine',
    name: 'Rowing Ergometer',
    category: 'Cardio',
    prompt:
      'rowing erg machine with sliding seat, handle connected to flywheel, cardio rowing equipment indoors',
    synonyms: ['rower', 'rowing machine', 'erg'],
    keywords: ['sliding seat', 'flywheel', 'rowing handle'],
  },
  {
    id: 'cable_crossover',
    name: 'Cable Crossover',
    category: 'Full Body',
    prompt:
      'dual adjustable pulley cable crossover station with two tall columns and adjustable pulleys, open center training area',
    synonyms: ['cable crossover', 'dual adjustable pulley', 'functional trainer'],
    keywords: ['dual columns', 'adjustable pulleys', 'cables'],
  },
];

export function getGymMachineLabel(id: string): GymMachineLabel | undefined {
  return GYM_MACHINE_LABELS.find(label => label.id === id);
}
