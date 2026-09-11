import json

from fastapi import FastAPI

import client_metrics
import geometry
import graph_builder
from func3d import _deg2rad, _ecef_to_lla, _eci_to_ecef, _mean_motion, _sat_eci

app = FastAPI(title="Satellite Coverage API", version="1.0")


def simulate(initialdata):
    env = initialdata["environment"]
    alt = env["altitude_km"]
    inc = _deg2rad(env["inclination_deg"])
    ea0 = _deg2rad(env.get("earth_angle0_deg", 0.0))
    n = _mean_motion(alt)

    planes = {p["id"]: p for p in initialdata["design"]["planes"]}

    sats = []
    for s in initialdata["design"]["satellites"]:
        p = planes[s["plane_id"]]
        sats.append(
            {
                "id": s["id"],
                "plane_id": s["plane_id"],
                "raan": _deg2rad(p["raan_deg"]),
                "ta0": _deg2rad(p.get("phase_deg", 0.0) + s["slot_deg"]),
            }
        )

    client_ids = [g["id"] for g in initialdata["ground_sites"] if g["role"] == "client"]

    sat_positions = {}
    graphs = {}
    client_records = {c: [] for c in client_ids}

    for time in range(0, env["horizon_s"] + 1, env["step_s"]):
        # 1) every satellite's position at this time step
        snap = {}
        for s in sats:
            ta = s["ta0"] + n * time
            xi, yi, zi = _sat_eci(alt, inc, s["raan"], ta)
            xe, ye, ze = _eci_to_ecef(xi, yi, zi, ea0)
            lat, lon, al = _ecef_to_lla(xe, ye, ze)
            snap[s["id"]] = {
                "lat_deg": round(lat, 6),
                "lon_deg": round(lon, 6),
                "alt_km": round(al, 3),
                "x_ecef_km": round(xe, 3),
                "y_ecef_km": round(ye, 3),
                "z_ecef_km": round(ze, 3),
                "plane_id": s["plane_id"],
            }
        sat_positions[time] = snap

        # 2) contact graph at this time step
        G = graph_builder.graph_at(initialdata, time)
        graphs[time] = G

        # 3) per-client connectivity/latency, computed right here while G
        #    for this instant is already on hand
        for c in client_ids:
            client_records[c].append(client_metrics.client_metrics_at(G, initialdata, c))

    # 4) stats that need the *whole* series (availability, handovers,
    #    outages, jitter) -- computed once, after the loop
    client_summary = {
        c: client_metrics.summarize_client_series(initialdata, records) for c, records in client_records.items()
    }

    return {
        "sat_positions": sat_positions,
        "graphs": graphs,
        "client_records": client_records,
        "client_summary": client_summary,
    }


def validate_json(json_data):
    try:
        geometry.validate(json_data)
        return True
    except ValueError as e:
        print(f"Validation error: {e}")
        return False


# @app.post("/api/scenarios")
# async def upload_scenario(file: UploadFile = File(...)):
#     """Загрузка одного JSON-сценария.

#     Валидирует, сразу считает весь timeline и coverage (для сценариев такого
#     размера это доли секунды — сотни шагов x пара десятков спутников),
#     сохраняет в памяти и возвращает сводку для карточки в UI.
#     """
#     raw_bytes = await file.read()
#     try:
#         raw = json.loads(raw_bytes.decode("utf-8"))
#     except json.JSONDecodeError as exc:
#         raise HTTPException(status_code=400, detail=f"Невалидный JSON: {exc}") from None

#     try:
#         geometry.validate(raw)
#     except (ValueError, KeyError) as exc:
#         raise HTTPException(status_code=400, detail=f"Сценарий не прошёл валидацию: {exc}") from None

#     # timeline, connectivity = run_timeline(raw)
#     # coverage = build_report(raw, connectivity)
#     # sid = store.add(filename=file.filename, raw=raw, timeline=timeline, coverage=coverage)

#     # summary = store.summary(sid)
#     return None  # todo: summary


if __name__ == "__main__":
    scenarios = []

    files = ["01_full_constellation.json", "02_first_launch.json", "03_satellite_outages.json", "04_link_range.json"]
    for file in files:
        with open(f"data/{file}") as f:
            scenarios.append(json.loads(f.read()))

    data = simulate(scenarios[0])
    print(data)
