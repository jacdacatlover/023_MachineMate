// Validation utilities for storage operations

import { MachineDefinition } from 'src/types/machine';

/**
 * Validates if a machine ID exists in the catalog
 */
export function isMachineIdValid(
  machineId: string,
  machines: MachineDefinition[]
): boolean {
  return machines.some(machine => machine.id === machineId);
}

/**
 * Filters an array of machine IDs to only include valid ones
 * Invalid IDs are logged and removed
 */
export function filterValidMachineIds(
  machineIds: string[],
  machines: MachineDefinition[]
): string[] {
  const validIds: string[] = [];
  const invalidIds: string[] = [];

  for (const id of machineIds) {
    if (isMachineIdValid(id, machines)) {
      validIds.push(id);
    } else {
      invalidIds.push(id);
    }
  }

  if (invalidIds.length > 0) {
    console.warn(
      `Removed ${invalidIds.length} invalid machine ID(s) from storage:`,
      invalidIds
    );
  }

  return validIds;
}

/**
 * Validates a machine ID before adding to favorites or history
 * @throws Error if the machine ID is invalid
 */
export function validateMachineId(
  machineId: string,
  machines: MachineDefinition[]
): void {
  if (!machineId || typeof machineId !== 'string') {
    throw new Error('Machine ID must be a non-empty string');
  }

  if (!isMachineIdValid(machineId, machines)) {
    throw new Error(
      `Invalid machine ID: "${machineId}". Machine does not exist in catalog.`
    );
  }
}
