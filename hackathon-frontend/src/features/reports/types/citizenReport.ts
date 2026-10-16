export type ObservedLevel = "low" | "medium" | "high";
export type ReportStatus = "pending" | "confirmed" | "rejected";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CreateReportInput {
  location: Coordinates | null;
  locationName?: string;
  photo: File | null;
  photoPreviewUrl?: string;
  description?: string;
  observedLevel?: ObservedLevel;
}

export interface CreatedReportResponse {
  id: string;
  status: ReportStatus;
  message: string;
  createdAt: string;
}
