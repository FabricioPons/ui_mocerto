import { Review, ReviewDocument } from "./types";
import { mockReviews } from "./mock-data";

// Simple client-side store for demo purposes
export type AppView = "login" | "dashboard" | "new-review" | "processing" | "report";

export interface AppState {
  currentView: AppView;
  isAuthenticated: boolean;
  reviews: Review[];
  currentReviewId: string | null;
  uploadedFiles: ReviewDocument[];
}

let listeners: Array<() => void> = [];
let state: AppState = {
  currentView: "login",
  isAuthenticated: false,
  reviews: mockReviews,
  currentReviewId: null,
  uploadedFiles: [],
};

export function getState(): AppState {
  return state;
}

export function setState(partial: Partial<AppState>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
