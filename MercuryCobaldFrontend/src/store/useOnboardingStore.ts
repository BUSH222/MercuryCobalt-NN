/**
 * Tracks the guided Sidebar tour (see `components/Onboarding/OnboardingTour.tsx`
 * and `tourSteps.ts`). Only `hasSeenTour` is persisted, so the tour never
 * replays for a returning user; `activeStepIndex` is session-only and reset
 * to `null` (not shown) on every reload.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  hasSeenTour: boolean;
  activeStepIndex: number | null;
  /** No-op if the tour has already been seen or is already running. */
  startTour: () => void;
  /** Advances to the next step, or ends the tour once `totalSteps` is reached. */
  nextStep: (totalSteps: number) => void;
  skipTour: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenTour: false,
      activeStepIndex: null,
      startTour: () =>
        set((s) => (s.hasSeenTour || s.activeStepIndex !== null ? s : { activeStepIndex: 0 })),
      nextStep: (totalSteps) =>
        set((s) => {
          if (s.activeStepIndex === null) return s;
          const next = s.activeStepIndex + 1;
          return next >= totalSteps
            ? { activeStepIndex: null, hasSeenTour: true }
            : { activeStepIndex: next };
        }),
      skipTour: () => set({ activeStepIndex: null, hasSeenTour: true }),
    }),
    {
      name: "cosmohack-onboarding",
      partialize: (state) => ({ hasSeenTour: state.hasSeenTour }),
    },
  ),
);
