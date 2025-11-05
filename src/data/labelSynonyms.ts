// Mapping between broad gym machine labels and catalog machine identifiers.
// Labels without a catalog mapping are still surfaced as generic results.

const LABEL_TO_MACHINE_ID: Record<string, string | undefined> = {
  lat_pulldown_station: 'lat_pulldown',
  seated_row_machine: 'seated_row',
  leg_press_sled: 'leg_press',
  chest_press_machine: 'chest_press',
  shoulder_press_machine: 'shoulder_press',
  treadmill_cardio: 'treadmill',
};

export function getCatalogMachineIdForLabel(labelId: string): string | undefined {
  return LABEL_TO_MACHINE_ID[labelId];
}

export function hasCatalogMapping(labelId: string): boolean {
  return Boolean(getCatalogMachineIdForLabel(labelId));
}
