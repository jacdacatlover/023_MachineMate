import { MachineDefinition } from '../types/machine';
import { createLogger } from '../shared/logger';

const logger = createLogger('data.validateMachines');

export interface ValidationError {
  machineId: string;
  field: string;
  message: string;
}

/**
 * Validate core machine data to ensure guides are complete.
 */
export function validateMachineData(machines: MachineDefinition[]): ValidationError[] {
  const errors: ValidationError[] = [];

  machines.forEach(machine => {
    if (!machine.name.trim()) {
      errors.push({
        machineId: machine.id,
        field: 'name',
        message: 'Missing machine name',
      });
    }

    if (!machine.primaryMuscles || machine.primaryMuscles.length === 0) {
      errors.push({
        machineId: machine.id,
        field: 'primaryMuscles',
        message: 'At least one primary muscle is required',
      });
    }

    if (!machine.setupSteps || machine.setupSteps.length === 0) {
      errors.push({
        machineId: machine.id,
        field: 'setupSteps',
        message: 'Setup steps cannot be empty',
      });
    }

    if (!machine.howToSteps || machine.howToSteps.length === 0) {
      errors.push({
        machineId: machine.id,
        field: 'howToSteps',
        message: 'How-to instructions cannot be empty',
      });
    }

    if (!machine.commonMistakes || machine.commonMistakes.length === 0) {
      errors.push({
        machineId: machine.id,
        field: 'commonMistakes',
        message: 'Common mistakes list cannot be empty',
      });
    }

    if (!machine.safetyTips || machine.safetyTips.length === 0) {
      errors.push({
        machineId: machine.id,
        field: 'safetyTips',
        message: 'Safety tips list cannot be empty',
      });
    }

    if (!machine.beginnerTips || machine.beginnerTips.length === 0) {
      errors.push({
        machineId: machine.id,
        field: 'beginnerTips',
        message: 'Beginner tips list cannot be empty',
      });
    }
  });

  return errors;
}

/**
 * Log validation results
 */
export function logValidationResults(machines: MachineDefinition[]): boolean {
  const errors = validateMachineData(machines);

  if (errors.length === 0) {
    logger.info(`✅ All ${machines.length} machines have complete guide content`);
    return true;
  }

  logger.error(`❌ Found ${errors.length} validation errors:`);
  errors.forEach(error => {
    logger.error(`  - ${error.machineId}.${error.field}: ${error.message}`);
  });

  return false;
}

/**
 * Assert that all machines are valid (throws error if not)
 * Use this in development mode to catch configuration issues early
 */
export function assertValidMachines(machines: MachineDefinition[]): void {
  const errors = validateMachineData(machines);

  if (errors.length > 0) {
    const errorMessages = errors
      .map(e => `${e.machineId}.${e.field}: ${e.message}`)
      .join('\n  ');

    throw new Error(
      `Machine guide validation failed with ${errors.length} errors:\n  ${errorMessages}`
    );
  }
}
