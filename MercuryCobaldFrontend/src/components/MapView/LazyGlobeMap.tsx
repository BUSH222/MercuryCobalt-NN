import { lazy, Suspense } from "react";

const GlobeMap = lazy(() => import("./GlobeMap"));

export function LazyGlobeMap() {
  return <Suspense fallback={<div role="status">Загрузка 3D-карты…</div>}><GlobeMap /></Suspense>;
}
