export type ViewEventType = "open" | "slide_view" | "heartbeat" | "close";

export interface DeckVersion {
  id: string;
  label: string;
  notes: string | null;
  filename: string;
  storage_key: string;
  size_bytes: string;
  sha256: string;
  warnings: string[];
  uploaded_by: string;
  created_at: string;
  is_live: boolean;
  published_at: string | null;
}

export interface Admin {
  email: string;
  added_by: string;
  created_at: string;
}
