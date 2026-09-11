"""
Build a per-timestep contact graph (satellites + ground stations) from a
cosmo-A scenario dict, using the `geometry` helper module.

geometry.snapshot(scenario, t_s) already does the heavy lifting for a single
instant t_s:
  - propagates every satellite's position (fixed altitude, circular orbit)
  - marks a satellite inactive if it hasn't launched yet (launch_batch >
    launch_stage) or is in a failure window
  - builds inter-satellite (ISL) edges: distance < isl_range_km AND the
    straight line between the two sats does not pass through the Earth
    (that's what the `closest > R` check does), both sats active
  - builds ground<->satellite edges: elevation >= min_elevation_deg, the
    satellite active, and the ground site (if a gateway) not in an outage
    window

So the graph construction below is mostly a thin adapter: for each time
step, take that snapshot dict and turn it into a networkx.Graph, with the
link distance in km stored as the edge weight.
"""

from __future__ import annotations

import networkx as nx

import geometry


def graph_at(scenario: dict, t_s: float) -> nx.Graph:
    """Build the contact graph for a single instant t_s."""
    snap = geometry.snapshot(scenario, t_s)

    G = nx.Graph()
    G.graph["t_s"] = t_s

    # Ground nodes (gateways / client terminals) are always present as
    # nodes, even if they have no visible satellite at this instant.
    for g in scenario["ground_sites"]:
        G.add_node(
            g["id"],
            kind="ground",
            role=g["role"],  # "gateway" or "client"
            lat_deg=g["lat_deg"],
            lon_deg=g["lon_deg"],
        )

    # Satellite nodes: only satellites that are currently active (launched
    # and not failed) get a node, so an inactive satellite is simply absent
    # from the graph at this time step (isolated nodes would be misleading
    # for connectivity/pathfinding analysis).
    for sat in snap["satellites"]:
        if sat["active"]:
            G.add_node(
                sat["id"],
                kind="satellite",
                x_km=sat["x_km"],
                y_km=sat["y_km"],
                z_km=sat["z_km"],
            )

    # Edges: geometry.snapshot already filtered these by min elevation,
    # max ISL range, line-of-sight around the Earth, active status, and
    # gateway outages -- so this is mostly a direct copy, storing distance
    # as both an explicit attribute and as "weight" for shortest-path use.
    # Ground<->satellite edges also get the raw elevation angle attached,
    # since that's a useful link-quality signal for downstream metrics.
    ground_ids = {g["id"] for g in scenario["ground_sites"]}
    for u, v, dist_km in snap["edges"]:
        attrs = {"distance_km": dist_km, "weight": dist_km}
        if u in ground_ids:
            attrs["elevation_deg"] = snap["elevation_deg"][u][v]
        elif v in ground_ids:
            attrs["elevation_deg"] = snap["elevation_deg"][v][u]
        G.add_edge(u, v, **attrs)

    return G


def build_time_series(scenario: dict) -> dict[int, nx.Graph]:
    """Build the graph at every step across the full horizon.

    Mirrors:
        for time in range(0, scenario["environment"]["horizon_s"] + 1,
                           scenario["environment"]["step_s"]):
    """
    env = scenario["environment"]
    graphs: dict[int, nx.Graph] = {}
    for t in range(0, env["horizon_s"] + 1, env["step_s"]):
        graphs[t] = graph_at(scenario, t)
    return graphs


if __name__ == "__main__":
    import sys

    scenario = geometry.load(sys.argv[1])
    graphs = build_time_series(scenario)
    for t, G in list(graphs.items())[:3]:
        n_sat = sum(1 for _, d in G.nodes(data=True) if d["kind"] == "satellite")
        print(f"t={t:>6}s  nodes={G.number_of_nodes():>3} (sat={n_sat})  edges={G.number_of_edges():>3}")
