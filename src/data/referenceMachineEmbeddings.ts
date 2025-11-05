// Precomputed SigLIP embeddings for curated reference photos.
// Populate this list by running scripts/embedReferences.ts once reference images are available.

export interface ReferenceMachineEmbedding {
  id: string;
  labelId: string;
  machineId?: string;
  embedding: number[];
  notes?: string;
}

export const REFERENCE_MACHINE_EMBEDDINGS: ReferenceMachineEmbedding[] = [];
