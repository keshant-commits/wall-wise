# ============================================================
# Stage 1: Floor Plan Parser
# Autonomous Structural Intelligence System — Hackathon 2026
# ============================================================

import cv2
import numpy as np
import json
import matplotlib.pyplot as plt
import math
import os
from shapely.geometry import Polygon

# ── CONFIG — change these paths to match your files ─────────
IMAGE_PATH  = "sample_inputs/plan_b.png"
OUTPUT_PATH = "outputs/floor_plan_data.json"

FLOOR_HEIGHT_M  = 3.0    # standard floor height in metres
SCALE_PX_PER_M  = 50     # pixels per metre (adjust based on scale bar)
# ────────────────────────────────────────────────────────────


def load_and_preprocess(image_path):
    """
    Load the floor plan image and convert it to a clean binary image.
    Binary = every pixel is either 255 (wall) or 0 (background).
    """
    img = cv2.imread(image_path)

    if img is None:
        raise FileNotFoundError(
            f"\n[ERROR] Could not load image from: {image_path}"
            f"\nMake sure the file exists and the path is correct."
            f"\nCurrent working directory: {os.getcwd()}"
        )

    print(f"  Image loaded: {img.shape[1]}px wide x {img.shape[0]}px tall")

    # Step A — convert colour (BGR) to grayscale
    # Each pixel goes from 3 values (B,G,R) to 1 value (brightness 0–255)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Step B — adaptive threshold: converts grayscale to pure black/white
    # THRESH_BINARY_INV flips it so dark walls become white (255)
    # blockSize=15 means each 15x15 region gets its own threshold
    # C=4 subtracts a constant to reduce noise — increase if too noisy
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=15,
        C=4
    )

    # Step C — morphological closing: fills tiny gaps in wall lines
    # Increase kernel to (5,5) or (7,7) if walls appear broken
    kernel = np.ones((3, 3), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    return img, gray, cleaned


def detect_walls(binary_img):
    """
    Use HoughLinesP to find straight line segments (walls).
    Returns a list of raw line segments as (x1,y1) -> (x2,y2).

    Tuning tips:
      threshold   — increase (100,120) to get fewer lines, decrease (50,60) for more
      minLineLength — increase (60,80) to ignore short text/furniture lines
      maxLineGap  — increase (20,30) to connect broken wall segments
    """
    lines = cv2.HoughLinesP(
        binary_img,
        rho=1,
        theta=np.pi / 180,
        threshold=80,
        minLineLength=40,
        maxLineGap=10
    )

    if lines is None:
        print("  [WARNING] No wall lines detected — try lowering threshold to 50")
        return []

    segments = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        segments.append({
            "x1": int(x1), "y1": int(y1),
            "x2": int(x2), "y2": int(y2)
        })

    return segments


def snap_to_orthogonal(segments, tolerance=8):
    """
    Snap nearly-horizontal and nearly-vertical lines to perfectly straight.

    Why this matters: if a wall is detected at a 2-degree angle instead of 0,
    the 3D model will have tiny gaps between walls — floating walls.
    This function corrects those slight deviations.

    tolerance — how many pixels of deviation is allowed before snapping (default 8)
    """
    snapped = []
    for seg in segments:
        x1, y1 = seg["x1"], seg["y1"]
        x2, y2 = seg["x2"], seg["y2"]
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)

        if dy <= tolerance and dx > dy:
            # Nearly horizontal — snap both y values to their average
            mid_y = (y1 + y2) // 2
            snapped.append({
                "x1": x1, "y1": mid_y,
                "x2": x2, "y2": mid_y,
                "orientation": "horizontal"
            })

        elif dx <= tolerance and dy > dx:
            # Nearly vertical — snap both x values to their average
            mid_x = (x1 + x2) // 2
            snapped.append({
                "x1": mid_x, "y1": y1,
                "x2": mid_x, "y2": y2,
                "orientation": "vertical"
            })

        else:
            # Diagonal — keep as-is (needed for Plan C L-shape)
            snapped.append({
                "x1": x1, "y1": y1,
                "x2": x2, "y2": y2,
                "orientation": "diagonal"
            })

    return snapped


def classify_walls(segments, img_shape):
    """
    Classify each wall as 'load_bearing' or 'partition'.

    Rules used:
      - Walls near the image border = outer walls = load_bearing
      - Long walls (>25% of image size) = likely structural = load_bearing
      - Everything else = partition

    This classification feeds directly into Stage 4 material recommendations.
    """
    h, w = img_shape[:2]
    border_margin = 0.15  # within 15% of image edge = outer wall

    classified = []
    for seg in segments:
        x1, y1 = seg["x1"], seg["y1"]
        x2, y2 = seg["x2"], seg["y2"]

        length_px = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        length_m  = round(length_px / SCALE_PX_PER_M, 2)

        near_border = (
            min(x1, x2) < w * border_margin or
            max(x1, x2) > w * (1 - border_margin) or
            min(y1, y2) < h * border_margin or
            max(y1, y2) > h * (1 - border_margin)
        )
        is_long = length_px > min(h, w) * 0.25

        wall_type = "load_bearing" if (near_border or is_long) else "partition"

        classified.append({
            **seg,
            "length_px"  : round(length_px, 1),
            "length_m"   : length_m,
            "wall_type"  : wall_type
        })

    return classified


def detect_rooms(binary_img):
    """
    Use contour detection to find enclosed room regions.

    How it works:
      - Dilate the binary image to close small wall gaps
      - findContours finds all closed shapes
      - Filter by area to remove noise and the whole-image border
      - Each valid contour = one room
    """
    h, w = binary_img.shape
    min_area = h * w * 0.005   # ignore tiny blobs
    max_area = h * w * 0.90    # ignore the full image border

    # Dilate to close gaps between walls
    kernel = np.ones((5, 5), np.uint8)
    dilated = cv2.dilate(binary_img, kernel, iterations=2)

    contours, _ = cv2.findContours(
        dilated, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE
    )

    room_labels = [
        "living_room", "bedroom_1", "bedroom_2", "bedroom_3", "bedroom_4",
        "bathroom_1", "bathroom_2", "bathroom_3",
        "kitchen", "dining", "foyer", "laundry", "hallway"
    ]

    rooms = []
    label_idx = 0

    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue

        # Simplify contour to polygon
        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx  = cv2.approxPolyDP(contour, epsilon, True)

        # Bounding box
        x, y, rw, rh = cv2.boundingRect(contour)

        # Centroid
        M = cv2.moments(contour)
        if M["m00"] != 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
        else:
            cx, cy = x + rw // 2, y + rh // 2

        area_m2 = round(area / (SCALE_PX_PER_M ** 2), 2)
        label   = room_labels[label_idx % len(room_labels)]
        label_idx += 1

        rooms.append({
            "label"          : label,
            "centroid_px"    : [cx, cy],
            "bounding_box_px": [x, y, rw, rh],
            "area_m2"        : area_m2,
            "polygon_px"     : approx.reshape(-1, 2).tolist()
        })

    return rooms


def detect_openings(binary_img, walls):
    """
    Detect doors and windows as gaps in wall lines.

    How it works:
      - Walk along each detected wall pixel by pixel
      - If we hit an empty region (gap), record its start
      - When the gap ends, measure its width
      - Short gaps = doors, longer gaps = windows
    """
    openings = []

    for i, wall in enumerate(walls):
        x1, y1 = wall["x1"], wall["y1"]
        x2, y2 = wall["x2"], wall["y2"]
        length  = wall["length_px"]

        steps     = max(int(length / 8), 2)
        gap_start = None

        for step in range(steps):
            t  = step / steps
            px = int(x1 + t * (x2 - x1))
            py = int(y1 + t * (y2 - y1))

            # Clamp to image bounds
            px = max(0, min(px, binary_img.shape[1] - 1))
            py = max(0, min(py, binary_img.shape[0] - 1))

            pixel_val = binary_img[py, px]

            if pixel_val < 128:  # gap (background)
                if gap_start is None:
                    gap_start = (px, py)
            else:
                if gap_start is not None:
                    gap_end    = (px, py)
                    gap_length = math.sqrt(
                        (gap_end[0] - gap_start[0]) ** 2 +
                        (gap_end[1] - gap_start[1]) ** 2
                    )
                    if 15 < gap_length < 100:
                        opening_type = "door" if gap_length < 60 else "window"
                        openings.append({
                            "type"      : opening_type,
                            "start_px"  : list(gap_start),
                            "end_px"    : list(gap_end),
                            "width_m"   : round(gap_length / SCALE_PX_PER_M, 2),
                            "wall_index": i
                        })
                    gap_start = None

    return openings


def visualise_results(original_img, walls, rooms, openings):
    """
    Draw all detected elements on the image and show it.
    This is your main tool for checking if the parser worked correctly.

    Colours:
      Red lines    = load-bearing walls
      Orange lines = partition walls
      Green dots   = room centroids
      Magenta      = doors
      Yellow       = windows
    """
    vis = original_img.copy()

    # Draw walls
    for wall in walls:
        color = (0, 0, 255) if wall["wall_type"] == "load_bearing" else (0, 165, 255)
        pt1   = (wall["x1"], wall["y1"])
        pt2   = (wall["x2"], wall["y2"])
        cv2.line(vis, pt1, pt2, color, 2)

    # Draw rooms
    for room in rooms:
        cx, cy = room["centroid_px"]
        cv2.circle(vis, (cx, cy), 6, (0, 200, 0), -1)
        cv2.putText(
            vis, room["label"][:10],
            (cx - 20, cy - 12),
            cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 150, 0), 1
        )

    # Draw openings
    for opening in openings:
        color = (255, 0, 255) if opening["type"] == "door" else (0, 255, 255)
        cv2.line(vis, tuple(opening["start_px"]), tuple(opening["end_px"]), color, 3)

    # Show in matplotlib window
    plt.figure(figsize=(14, 10))
    plt.imshow(cv2.cvtColor(vis, cv2.COLOR_BGR2RGB))
    plt.title(
        "Red = load-bearing  |  Orange = partition  |  "
        "Green = rooms  |  Magenta = doors  |  Yellow = windows"
    )
    plt.axis("off")
    plt.tight_layout()
    plt.show()


def build_output_json(walls, rooms, openings, image_path, img_shape):
    """
    Package everything into a clean JSON structure.
    This is what Person B (3D model) and Person C (materials) will read.
    """
    return {
        "metadata": {
            "source_image"   : image_path,
            "image_size_px"  : [img_shape[1], img_shape[0]],
            "scale_px_per_m" : SCALE_PX_PER_M,
            "floor_height_m" : FLOOR_HEIGHT_M,
            "parser_version" : "1.0",
            "fallback_used"  : False
        },
        "walls"   : walls,
        "rooms"   : rooms,
        "openings": openings,
        "summary" : {
            "total_walls"       : len(walls),
            "load_bearing_walls": sum(1 for w in walls if w["wall_type"] == "load_bearing"),
            "partition_walls"   : sum(1 for w in walls if w["wall_type"] == "partition"),
            "total_rooms"       : len(rooms),
            "total_openings"    : len(openings),
            "doors"             : sum(1 for o in openings if o["type"] == "door"),
            "windows"           : sum(1 for o in openings if o["type"] == "window"),
        }
    }


def validate_output(data):
    """
    Quick check that the JSON has all required fields.
    Run this before handing off to Person B and C.
    """
    errors = []

    for key in ["metadata", "walls", "rooms", "openings", "summary"]:
        if key not in data:
            errors.append(f"Missing top-level key: '{key}'")

    for i, wall in enumerate(data.get("walls", [])):
        for field in ["x1", "y1", "x2", "y2", "wall_type", "length_m"]:
            if field not in wall:
                errors.append(f"Wall {i} missing field: '{field}'")

    for i, room in enumerate(data.get("rooms", [])):
        for field in ["label", "centroid_px", "area_m2"]:
            if field not in room:
                errors.append(f"Room {i} missing field: '{field}'")

    if errors:
        print("\n[VALIDATION FAILED]")
        for e in errors:
            print(f"  - {e}")
    else:
        print("\n[VALIDATION PASSED] JSON is ready for Person B and C")

    return len(errors) == 0


# ── MAIN ─────────────────────────────────────────────────────
def run_parser(image_path, output_path):

    print(f"\n{'='*50}")
    print(f"Floor Plan Parser — {image_path}")
    print(f"{'='*50}")

    # Make sure output folder exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print("\nStep 1: Loading and preprocessing...")
    original, gray, binary = load_and_preprocess(image_path)

    print("\nStep 2: Detecting walls...")
    raw_walls = detect_walls(binary)
    print(f"  Raw segments found: {len(raw_walls)}")

    print("\nStep 3: Snapping to orthogonal grid...")
    snapped_walls = snap_to_orthogonal(raw_walls)

    print("\nStep 4: Classifying walls...")
    walls = classify_walls(snapped_walls, original.shape)
    lb = sum(1 for w in walls if w["wall_type"] == "load_bearing")
    pt = sum(1 for w in walls if w["wall_type"] == "partition")
    print(f"  Load-bearing: {lb}  |  Partition: {pt}")

    print("\nStep 5: Detecting rooms...")
    rooms = detect_rooms(binary)
    print(f"  Rooms found: {len(rooms)}")

    print("\nStep 6: Detecting openings...")
    openings = detect_openings(binary, walls)
    doors   = sum(1 for o in openings if o["type"] == "door")
    windows = sum(1 for o in openings if o["type"] == "window")
    print(f"  Doors: {doors}  |  Windows: {windows}")

    print("\nStep 7: Building and saving JSON...")
    output = build_output_json(walls, rooms, openings, image_path, original.shape)

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Saved: {output_path}")

    print("\nStep 8: Validating output...")
    validate_output(output)

    print("\nStep 9: Showing debug visualisation...")
    print("  (Close the image window to finish the program)")
    visualise_results(original, walls, rooms, openings)

    print(f"\n{'='*50}")
    print("DONE — Stage 1 complete")
    print(f"{'='*50}\n")

    return output


# ── ENTRY POINT ───────────────────────────────────────────────
if __name__ == "__main__":
    run_parser(IMAGE_PATH, OUTPUT_PATH)