// Type definitions for gym machine data

export type MachineCategory =
  | 'Upper Body'
  | 'Lower Body'
  | 'Back'
  | 'Chest'
  | 'Shoulders'
  | 'Arms'
  | 'Core';

export interface MachineDefinition {
  id: string; // e.g., 'leg_press'
  name: string; // e.g., 'Seated Leg Press'
  category: MachineCategory;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  setupSteps: string[];
  howToSteps: string[];
  commonMistakes: string[];
  safetyTips: string[];
  beginnerTips: string[];
  muscleDiagramImage?: string; // Optional path to muscle diagram asset
  muscleAnimationVideo?: string; // Optional path to muscle animation video
}
