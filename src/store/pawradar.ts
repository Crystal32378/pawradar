'use client';

import { create } from 'zustand';

export type PawRadarView = 'dashboard' | 'fan';

interface FanEvent {
  slug: string;
  petName: string;
  ownerHandle: string;
  walkStart: string;
  walkEnd: string;
  location: string;
  notes: string | null;
}

interface PawRadarState {
  /** Which top-level view the page is showing. */
  view: PawRadarView;
  /** When in fan view, the event being previewed. */
  fanEvent: FanEvent | null;
  /** A bump counter used to refresh the dashboard list after creates/deletes. */
  dashboardVersion: number;
  /** Whether the fan view is loading the event from the API. */
  fanLoading: boolean;
  /** Error message for the fan view, if the slug was not found. */
  fanError: string | null;

  enterFanView: (event: FanEvent) => void;
  setFanLoading: (loading: boolean) => void;
  setFanError: (error: string | null) => void;
  exitFanView: () => void;
  bumpDashboard: () => void;
}

export const usePawRadar = create<PawRadarState>((set) => ({
  view: 'dashboard',
  fanEvent: null,
  dashboardVersion: 0,
  fanLoading: false,
  fanError: null,

  enterFanView: (event) =>
    set({ view: 'fan', fanEvent: event, fanLoading: false, fanError: null }),
  setFanLoading: (loading) => set({ fanLoading: loading }),
  setFanError: (error) =>
    set({ fanError: error, fanLoading: false, fanEvent: null }),
  exitFanView: () =>
    set({ view: 'dashboard', fanEvent: null, fanError: null, fanLoading: false }),
  bumpDashboard: () =>
    set((s) => ({ dashboardVersion: s.dashboardVersion + 1 })),
}));
