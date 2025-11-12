// Shared identification result types for machine recognition flows.

export type IdentificationSource =
  | 'backend_api'
  | 'fallback'
  | 'manual';

export interface CatalogIdentificationResult {
  kind: 'catalog';
  machineId: string;
  candidates: string[];
  confidence: number | null;
  lowConfidence: boolean;
  source: IdentificationSource;
  confidenceThreshold?: number;
  photoUri?: string;
}

export interface GenericLabelResult {
  kind: 'generic';
  labelId: string;
  labelName: string;
  candidates: string[];
  confidence: number;
  source: IdentificationSource;
  confidenceThreshold?: number;
  photoUri?: string;
}

export type IdentificationResult = CatalogIdentificationResult | GenericLabelResult;

export function isCatalogResult(result: IdentificationResult): result is CatalogIdentificationResult {
  return result.kind === 'catalog';
}

export function isGenericLabelResult(result: IdentificationResult): result is GenericLabelResult {
  return result.kind === 'generic';
}
