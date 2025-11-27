// Type definitions for history tracking

export interface RecentHistoryItem {
  machineId: string;
  viewedAt: string; // ISO string timestamp
  entryId?: string; // Unique identifier for list rendering
}
