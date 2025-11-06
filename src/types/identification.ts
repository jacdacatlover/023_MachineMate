// Shared identification result types for machine recognition flows.

export type IdentificationSource =
  | 'huggingface'
  | 'fallback'
  | 'label_fusion'
  | 'manual'
  | 'backend_api';

export interface CatalogIdentificationResult {
  kind: 'catalog';
  machineId: string;
  candidates: string[];
  confidence: number | null;
  lowConfidence: boolean;
  source: IdentificationSource;
  photoUri?: string;
}

export interface GenericLabelResult {
  kind: 'generic';
  labelId: string;
  labelName: string;
  candidates: string[];
  confidence: number;
  photoUri?: string;
}

export interface NotGymResult {
  kind: 'not_gym';
  confidence: number;
  photoUri?: string;
}

export type IdentificationResult = CatalogIdentificationResult | GenericLabelResult | NotGymResult;

export function isCatalogResult(result: IdentificationResult): result is CatalogIdentificationResult {
  return result.kind === 'catalog';
}

export function isGenericLabelResult(result: IdentificationResult): result is GenericLabelResult {
  return result.kind === 'generic';
}

export function isNotGymResult(result: IdentificationResult): result is NotGymResult {
  return result.kind === 'not_gym';
}
