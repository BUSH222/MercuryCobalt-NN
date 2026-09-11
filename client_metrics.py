"""
Per-client-station, per-timestep "satellite internet" metrics, built on top
of the contact graphs from graph_builder.graph_at().

For every ground station with role == "client", at every time step, this
answers:
  1) is it connected to *a* gateway through the satellite mesh?
  2) if so, what's the total path distance (-> propagation delay / "ping")?

...plus a set of additional metrics that are useful for modeling a real
satellite ISP: link quality (elevation, free-space path loss), path
structure (hop count, bottleneck leg, ISL usage), and redundancy (how many
independent paths exist, i.e. how much slack before a single failure causes
an outage).

Everything here is computed from a single graph snapshot; temporal metrics
(handovers, outage duration, jitter) are derived afterwards by
`summarize_client_series`, which looks across a client's full time series.
"""

from __future__ import annotations

import math

import networkx as nx

import graph_builder

# Speed of light in vacuum, km/s. Both the laser ISLs and the RF
# ground<->satellite links travel at ~c (RF through atmosphere is close
# enough at these distances to ignore the small refractive slowdown).
C_KM_S = 299792.458


def fspl_db(distance_km: float, freq_mhz: float) -> float:
    """Free-space path loss (dB), Friis formula: 20log10(d_km) + 20log10(f_MHz) + 32.44.

    Purely illustrative here -- freq_mhz is an assumption you should set to
    whatever band you're modeling (Ku ~14 GHz uplink, Ka ~20 GHz downlink,
    optical ISL doesn't really use "FSPL" in the RF sense at all). Useful
    as a *relative* signal-quality proxy across time/stations, not as an
    absolute link-budget number.
    """
    if distance_km <= 0:
        return float("-inf")
    return 20 * math.log10(distance_km) + 20 * math.log10(freq_mhz) + 32.44


def client_metrics_at(
    G: nx.Graph,
    scenario: dict,
    client_id: str,
    gateway_ids: list[str] | None = None,
    per_hop_processing_ms: float = 0.5,
    freq_mhz: float = 20000.0,
) -> dict:
    """Compute connectivity + link-quality metrics for one client, one instant.

    per_hop_processing_ms: assumed onboard switching/processing delay added
    per relay satellite (one-way), on top of pure speed-of-light propagation.
    Set to 0 if you only want physical propagation delay.
    """
    if gateway_ids is None:
        gateway_ids = [g["id"] for g in scenario["ground_sites"] if g["role"] == "gateway"]

    m = {
        "t_s": G.graph.get("t_s"),
        "client_id": client_id,
        # (1) connectivity
        "connected": False,
        "gateway_id": None,
        "path": None,
        # (2) distance / latency
        "total_distance_km": None,
        "one_way_latency_ms": None,
        "processing_delay_ms": None,
        "round_trip_latency_ms": None,  # pure propagation RTT ("ping")
        "total_rtt_ms": None,  # propagation + processing RTT
        # path structure
        "hop_count": None,
        "relay_satellite_count": None,
        "uses_isl": None,  # path crosses >1 satellite (not a simple bent-pipe)
        "first_hop_satellite": None,
        "first_hop_elevation_deg": None,
        "last_hop_satellite": None,
        "last_hop_elevation_deg": None,
        "max_hop_km": None,
        "min_hop_km": None,
        "avg_hop_km": None,
        # link-quality / robustness
        "fspl_db_bottleneck": None,
        "visible_satellite_count": G.degree(client_id) if client_id in G else 0,
        "alt_disjoint_paths": None,  # redundancy: independent client->gateway paths
    }

    if client_id not in G:
        return m

    # Best (lowest-latency) reachable gateway, in case of multiple gateways
    best = None
    for gw in gateway_ids:
        if gw not in G:
            continue
        try:
            path = nx.shortest_path(G, client_id, gw, weight="weight")
        except nx.NetworkXNoPath:
            continue
        dist = nx.path_weight(G, path, weight="weight")
        if best is None or dist < best[0]:
            best = (dist, gw, path)

    if best is None:
        return m  # visible satellites maybe, but no route to any gateway

    dist, gw, path = best
    hop_km = [G[path[k]][path[k + 1]]["distance_km"] for k in range(len(path) - 1)]
    relay_sats = len(path) - 2  # exclude client + gateway endpoints

    one_way_ms = dist / C_KM_S * 1000
    proc_ms = per_hop_processing_ms * relay_sats

    m.update(
        {
            "connected": True,
            "gateway_id": gw,
            "path": path,
            "total_distance_km": dist,
            "one_way_latency_ms": one_way_ms,
            "processing_delay_ms": proc_ms,
            "round_trip_latency_ms": one_way_ms * 2,
            "total_rtt_ms": (one_way_ms + proc_ms) * 2,
            "hop_count": len(path) - 1,
            "relay_satellite_count": relay_sats,
            "uses_isl": relay_sats > 1,
            "first_hop_satellite": path[1],
            "first_hop_elevation_deg": G[client_id][path[1]].get("elevation_deg"),
            "last_hop_satellite": path[-2],
            "last_hop_elevation_deg": G[gw][path[-2]].get("elevation_deg"),
            "max_hop_km": max(hop_km),
            "min_hop_km": min(hop_km),
            "avg_hop_km": sum(hop_km) / len(hop_km),
            "fspl_db_bottleneck": fspl_db(max(hop_km), freq_mhz),
        }
    )
    try:
        m["alt_disjoint_paths"] = len(list(nx.node_disjoint_paths(G, client_id, gw)))
    except nx.NetworkXNoPath, nx.NodeNotFound:
        m["alt_disjoint_paths"] = 0

    return m


def build_client_series(scenario: dict, **kwargs) -> dict[str, list[dict]]:
    """Run client_metrics_at for every client, at every time step.

    Returns {client_id: [metrics_dict, ...]} ordered by time.
    """
    clients = [g["id"] for g in scenario["ground_sites"] if g["role"] == "client"]
    series: dict[str, list[dict]] = {c: [] for c in clients}

    env = scenario["environment"]
    for t in range(0, env["horizon_s"] + 1, env["step_s"]):
        G = graph_builder.graph_at(scenario, t)
        for c in clients:
            series[c].append(client_metrics_at(G, scenario, c, **kwargs))
    return series


def summarize_client_series(scenario: dict, records: list[dict]) -> dict:
    """Temporal roll-up for one client's time series: availability, outages,
    handovers, latency stats -- the things you can't see from a single instant.
    """
    n = len(records)
    connected_flags = [r["connected"] for r in records]
    availability = sum(connected_flags) / n if n else 0.0

    rtts = [r["total_rtt_ms"] for r in records if r["connected"]]
    mean_rtt = sum(rtts) / len(rtts) if rtts else None
    jitter_ms = (
        sum(abs(rtts[k] - rtts[k - 1]) for k in range(1, len(rtts))) / (len(rtts) - 1) if len(rtts) > 1 else None
    )

    # Handover: serving (first-hop) satellite changed between two consecutive
    # *connected* steps.
    handovers = 0
    prev_sat = None
    for r in records:
        if r["connected"]:
            if prev_sat is not None and r["first_hop_satellite"] != prev_sat:
                handovers += 1
            prev_sat = r["first_hop_satellite"]
        else:
            prev_sat = None

    # Outage runs: contiguous stretches of connected == False
    step_s = scenario["environment"]["step_s"]
    outages = []
    run_start = None
    for r in [*records, {"connected": True}]:  # sentinel to close a trailing outage
        if not r["connected"] and run_start is None:
            run_start = r["t_s"]
        elif r["connected"] and run_start is not None:
            outages.append((run_start, r["t_s"]))
            run_start = None
    longest_outage_s = max((b - a for a, b in outages), default=0)

    return {
        "availability": availability,
        "meets_target_availability": availability >= scenario["environment"]["target_availability"],
        "mean_rtt_ms": mean_rtt,
        "jitter_ms": jitter_ms,
        "handover_count": handovers,
        "outage_count": len(outages),
        "longest_outage_s": longest_outage_s,
        "step_s": step_s,
    }


if __name__ == "__main__":
    import sys

    import graph_builder as gb

    scenario = gb.geometry.load(sys.argv[1])
    series = build_client_series(scenario)
    for client_id, records in series.items():
        summary = summarize_client_series(scenario, records)
        print(client_id, summary)
