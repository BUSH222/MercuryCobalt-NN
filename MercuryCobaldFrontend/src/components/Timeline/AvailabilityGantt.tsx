import type { MouseEvent } from "react";
import type { GatewayOutage, GroundSite, Route, SatelliteFailure } from "../../domain";
import styles from "./AvailabilityGantt.module.css";

interface Segment {
  startFrac: number;
  endFrac: number;
}

function runsWhere(length: number, predicate: (i: number) => boolean): Segment[] {
  const segments: Segment[] = [];
  let start: number | null = null;
  for (let i = 0; i < length; i++) {
    const match = predicate(i);
    if (match && start === null) start = i;
    if (!match && start !== null) {
      segments.push({ startFrac: start / length, endFrac: i / length });
      start = null;
    }
  }
  if (start !== null) segments.push({ startFrac: start / length, endFrac: 1 });
  return segments;
}

function intervalSegments(intervals: { start_s: number; end_s: number }[], horizonS: number): Segment[] {
  return intervals.map((iv) => ({ startFrac: iv.start_s / horizonS, endFrac: iv.end_s / horizonS }));
}

interface AvailabilityGanttProps {
  horizonS: number;
  clients: GroundSite[];
  routesByClient: Record<string, Route[]>;
  failures: SatelliteFailure[];
  gatewayOutages: GatewayOutage[];
  timeIndex: number;
  stepCount: number;
  onSeek: (index: number) => void;
}

export function AvailabilityGantt({
  horizonS,
  clients,
  routesByClient,
  failures,
  gatewayOutages,
  timeIndex,
  stepCount,
  onSeek,
}: AvailabilityGanttProps) {
  const markerFrac = stepCount > 1 ? timeIndex / (stepCount - 1) : 0;

  const handleSeek = (e: MouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(Math.round(frac * (stepCount - 1)));
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <span className={styles.label}>Отказы спутников</span>
        <div className={`${styles.track} ${styles.failureTrack}`} onClick={handleSeek}>
          {intervalSegments(failures, horizonS).map((seg, i) => (
            <div
              key={i}
              className={styles.failureSegment}
              style={{ left: `${seg.startFrac * 100}%`, width: `${(seg.endFrac - seg.startFrac) * 100}%` }}
            />
          ))}
          <div className={styles.marker} style={{ left: `${markerFrac * 100}%` }} />
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Недоступность шлюзов</span>
        <div className={`${styles.track} ${styles.failureTrack}`} onClick={handleSeek}>
          {intervalSegments(gatewayOutages, horizonS).map((seg, i) => (
            <div
              key={i}
              className={styles.failureSegment}
              style={{ left: `${seg.startFrac * 100}%`, width: `${(seg.endFrac - seg.startFrac) * 100}%` }}
            />
          ))}
          <div className={styles.marker} style={{ left: `${markerFrac * 100}%` }} />
        </div>
      </div>

      {clients.map((client) => {
        const routes = routesByClient[client.id] ?? [];
        const okSegments = runsWhere(routes.length, (i) => (routes[i]?.path.length ?? 0) > 0);
        return (
          <div className={styles.row} key={client.id}>
            <span className={styles.label}>{client.name}</span>
            <div className={styles.track} onClick={handleSeek}>
              {okSegments.map((seg, i) => (
                <div
                  key={i}
                  className={styles.segmentOk}
                  style={{ left: `${seg.startFrac * 100}%`, width: `${(seg.endFrac - seg.startFrac) * 100}%` }}
                />
              ))}
              <div className={styles.marker} style={{ left: `${markerFrac * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
