export interface TourStep {
  /** Matches the `data-tour-id` on the Sidebar section this step points at. */
  targetId: string;
  title: string;
  text: string;
}

/**
 * Scoped strictly to these four Sidebar sections — nowhere else in the app
 * (not the bottom bar, not the map) ever gets a tour step. See
 * `components/Sidebar/Sidebar.tsx` for the matching `data-tour-id`s.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    targetId: "tour-launch-stage",
    title: "Этап развёртывания",
    text: "Выберите, какая очередь запуска уже считается выведенной на орбиту — 1 (до 16 аппаратов), 2 (до 32) или 3 (все 48).",
  },
  {
    targetId: "tour-planes",
    title: "Орбитальные плоскости",
    text: "Меняйте RAAN и фазирование каждой плоскости ползунком или числом — изменения сразу видны в конфигурации, но карта пересчитается только по кнопке «Запустить расчёт».",
  },
  {
    targetId: "tour-coverage",
    title: "Оптимизация покрытия",
    text: "Автоматический подбор интервала RAAN и фазового сдвига между плоскостями на максимум доступности связи в наихудшем по клиентам случае.",
  },
  {
    targetId: "tour-failures",
    title: "Отказы спутников",
    text: "Добавляйте периоды недоступности спутников выделением на шкале — здесь же можно удалить и уже заданные в загруженном файле отказы.",
  },
];
