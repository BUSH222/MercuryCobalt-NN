/**
 * The Redux store. Only `scenario` state lives here (see `scenarioSlice.ts`
 * for why it's Redux rather than the Zustand stores used for UI/onboarding
 * state) — `redux-persist` mirrors the whitelisted fields to localStorage on
 * every change, and `persistStore`'s completion callback triggers the
 * post-rehydration recompute, replacing the old `onFinishHydration` hook from
 * the Zustand version.
 *
 * Default RTK middleware (serializable + immutable checks) is left enabled
 * everywhere except redux-persist's own internal action types, which is what
 * "strict" means here: every actual app action/state must stay plain,
 * serializable JSON, enforced automatically in development.
 */
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistReducer, persistStore } from "redux-persist";
import storage from "./localStorageEngine";
import scenarioReducer, { rebuildAfterRehydrate, runComputation } from "./scenarioSlice";

const scenarioPersistConfig = {
  key: "cosmohack-scenario",
  storage,
  whitelist: ["baseline", "overrides", "variants", "selectedClientId", "timeIndex"],
};

const rootReducer = combineReducers({
  scenario: persistReducer(scenarioPersistConfig, scenarioReducer),
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store, undefined, () => {
  const state = store.getState().scenario;
  if (state.baseline) {
    store.dispatch(rebuildAfterRehydrate());
    void store.dispatch(runComputation());
  }
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
