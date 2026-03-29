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
BASE_DIR = r"C:\Users\kanha\OneDrive\Desktop\prompt-thon\wall-wise\stage1_parser"

FLOOR_HEIGHT_M = 3.0    # standard floor height in metres
SCALE_PX_PER_M = 100    # pixels per metre
# ────────────────────────────────────────────────────────────


def load_and_preprocess(image_path):
    """
    Load the floor plan image and convert it to a clean binary image.
    Order: Load -> Grayscale -> Blur (Noise Removal) -> Threshold (B&W) -> Closing
    """
    img = cv2.imread(image_path)

    if img is None:
        raise FileNotFoundError(
            f"\n[ERROR] Could not load image from: {image_path}"
            f"\nMake sure the file exists and the path is correct."
            f"\nCurrent working directory: {os.getcwd()}"
        )

    print(f"  Image loaded: {img.shape[1]}px wide x {img.shape[0]}px tall")

    # Step A — Convert colour to grayscale (REQUIRED FIRST)
    # This creates the 'gray' variable so the computer knows what it is.
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Step B — Median Blur 
    # This 'smudges' out thin lines like text and furniture while keeping thick walls.
    # We use the 'gray' variable we just created above.
    gray = cv2.medianBlur(gray, 5)

    # Step C — Adaptive threshold: converts grayscale to pure black/white
    # THRESH_BINARY_INV flips it so walls become white (255) and background black (0).
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=15,
        C=4
    )

    # Step D — Morphological closing: fills tiny gaps in wall lines
    # Using a 5x5 kernel makes the walls "solid" so the line detector doesn't skip.
    kernel = np.ones((5, 5), np.uint8)
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
    # Try these new settings in detect_walls:
    lines = cv2.HoughLinesP(
        binary_img,
        rho=1,
        theta=np.pi / 180,
        threshold = 80,      # CHANGE: Lowered from 120 to 80 to catch more lines
        minLineLength = 130,   
        maxLineGap = 5        # CHANGE: Increased from 2 to 5 to bridge small gaps
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

def remove_duplicate_walls(segments, proximity=10):
    """
    Remove near-identical wall segments detected multiple times.
    Two walls are duplicates if both endpoints are within
    'proximity' pixels of each other.
    """
    unique = []
    for seg in segments:
        is_duplicate = False
        for existing in unique:
            # Check if both endpoints are very close
            start_close = (
                abs(seg["x1"] - existing["x1"]) < proximity and
                abs(seg["y1"] - existing["y1"]) < proximity
            )
            end_close = (
                abs(seg["x2"] - existing["x2"]) < proximity and
                abs(seg["y2"] - existing["y2"]) < proximity
            )
            # Also check reversed direction
            start_close_rev = (
                abs(seg["x1"] - existing["x2"]) < proximity and
                abs(seg["y1"] - existing["y2"]) < proximity
            )
            end_close_rev = (
                abs(seg["x2"] - existing["x1"]) < proximity and
                abs(seg["y2"] - existing["y1"]) < proximity
            )
            if (start_close and end_close) or (start_close_rev and end_close_rev):
                is_duplicate = True
                break
        if not is_duplicate:
            unique.append(seg)

    return unique

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
    """
    h, w = binary_img.shape
    # CHANGE: Lowered from 0.03 to 0.01 to catch smaller rooms in Plan B/C
    min_area = h * w * 0.01    
    max_area = h * w * 0.25    

    kernel  = np.ones((3, 3), np.uint8)
    dilated = cv2.dilate(binary_img, kernel, iterations=1)

    contours, _ = cv2.findContours(
        dilated, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE
    )

    # CHANGE: Using generic labels to avoid "Random Bedroom" naming errors
    room_labels = [f"Room_Area_{i+1}" for i in range(30)]

    rooms     = []
    label_idx = 0

    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue

        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx  = cv2.approxPolyDP(contour, epsilon, True)

        # Skip contours with too many points — real rooms are simple polygons
        if len(approx) > 10:
            continue

        x, y, rw, rh = cv2.boundingRect(contour)

        # Skip contours whose bounding box spans too much of the image
        if rw > w * 0.40 or rh > h * 0.40:
            continue

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
    Detect doors and windows by finding gaps between wall segments.
    For high-resolution images, checks gaps between wall endpoints.
    """
    openings = []

    # Group walls by orientation
    horizontal = [wall for wall in walls if wall.get("orientation") == "horizontal"]
    vertical   = [wall for wall in walls if wall.get("orientation") == "vertical"]

    def check_gap_between(w1, w2, orientation):
        """Check if there is a gap between two parallel wall segments."""
        if orientation == "horizontal":
            if abs(w1["y1"] - w2["y1"]) > 20:
                return None
            x1_end   = max(w1["x1"], w1["x2"])
            x2_start = min(w2["x1"], w2["x2"])
            gap = x2_start - x1_end
            if 15 < gap < 150:
                mid_y = (w1["y1"] + w2["y1"]) // 2
                opening_type = "door" if gap < 70 else "window"
                return {
                    "type"      : opening_type,
                    "start_px"  : [x1_end, mid_y],
                    "end_px"    : [x2_start, mid_y],
                    "width_m"   : round(gap / SCALE_PX_PER_M, 2),
                    "wall_index": -1
                }

        elif orientation == "vertical":
            if abs(w1["x1"] - w2["x1"]) > 20:
                return None
            y1_end   = max(w1["y1"], w1["y2"])
            y2_start = min(w2["y1"], w2["y2"])
            gap = y2_start - y1_end
            if 15 < gap < 150:
                mid_x = (w1["x1"] + w2["x1"]) // 2
                opening_type = "door" if gap < 70 else "window"
                return {
                    "type"      : opening_type,
                    "start_px"  : [mid_x, y1_end],
                    "end_px"    : [mid_x, y2_start],
                    "width_m"   : round(gap / SCALE_PX_PER_M, 2),
                    "wall_index": -1
                }

        return None

    # Check all pairs of horizontal walls for gaps
    for i in range(len(horizontal)):
        for j in range(i + 1, len(horizontal)):
            result = check_gap_between(
                horizontal[i], horizontal[j], "horizontal"
            )
            if result:
                openings.append(result)

    # Check all pairs of vertical walls for gaps
    for i in range(len(vertical)):
        for j in range(i + 1, len(vertical)):
            result = check_gap_between(
                vertical[i], vertical[j], "vertical"
            )
            if result:
                openings.append(result)

    # Remove duplicate openings at the same location
    unique = []
    for op in openings:
        is_dup = False
        for existing in unique:
            if (abs(op["start_px"][0] - existing["start_px"][0]) < 20 and
                abs(op["start_px"][1] - existing["start_px"][1]) < 20):
                is_dup = True
                break
        if not is_dup:
            unique.append(op)

    return unique


def visualise_results(original_img, walls, rooms, openings, output_path, plan_name):
    """
    Saves the overlay image for each plan.
    All plans are shown together at the end by show_all_results().
    """
    vis = original_img.copy()

    # Draw walls
    for wall in walls:
        color = (0, 0, 255) if wall["wall_type"] == "load_bearing" else (0, 165, 255)
        cv2.line(vis,
                 (wall["x1"], wall["y1"]),
                 (wall["x2"], wall["y2"]),
                 color, 2)

    # Draw room centroids and labels
    for room in rooms:
        cx, cy = room["centroid_px"]
        cv2.circle(vis, (cx, cy), 8, (0, 200, 0), -1)
        cv2.putText(vis, room["label"][:10],
                    (cx - 20, cy - 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 140, 0), 1)

    # Draw openings
    for opening in openings:
        color = (255, 0, 255) if opening["type"] == "door" else (0, 255, 255)
        cv2.line(vis,
                 tuple(opening["start_px"]),
                 tuple(opening["end_px"]),
                 color, 3)

    # Save the overlay image to disk
    save_path = os.path.join(
        os.path.dirname(output_path), f"{plan_name}_overlay.png"
    )
    cv2.imwrite(save_path, vis)
    print(f"  Overlay saved: {save_path}")

    # Return both images so show_all_results() can display them
    return original_img, vis, plan_name

def show_all_results(all_results):
    """
    Shows all plans side by side in one single window.
    all_results is a list of (original_img, overlay_img, plan_name) tuples.
    """
    num_plans = len(all_results)
    if num_plans == 0:
        return

    # 2 columns per plan (original + overlay), num_plans rows
    fig, axes = plt.subplots(num_plans, 2, figsize=(20, 7 * num_plans))

    # Handle case where only 1 plan was processed
    if num_plans == 1:
        axes = [axes]

    for row, (original, overlay, plan_name) in enumerate(all_results):
        axes[row][0].imshow(cv2.cvtColor(original, cv2.COLOR_BGR2RGB))
        axes[row][0].set_title(f"{plan_name} — Original", fontsize=12)
        axes[row][0].axis("off")

        axes[row][1].imshow(cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB))
        axes[row][1].set_title(
            f"{plan_name} — Parser output\n"
            "Red=load-bearing  Orange=partition  "
            "Green=rooms  Magenta=doors  Yellow=windows",
            fontsize=10
        )
        axes[row][1].axis("off")

    plt.suptitle(
        "Stage 1 — Floor Plan Parser Results (All Plans)",
        fontsize=14, y=1.01
    )
    plt.tight_layout()

    # Save the combined view
    combined_path = os.path.join(
        os.path.dirname(
            all_results[0][0].tobytes and
            r"C:\Users\kanha\OneDrive\Desktop\prompt-thon\wall-wise\stage1_parser\outputs\all_plans_combined.png"
        )
    )
    plt.savefig(
        r"C:\Users\kanha\OneDrive\Desktop\prompt-thon\wall-wise\stage1_parser\outputs\all_plans_combined.png",
        dpi=120, bbox_inches="tight"
    )
    print("\n  Combined view saved to: outputs/all_plans_combined.png")
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

    print("\nStep 3b: Removing duplicate walls...")
    snapped_walls = remove_duplicate_walls(snapped_walls, proximity=10)
    print(f"  After deduplication: {len(snapped_walls)} walls")

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

    print("\nStep 9: Generating overlay image...")
    result = visualise_results(original, walls, rooms, openings, output_path,
                               os.path.basename(image_path).replace(".png", ""))

    print(f"\n{'='*50}")
    print("DONE — Stage 1 complete")
    print(f"{'='*50}\n")

    return output, result


# ── ENTRY POINT ───────────────────────────────────────────────
if __name__ == "__main__":
    plans = [
        (
            os.path.join(BASE_DIR, "sample_inputs", "plan_a.png"),
            os.path.join(BASE_DIR, "outputs", "plan_a_data.json")
        ),
        (
            os.path.join(BASE_DIR, "sample_inputs", "plan_b.png"),
            os.path.join(BASE_DIR, "outputs", "plan_b_data.json")
        ),
        (
            os.path.join(BASE_DIR, "sample_inputs", "plan_c.png"),
            os.path.join(BASE_DIR, "outputs", "plan_c_data.json")
        ),
    ]

    all_results = []   # collect results from all plans

    for image_path, output_path in plans:
        if os.path.exists(image_path):
            output, result = run_parser(image_path, output_path)
            all_results.append(result)
        else:
            print(f"\nSKIPPED — image not found: {image_path}")

    # Show all 3 plans together in one window at the very end
    print("\nShowing all plans in combined view...")
    show_all_results(all_results)