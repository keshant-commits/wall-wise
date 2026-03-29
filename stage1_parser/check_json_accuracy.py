# ============================================================
# JSON Accuracy Checker — Stage 1
# Run this after floor_plan_parser.py to verify output quality
# ============================================================

import json
import math
import os

BASE_DIR = r"C:\Users\kanha\OneDrive\Desktop\prompt-thon\wall-wise\stage1_parser"

# ── Load all 3 JSON files ────────────────────────────────────
plans = {
    "Plan A": os.path.join(BASE_DIR, "outputs", "plan_a_data.json"),
    "Plan B": os.path.join(BASE_DIR, "outputs", "plan_b_data.json"),
    "Plan C": os.path.join(BASE_DIR, "outputs", "plan_c_data.json"),
}

# ── What we expect for each plan ────────────────────────────
# Based on the floor plan images provided in the hackathon
expected = {
    "Plan A": {
        "min_rooms"         : 2,
        "max_rooms"         : 5,
        "min_walls"         : 15,
        "max_walls"         : 80,
        "min_openings"      : 2,
        "min_load_bearing"  : 3,
        "max_wall_length_m" : 20,
        "min_wall_length_m" : 0.5,
        "max_room_area_m2"  : 60,
        "min_room_area_m2"  : 3,
    },
    "Plan B": {
        "min_rooms"         : 4,
        "max_rooms"         : 12,
        "min_walls"         : 20,
        "max_walls"         : 100,
        "min_openings"      : 4,
        "min_load_bearing"  : 4,
        "max_wall_length_m" : 25,
        "min_wall_length_m" : 0.5,
        "max_room_area_m2"  : 80,
        "min_room_area_m2"  : 3,
    },
    "Plan C": {
        "min_rooms"         : 3,
        "max_rooms"         : 10,
        "min_walls"         : 15,
        "max_walls"         : 90,
        "min_openings"      : 3,
        "min_load_bearing"  : 3,
        "max_wall_length_m" : 20,
        "min_wall_length_m" : 0.5,
        "max_room_area_m2"  : 70,
        "min_room_area_m2"  : 3,
    },
}

# ── Checker ──────────────────────────────────────────────────
def check_plan(plan_name, json_path, exp):
    print(f"\n{'='*55}")
    print(f"  {plan_name}")
    print(f"{'='*55}")

    # Check file exists
    if not os.path.exists(json_path):
        print(f"  SKIP — file not found: {json_path}")
        return

    with open(json_path) as f:
        data = json.load(f)

    walls    = data.get("walls", [])
    rooms    = data.get("rooms", [])
    openings = data.get("openings", [])
    summary  = data.get("summary", {})
    metadata = data.get("metadata", {})

    img_w = metadata.get("image_size_px", [1536, 1024])[0]
    img_h = metadata.get("image_size_px", [1536, 1024])[1]

    passes = 0
    fails  = 0
    warns  = 0

    def passed(msg):
        nonlocal passes
        passes += 1
        print(f"  PASS  {msg}")

    def failed(msg):
        nonlocal fails
        fails += 1
        print(f"  FAIL  {msg}")

    def warned(msg):
        nonlocal warns
        warns += 1
        print(f"  WARN  {msg}")

    # ── Wall checks ─────────────────────────────────────────
    print("\n  --- Walls ---")

    total_walls = len(walls)
    if exp["min_walls"] <= total_walls <= exp["max_walls"]:
        passed(f"Wall count: {total_walls}")
    elif total_walls < exp["min_walls"]:
        failed(f"Too few walls: {total_walls} (expected at least {exp['min_walls']})")
    else:
        warned(f"Many walls: {total_walls} — may include noise")

    # Check load bearing walls exist
    lb_walls = [w for w in walls if w["wall_type"] == "load_bearing"]
    if len(lb_walls) >= exp["min_load_bearing"]:
        passed(f"Load-bearing walls: {len(lb_walls)}")
    else:
        failed(f"Too few load-bearing walls: {len(lb_walls)} "
               f"(expected at least {exp['min_load_bearing']})")

    # Check wall lengths are realistic
    bad_length = []
    for i, wall in enumerate(walls):
        l = wall.get("length_m", 0)
        if l < exp["min_wall_length_m"] or l > exp["max_wall_length_m"]:
            bad_length.append((i, l))

    if not bad_length:
        passed("All wall lengths are realistic")
    else:
        warned(f"{len(bad_length)} walls have unusual lengths:")
        for idx, length in bad_length[:3]:
            print(f"        Wall {idx}: {length}m")

    # Check wall coordinates are inside image
    out_of_bounds = []
    for i, wall in enumerate(walls):
        if not (0 <= wall["x1"] <= img_w and 0 <= wall["x2"] <= img_w and
                0 <= wall["y1"] <= img_h and 0 <= wall["y2"] <= img_h):
            out_of_bounds.append(i)

    if not out_of_bounds:
        passed("All wall coordinates inside image bounds")
    else:
        failed(f"{len(out_of_bounds)} walls outside image bounds")

    # Check orientation coverage
    h_walls = [w for w in walls if w.get("orientation") == "horizontal"]
    v_walls = [w for w in walls if w.get("orientation") == "vertical"]
    if len(h_walls) > 0 and len(v_walls) > 0:
        passed(f"Orientation coverage: {len(h_walls)} horizontal, "
               f"{len(v_walls)} vertical")
    else:
        warned(f"Only one orientation detected — "
               f"H:{len(h_walls)} V:{len(v_walls)}")

    # Check no duplicate walls
    seen = []
    dupes = 0
    for wall in walls:
        key = (wall["x1"], wall["y1"], wall["x2"], wall["y2"])
        if key in seen:
            dupes += 1
        else:
            seen.append(key)
    if dupes == 0:
        passed("No duplicate walls in JSON")
    else:
        warned(f"{dupes} duplicate wall entries found")

    # ── Room checks ─────────────────────────────────────────
    print("\n  --- Rooms ---")

    total_rooms = len(rooms)
    if exp["min_rooms"] <= total_rooms <= exp["max_rooms"]:
        passed(f"Room count: {total_rooms}")
    elif total_rooms < exp["min_rooms"]:
        failed(f"Too few rooms: {total_rooms} "
               f"(expected at least {exp['min_rooms']})")
    else:
        warned(f"Many rooms: {total_rooms} — may include noise")

    # Check room areas
    tiny_rooms  = []
    giant_rooms = []
    for room in rooms:
        area = room.get("area_m2", 0)
        if area < exp["min_room_area_m2"]:
            tiny_rooms.append((room["label"], area))
        elif area > exp["max_room_area_m2"]:
            giant_rooms.append((room["label"], area))

    if not tiny_rooms and not giant_rooms:
        passed("All room areas are realistic")
    if tiny_rooms:
        warned(f"{len(tiny_rooms)} rooms suspiciously small:")
        for label, area in tiny_rooms:
            print(f"        {label}: {area} m²")
    if giant_rooms:
        warned(f"{len(giant_rooms)} rooms suspiciously large:")
        for label, area in giant_rooms:
            print(f"        {label}: {area} m²")

    # Check room centroids inside image
    bad_centroids = []
    for room in rooms:
        cx, cy = room["centroid_px"]
        if not (0 <= cx <= img_w and 0 <= cy <= img_h):
            bad_centroids.append(room["label"])
    if not bad_centroids:
        passed("All room centroids inside image bounds")
    else:
        failed(f"Centroids outside bounds: {bad_centroids}")

    # Check room labels are unique
    labels = [r["label"] for r in rooms]
    if len(labels) == len(set(labels)):
        passed("All room labels are unique")
    else:
        warned("Duplicate room labels found — two rooms have same name")

    # Check polygon points exist
    missing_poly = [r["label"] for r in rooms
                    if not r.get("polygon_px")]
    if not missing_poly:
        passed("All rooms have polygon coordinates")
    else:
        failed(f"Missing polygons: {missing_poly}")

    # ── Opening checks ───────────────────────────────────────
    print("\n  --- Openings ---")

    total_openings = len(openings)
    if total_openings >= exp["min_openings"]:
        passed(f"Opening count: {total_openings} "
               f"({summary.get('doors',0)} doors, "
               f"{summary.get('windows',0)} windows)")
    else:
        warned(f"Only {total_openings} openings detected "
               f"(expected at least {exp['min_openings']}) — "
               f"may affect Stage 5 explainability score")

    # Check opening coordinates
    bad_openings = []
    for i, op in enumerate(openings):
        sx, sy = op["start_px"]
        ex, ey = op["end_px"]
        if not (0 <= sx <= img_w and 0 <= ex <= img_w and
                0 <= sy <= img_h and 0 <= ey <= img_h):
            bad_openings.append(i)
    if not bad_openings:
        passed("All opening coordinates inside image bounds")
    else:
        failed(f"{len(bad_openings)} openings outside image bounds")

    # Check opening widths are realistic
    bad_widths = [o for o in openings
                  if o.get("width_m", 0) < 0.3 or
                  o.get("width_m", 0) > 3.0]
    if not bad_widths:
        passed("All opening widths are realistic (0.3m – 3.0m)")
    else:
        warned(f"{len(bad_widths)} openings have unusual widths")

    # ── Metadata checks ──────────────────────────────────────
    print("\n  --- Metadata ---")

    if metadata.get("scale_px_per_m", 0) > 0:
        passed(f"Scale: {metadata['scale_px_per_m']} px/m")
    else:
        failed("Scale is 0 or missing")

    if metadata.get("floor_height_m", 0) > 0:
        passed(f"Floor height: {metadata['floor_height_m']}m")
    else:
        failed("Floor height is 0 or missing")

    if not metadata.get("fallback_used", True):
        passed("Fallback not used — full CV pipeline ran")
    else:
        warned("Fallback used — manual coordinates in JSON")

    # ── Summary ──────────────────────────────────────────────
    print(f"\n  {'─'*45}")
    print(f"  RESULT: {passes} passed  |  "
          f"{warns} warnings  |  {fails} failed")

    if fails == 0 and warns <= 2:
        print(f"  STATUS: READY to hand off to Person B and C")
    elif fails == 0:
        print(f"  STATUS: ACCEPTABLE — minor issues but handoff is fine")
    else:
        print(f"  STATUS: NEEDS FIXING before handoff")


# ── Run checks on all 3 plans ────────────────────────────────
print("\n" + "="*55)
print("  JSON ACCURACY CHECK — All 3 Plans")
print("="*55)

for plan_name, json_path in plans.items():
    check_plan(plan_name, json_path, expected[plan_name])

print(f"\n{'='*55}")
print("  CHECK COMPLETE")
print(f"{'='*55}")
print("""
Quick fix guide:
  Too few walls     → lower threshold in detect_walls()
  Too many walls    → raise threshold or minLineLength
  Too few rooms     → lower min_area in detect_rooms()
  Too many rooms    → raise min_area or tighten polygon filter
  0 openings        → lower gap range in detect_openings()
  Wall length >20m  → increase SCALE_PX_PER_M
  Wall length <0.5m → decrease SCALE_PX_PER_M
""")