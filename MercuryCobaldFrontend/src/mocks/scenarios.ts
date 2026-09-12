/**
 * Sample scenarios matching the four files described in "Описание данных"
 * (01_full_constellation, 02_first_launch, 03_satellite_outages, 04_link_range).
 * These are loaded verbatim from `mocks/presets/*.json` — the same files that
 * would ship as the official data set — so the "Примеры сценариев" buttons in
 * the sidebar always show exactly what a user loading those files by hand
 * would see, with no risk of the two drifting apart. Used to seed the
 * "Загрузить пример" action and for local development, since no backend is
 * available in this environment. The shape follows the "cosmo-A-1.0" schema
 * exactly, so each preset is a drop-in stand-in for a real uploaded scenario.
 */
import type { Scenario } from "../domain";
import fullConstellation from "./presets/01_full_constellation.json";
import firstLaunch from "./presets/02_first_launch.json";
import satelliteOutages from "./presets/03_satellite_outages.json";
import linkRange from "./presets/04_link_range.json";

export const SAMPLE_SCENARIOS = [
  { label: "01. Полная группировка", scenario: fullConstellation as Scenario },
  { label: "02. Первая очередь запуска", scenario: firstLaunch as Scenario },
  { label: "03. Недоступность десяти аппаратов", scenario: satelliteOutages as Scenario },
  { label: "04. Дальность ISL 2000 км", scenario: linkRange as Scenario },
] as const;
