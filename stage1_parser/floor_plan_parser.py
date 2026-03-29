# ============================================================
# Stage 1: Floor Plan Parser + Auto Reconstructor
# Autonomous Structural Intelligence System — Hackathon 2026
# Supports: PNG, JPG, PDF, BMP (Paint/Paint3D files)
# ============================================================

import cv2
import numpy as np
import json
import matplotlib.pyplot as plt
import math
import os

# ── CONFIG ───────────────────────────────────────────────────
BASE_DIR       = r"C:\Users\kanha\OneDrive\Desktop\prompt-thon\wall-wise\stage1_parser"
FLOOR_HEIGHT_M = 3.0
SCALE_PX_PER_M = 100

# ── CANVAS SETTINGS FOR RECONSTRUCTION ───────────────────────
CANVAS_W  = 1000
CANVAS_H  = 800
PADDING   = 80

# ── COLOURS (BGR) ────────────────────────────────────────────
WHITE      = (255, 255, 255)
BLACK      = (15,  15,  15)
DARK_GRAY  = (60,  60,  60)
MID_GRAY   = (120, 120, 120)
DIM_COLOR  = (150, 150, 150)
AREA_COLOR = (170, 170, 170)
# ─────────────────────────────────────────────────────────────


# ╔══════════════════════════════════════════════════════════╗
# ║  SECTION 1 — FILE LOADING (supports multiple formats)   ║
# ╚══════════════════════════════════════════════════════════╝

def load_image_from_file(file_path):
    """
    Load image from any supported format:
    PNG, JPG, BMP (Paint/Paint3D), PDF (first page)
    Returns a BGR numpy array ready for OpenCV.
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return load_from_pdf(file_path)
    else:
        # PNG, JPG, BMP, GIF — all handled by OpenCV directly
        img = cv2.imread(file_path)
        if img is None:
            raise FileNotFoundError(
                f"\n[ERROR] Could not load: {file_path}"
                f"\nCheck the file exists and is not corrupted."
                f"\nWorking directory: {os.getcwd()}"
            )
        return img


def load_from_pdf(pdf_path):
    """
    Convert first page of PDF to image.
    Requires: pip install pdf2image poppler
    """
    try:
        from pdf2image import convert_from_path
        pages = convert_from_path(pdf_path, dpi=200)
        if not pages:
            raise ValueError("PDF has no pages")
        # Convert PIL image to OpenCV BGR
        first_page = pages[0]
        img_array  = np.array(first_page)
        return cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    except ImportError:
        raise ImportError(
            "\n[ERROR] PDF support requires: pip install pdf2image"
            "\nAlso install poppler:"
            "\n  Windows: download from https://github.com/oschwartz10612/poppler-windows"
            "\n  Then add poppler/bin to your PATH"
        )


# ╔══════════════════════════════════════════════════════════╗
# ║  SECTION 2 — PARSING (image → coordinates)              ║
# ╚══════════════════════════════════════════════════════════╝

def load_and_preprocess(img):
    """
    Convert loaded image to clean binary.
    Accepts the image array directly (already loaded).
    """
    print(f"  Image size: {img.shape[1]}px wide x {img.shape[0]}px tall")

    gray   = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray   = cv2.medianBlur(gray, 5)

    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=15,
        C=4
    )

    kernel  = np.ones((5, 5), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    return cleaned


def detect_walls(binary_img):
    lines = cv2.HoughLinesP(
        binary_img,
        rho=1,
        theta=np.pi / 180,
        threshold=80,
        minLineLength=130,
        maxLineGap=5
    )
    if lines is None:
        print("  [WARNING] No walls detected")
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
    snapped = []
    for seg in segments:
        x1, y1 = seg["x1"], seg["y1"]
        x2, y2 = seg["x2"], seg["y2"]
        dx, dy  = abs(x2 - x1), abs(y2 - y1)

        if dy <= tolerance and dx > dy:
            mid_y = (y1 + y2) // 2
            snapped.append({"x1": x1, "y1": mid_y,
                             "x2": x2, "y2": mid_y,
                             "orientation": "horizontal"})
        elif dx <= tolerance and dy > dx:
            mid_x = (x1 + x2) // 2
            snapped.append({"x1": mid_x, "y1": y1,
                             "x2": mid_x, "y2": y2,
                             "orientation": "vertical"})
        else:
            snapped.append({"x1": x1, "y1": y1,
                             "x2": x2, "y2": y2,
                             "orientation": "diagonal"})
    return snapped


def remove_duplicate_walls(segments, proximity=10):
    unique = []
    for seg in segments:
        is_dup = False
        for existing in unique:
            sc = (abs(seg["x1"]-existing["x1"]) < proximity and
                  abs(seg["y1"]-existing["y1"]) < proximity)
            ec = (abs(seg["x2"]-existing["x2"]) < proximity and
                  abs(seg["y2"]-existing["y2"]) < proximity)
            scr = (abs(seg["x1"]-existing["x2"]) < proximity and
                   abs(seg["y1"]-existing["y2"]) < proximity)
            ecr = (abs(seg["x2"]-existing["x1"]) < proximity and
                   abs(seg["y2"]-existing["y1"]) < proximity)
            if (sc and ec) or (scr and ecr):
                is_dup = True
                break
        if not is_dup:
            unique.append(seg)
    return unique

def anchor_corners(segments, anchor_dist=15):
    """
    Finds endpoints that are very close to each other and 'snaps' them 
    to the exact same coordinate. Essential for 3D manifold mesh generation.
    """
    for i in range(len(segments)):
        for j in range(len(segments)):
            if i == j: continue
            
            # Check all 4 endpoint combinations
            pts_i = [('x1', 'y1'), ('x2', 'y2')]
            pts_j = [('x1', 'y1'), ('x2', 'y2')]
            
            for p1 in pts_i:
                for p2 in pts_j:
                    dist = math.sqrt((segments[i][p1[0]] - segments[j][p2[0]])**2 + 
                                     (segments[i][p1[1]] - segments[j][p2[1]])**2)
                    
                    if 0 < dist < anchor_dist:
                        # Snap segment j's point to segment i's point
                        segments[j][p2[0]] = segments[i][p1[0]]
                        segments[j][p2[1]] = segments[i][p1[1]]
    return segments

def classify_walls(segments, img_shape):
    h, w = img_shape[:2]
    border_margin = 0.15
    classified = []
    for seg in segments:
        x1, y1 = seg["x1"], seg["y1"]
        x2, y2 = seg["x2"], seg["y2"]
        length_px = math.sqrt((x2-x1)**2 + (y2-y1)**2)
        length_m  = round(length_px / SCALE_PX_PER_M, 2)
        near_border = (
            min(x1,x2) < w * border_margin or
            max(x1,x2) > w * (1-border_margin) or
            min(y1,y2) < h * border_margin or
            max(y1,y2) > h * (1-border_margin)
        )
        is_long   = length_px > min(h, w) * 0.25
        wall_type = "load_bearing" if (near_border or is_long) else "partition"
        classified.append({
            **seg,
            "length_px": round(length_px, 1),
            "length_m" : length_m,
            "wall_type": wall_type
        })
    return classified


def detect_rooms(binary_img):
    h, w     = binary_img.shape
    min_area = h * w * 0.01
    max_area = h * w * 0.25
    kernel   = np.ones((3, 3), np.uint8)
    dilated  = cv2.dilate(binary_img, kernel, iterations=1)
    contours, _ = cv2.findContours(
        dilated, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE
    )
    room_labels = [f"Room_{i+1}" for i in range(30)]
    rooms, idx  = [], 0
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue
        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx  = cv2.approxPolyDP(contour, epsilon, True)
        if len(approx) > 10:
            continue
        x, y, rw, rh = cv2.boundingRect(contour)
        if rw > w * 0.40 or rh > h * 0.40:
            continue
        M = cv2.moments(contour)
        if M["m00"] != 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
        else:
            cx, cy = x + rw//2, y + rh//2
        area_m2 = round(area / (SCALE_PX_PER_M**2), 2)
        rooms.append({
            "label"          : room_labels[idx % len(room_labels)],
            "centroid_px"    : [cx, cy],
            "bounding_box_px": [x, y, rw, rh],
            "area_m2"        : area_m2,
            "polygon_px"     : approx.reshape(-1, 2).tolist()
        })
        idx += 1
    return rooms


def detect_openings(binary_img, walls):
    openings   = []
    horizontal = [w for w in walls if w.get("orientation") == "horizontal"]
    vertical   = [w for w in walls if w.get("orientation") == "vertical"]

    def check_gap(w1, w2, orientation):
        if orientation == "horizontal":
            if abs(w1["y1"] - w2["y1"]) > 20:
                return None
            x1_end   = max(w1["x1"], w1["x2"])
            x2_start = min(w2["x1"], w2["x2"])
            gap = x2_start - x1_end
            if 40 < gap < 150:
                mid_y = (w1["y1"] + w2["y1"]) // 2
                return {
                    "type"      : "door" if gap < 90 else "window",
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
            if 40 < gap < 150:
                mid_x = (w1["x1"] + w2["x1"]) // 2
                return {
                    "type"      : "door" if gap < 90 else "window",
                    "start_px"  : [mid_x, y1_end],
                    "end_px"    : [mid_x, y2_start],
                    "width_m"   : round(gap / SCALE_PX_PER_M, 2),
                    "wall_index": -1
                }
        return None

    for i in range(len(horizontal)):
        for j in range(i+1, len(horizontal)):
            r = check_gap(horizontal[i], horizontal[j], "horizontal")
            if r:
                openings.append(r)

    for i in range(len(vertical)):
        for j in range(i+1, len(vertical)):
            r = check_gap(vertical[i], vertical[j], "vertical")
            if r:
                openings.append(r)

    unique = []
    for op in openings:
        is_dup = any(
            abs(op["start_px"][0] - e["start_px"][0]) < 20 and
            abs(op["start_px"][1] - e["start_px"][1]) < 20
            for e in unique
        )
        if not is_dup:
            unique.append(op)
    return unique


def build_output_json(walls, rooms, openings, image_path, img_shape):
    return {
        "metadata": {
            "source_image"   : image_path,
            "image_size_px"  : [img_shape[1], img_shape[0]],
            "scale_px_per_m" : SCALE_PX_PER_M,
            "floor_height_m" : FLOOR_HEIGHT_M,
            "parser_version" : "2.0",
            "fallback_used"  : False
        },
        "walls"   : walls,
        "rooms"   : rooms,
        "openings": openings,
        "summary" : {
            "total_walls"       : len(walls),
            "load_bearing_walls": sum(1 for w in walls
                                      if w["wall_type"] == "load_bearing"),
            "partition_walls"   : sum(1 for w in walls
                                      if w["wall_type"] == "partition"),
            "total_rooms"       : len(rooms),
            "total_openings"    : len(openings),
            "doors"             : sum(1 for o in openings
                                      if o["type"] == "door"),
            "windows"           : sum(1 for o in openings
                                      if o["type"] == "window"),
        }
    }


def validate_output(data):
    errors = []
    for key in ["metadata", "walls", "rooms", "openings", "summary"]:
        if key not in data:
            errors.append(f"Missing key: '{key}'")
    for i, wall in enumerate(data.get("walls", [])):
        for field in ["x1", "y1", "x2", "y2", "wall_type", "length_m"]:
            if field not in wall:
                errors.append(f"Wall {i} missing '{field}'")
    if errors:
        print("\n  [VALIDATION FAILED]")
        for e in errors:
            print(f"    - {e}")
    else:
        print("\n  [VALIDATION PASSED] JSON ready for teammates")
    return len(errors) == 0


# ╔══════════════════════════════════════════════════════════╗
# ║  SECTION 3 — RECONSTRUCTION (JSON → clean drawing)      ║
# ╚══════════════════════════════════════════════════════════╝

def compute_transform(walls, canvas_w, canvas_h, padding):
    all_x, all_y = [], []
    for w in walls:
        all_x += [w["x1"], w["x2"]]
        all_y += [w["y1"], w["y2"]]
    min_x, max_x = min(all_x), max(all_x)
    min_y, max_y = min(all_y), max(all_y)
    avail_w = canvas_w - 2 * padding
    avail_h = canvas_h - 2 * padding
    scale   = min(avail_w / (max_x - min_x or 1),
                  avail_h / (max_y - min_y or 1))
    drawn_w = (max_x - min_x) * scale
    drawn_h = (max_y - min_y) * scale
    off_x   = padding + (avail_w - drawn_w) / 2 - min_x * scale
    off_y   = padding + (avail_h - drawn_h) / 2 - min_y * scale
    return scale, off_x, off_y


def t(x, y, scale, off_x, off_y):
    return int(x * scale + off_x), int(y * scale + off_y)


def is_too_close(pt, pts, min_dist=70):
    return any(math.sqrt((pt[0]-p[0])**2+(pt[1]-p[1])**2) < min_dist
               for p in pts)


def draw_wall_on_canvas(canvas, wall, scale, off_x, off_y):
    x1, y1 = t(wall["x1"], wall["y1"], scale, off_x, off_y)
    x2, y2 = t(wall["x2"], wall["y2"], scale, off_x, off_y)
    thickness = 6 if wall["wall_type"] == "load_bearing" else 3
    color     = BLACK if wall["wall_type"] == "load_bearing" else DARK_GRAY
    cv2.line(canvas, (x1, y1), (x2, y2), color, thickness)


def draw_opening_gap_on_canvas(canvas, opening, scale, off_x, off_y):
    sx, sy = t(opening["start_px"][0], opening["start_px"][1],
               scale, off_x, off_y)
    ex, ey = t(opening["end_px"][0], opening["end_px"][1],
               scale, off_x, off_y)
    cv2.line(canvas, (sx, sy), (ex, ey), WHITE, 14)


def draw_door_symbol(canvas, opening, scale, off_x, off_y):
    sx, sy = t(opening["start_px"][0], opening["start_px"][1],
               scale, off_x, off_y)
    ex, ey = t(opening["end_px"][0], opening["end_px"][1],
               scale, off_x, off_y)
    radius = int(math.sqrt((ex-sx)**2 + (ey-sy)**2))
    if radius < 4:
        return
    cv2.line(canvas, (sx, sy), (ex, ey), DARK_GRAY, 1)
    angle = math.degrees(math.atan2(ey-sy, ex-sx))
    cv2.ellipse(canvas, (sx, sy), (radius, radius),
                0, int(angle), int(angle+90), DARK_GRAY, 1)


def draw_window_symbol(canvas, opening, scale, off_x, off_y):
    sx, sy = t(opening["start_px"][0], opening["start_px"][1],
               scale, off_x, off_y)
    ex, ey = t(opening["end_px"][0], opening["end_px"][1],
               scale, off_x, off_y)
    dx   = ex - sx
    dy   = ey - sy
    dist = max(math.sqrt(dx*dx + dy*dy), 1)
    nx   = int(-dy / dist * 4)
    ny   = int( dx / dist * 4)
    cv2.line(canvas, (sx, sy), (ex, ey), DARK_GRAY, 2)
    cv2.line(canvas, (sx+nx, sy+ny), (ex+nx, ey+ny), MID_GRAY, 1)
    cv2.line(canvas, (sx-nx, sy-ny), (ex-nx, ey-ny), MID_GRAY, 1)


def draw_dimension_on_canvas(canvas, wall, scale,
                              off_x, off_y, used_pts):
    if wall["length_m"] < 1.5:
        return
    x1, y1 = t(wall["x1"], wall["y1"], scale, off_x, off_y)
    x2, y2 = t(wall["x2"], wall["y2"], scale, off_x, off_y)
    mid     = ((x1+x2)//2, (y1+y2)//2)
    if is_too_close(mid, used_pts):
        return
    used_pts.append(mid)

    dx   = x2 - x1
    dy   = y2 - y1
    dist = max(math.sqrt(dx*dx + dy*dy), 1)
    off  = 20
    nx   = int(-dy / dist * off)
    ny   = int( dx / dist * off)

    ax1, ay1 = x1+nx, y1+ny
    ax2, ay2 = x2+nx, y2+ny

    cv2.line(canvas, (ax1, ay1), (ax2, ay2), DIM_COLOR, 1)

    tk  = 5
    tnx = int(-dy / dist * tk)
    tny = int( dx / dist * tk)
    cv2.line(canvas, (ax1-tnx, ay1-tny), (ax1+tnx, ay1+tny), DIM_COLOR, 1)
    cv2.line(canvas, (ax2-tnx, ay2-tny), (ax2+tnx, ay2+tny), DIM_COLOR, 1)

    label = f"{wall['length_m']}m"
    font  = cv2.FONT_HERSHEY_SIMPLEX
    fs    = 0.30
    (tw, th), _ = cv2.getTextSize(label, font, fs, 1)
    lx = mid[0] + nx - tw//2
    ly = mid[1] + ny + th//2
    cv2.rectangle(canvas, (lx-2, ly-th-2), (lx+tw+2, ly+2), WHITE, -1)
    cv2.putText(canvas, label, (lx, ly),
                font, fs, DIM_COLOR, 1, cv2.LINE_AA)


def draw_room_label(canvas, room, scale, off_x, off_y):
    cx, cy = t(room["centroid_px"][0], room["centroid_px"][1],
               scale, off_x, off_y)
    label  = f"{room['area_m2']} m2"
    font   = cv2.FONT_HERSHEY_SIMPLEX
    fs     = 0.32
    (tw, th), _ = cv2.getTextSize(label, font, fs, 1)
    cv2.putText(canvas, label,
                (cx - tw//2, cy + th//2),
                font, fs, AREA_COLOR, 1, cv2.LINE_AA)


def draw_scale_bar_on_canvas(canvas, scale, px_per_m):
    bar_m  = 4
    bar_px = max(int(bar_m * px_per_m * scale), 40)
    bx, by = PADDING, CANVAS_H - 35
    cv2.line(canvas, (bx, by), (bx+bar_px, by), DARK_GRAY, 2)
    cv2.line(canvas, (bx, by-5), (bx, by+5), DARK_GRAY, 1)
    cv2.line(canvas, (bx+bar_px, by-5),
             (bx+bar_px, by+5), DARK_GRAY, 1)
    cv2.putText(canvas, f"~{bar_m}m",
                (bx + bar_px//2 - 12, by-8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.30, DARK_GRAY,
                1, cv2.LINE_AA)


def draw_legend_on_canvas(canvas):
    lx = CANVAS_W - 230
    ly = CANVAS_H - 95
    gap  = 20
    font = cv2.FONT_HERSHEY_SIMPLEX
    fs   = 0.28
    items = [
        (BLACK,     6, "Load-bearing wall"),
        (DARK_GRAY, 3, "Partition wall"),
        (DARK_GRAY, 1, "Door (arc symbol)"),
        (MID_GRAY,  1, "Window (parallel lines)"),
    ]
    for i, (color, thick, label) in enumerate(items):
        y = ly + i * gap
        cv2.line(canvas, (lx, y), (lx+25, y), color, thick)
        cv2.putText(canvas, label, (lx+32, y+4),
                    font, fs, MID_GRAY, 1, cv2.LINE_AA)


def reconstruct_from_json(data, plan_name, output_path):
    """
    Core reconstruction function.
    Takes parsed JSON data and draws a clean professional floor plan.
    """
    walls    = data["walls"]
    rooms    = data["rooms"]
    openings = data["openings"]
    summary  = data["summary"]

    if not walls:
        print(f"  SKIP — no walls in {plan_name}")
        return None

    canvas = np.full((CANVAS_H, CANVAS_W, 3), 255, dtype=np.uint8)
    scale, off_x, off_y = compute_transform(
        walls, CANVAS_W, CANVAS_H, PADDING
    )

    # Draw load-bearing walls first (underneath)
    for wall in walls:
        if wall["wall_type"] == "load_bearing":
            draw_wall_on_canvas(canvas, wall, scale, off_x, off_y)

    # Draw partition walls on top
    for wall in walls:
        if wall["wall_type"] == "partition":
            draw_wall_on_canvas(canvas, wall, scale, off_x, off_y)

    # Erase gaps for openings
    for opening in openings:
        draw_opening_gap_on_canvas(canvas, opening, scale, off_x, off_y)

    # Draw door and window symbols
    for opening in openings:
        if opening["type"] == "door":
            draw_door_symbol(canvas, opening, scale, off_x, off_y)
        else:
            draw_window_symbol(canvas, opening, scale, off_x, off_y)

    # Draw dimension lines — only top 15 longest walls
    used_pts     = []
    sorted_walls = sorted(walls,
                          key=lambda w: w["length_m"],
                          reverse=True)
    for wall in sorted_walls[:15]:
        draw_dimension_on_canvas(canvas, wall, scale,
                                 off_x, off_y, used_pts)

    # Draw room area labels
    for room in rooms:
        draw_room_label(canvas, room, scale, off_x, off_y)

    # Scale bar
    draw_scale_bar_on_canvas(
        canvas, scale,
        data["metadata"]["scale_px_per_m"]
    )

    # Legend
    draw_legend_on_canvas(canvas)

    # Title
    cv2.putText(canvas,
                f"Floor Plan — {plan_name.upper()}",
                (PADDING, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.65, BLACK, 1, cv2.LINE_AA)

    # Summary line at bottom
    info = (f"Walls: {summary['total_walls']}  |  "
            f"Load-bearing: {summary['load_bearing_walls']}  |  "
            f"Partition: {summary['partition_walls']}  |  "
            f"Rooms: {summary['total_rooms']}  |  "
            f"Openings: {summary['total_openings']}")
    cv2.putText(canvas, info,
                (PADDING, CANVAS_H - 12),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.28, MID_GRAY, 1, cv2.LINE_AA)

    # Save
    cv2.imwrite(output_path, canvas)
    print(f"  Reconstructed map saved: {output_path}")

    return canvas


# ╔══════════════════════════════════════════════════════════╗
# ║  SECTION 4 — DISPLAY                                    ║
# ╚══════════════════════════════════════════════════════════╝

def show_all_plans(results):
    """
    Show all reconstructed plans in one window.
    results = list of (canvas, plan_name)
    """
    num = len(results)
    if num == 0:
        print("Nothing to show.")
        return

    fig, axes = plt.subplots(1, num, figsize=(11 * num, 9))
    if num == 1:
        axes = [axes]

    for ax, (canvas, plan_name) in zip(axes, results):
        ax.imshow(cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB))
        ax.set_title(f"Floor Plan — {plan_name.upper()}",
                     fontsize=14, pad=12)
        ax.axis("off")

    plt.suptitle(
        "Stage 1 — Reconstructed Floor Plans (Auto-generated from Parsed Coordinates)",
        fontsize=13, y=1.01
    )
    plt.tight_layout()

    combined = os.path.join(BASE_DIR, "outputs", "all_reconstructed.png")
    plt.savefig(combined, dpi=150, bbox_inches="tight",
                facecolor="white")
    print(f"\n  Combined view saved: {combined}")
    plt.show()


# ╔══════════════════════════════════════════════════════════╗
# ║  SECTION 5 — MAIN PIPELINE                              ║
# ╚══════════════════════════════════════════════════════════╝

def run_parser(image_path, json_output_path, reconstructed_output_path):
    print(f"\n{'='*55}")
    print(f"Processing: {os.path.basename(image_path)}")
    print(f"{'='*55}")

    os.makedirs(os.path.dirname(json_output_path), exist_ok=True)

    # ── Step 1: Load image (any format) ─────────────────────
    print("\nStep 1: Loading image...")
    img = load_image_from_file(image_path)

    # ── Step 2: Preprocess ───────────────────────────────────
    print("\nStep 2: Preprocessing...")
    binary = load_and_preprocess(img)

    # ── Step 3: Detect walls ─────────────────────────────────
    print("\nStep 3: Detecting walls...")
    raw_walls = detect_walls(binary)
    print(f"  Raw segments: {len(raw_walls)}")

    print("\nStep 3b: Snapping + deduplicating...")
    walls = snap_to_orthogonal(raw_walls)
    walls = remove_duplicate_walls(walls, proximity=10)
    print(f"  After dedup: {len(walls)} walls")

    # ── Step 4: Classify walls ───────────────────────────────
    print("\nStep 4: Classifying walls...")
    walls = classify_walls(walls, img.shape)
    lb = sum(1 for w in walls if w["wall_type"] == "load_bearing")
    pt = sum(1 for w in walls if w["wall_type"] == "partition")
    print(f"  Load-bearing: {lb}  |  Partition: {pt}")

    # ── Step 5: Detect rooms ─────────────────────────────────
    print("\nStep 5: Detecting rooms...")
    rooms = detect_rooms(binary)
    print(f"  Rooms found: {len(rooms)}")

    # ── Step 6: Detect openings ──────────────────────────────
    print("\nStep 6: Detecting openings...")
    openings = detect_openings(binary, walls)
    doors   = sum(1 for o in openings if o["type"] == "door")
    windows = sum(1 for o in openings if o["type"] == "window")
    print(f"  Doors: {doors}  |  Windows: {windows}")

    # ── Step 7: Build and save JSON ──────────────────────────
    print("\nStep 7: Saving JSON...")
    output = build_output_json(walls, rooms, openings,
                               image_path, img.shape)
    with open(json_output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    print(f"  JSON saved: {json_output_path}")

    # ── Step 8: Validate ─────────────────────────────────────
    print("\nStep 8: Validating...")
    validate_output(output)

    # ── Step 9: Reconstruct clean map ────────────────────────
    print("\nStep 9: Reconstructing clean floor plan...")
    canvas = reconstruct_from_json(output, 
                                   os.path.basename(image_path).split(".")[0],
                                   reconstructed_output_path)

    print(f"\n{'='*55}")
    print(f"DONE — {os.path.basename(image_path)}")
    print(f"{'='*55}\n")

    return output, canvas


# ── ENTRY POINT ───────────────────────────────────────────────
if __name__ == "__main__":
    input_dir  = os.path.join(BASE_DIR, "sample_inputs")
    output_dir = os.path.join(BASE_DIR, "outputs")

    # Supported formats — add any file here
    # PNG, JPG, BMP (Paint/Paint3D), PDF all work
    plans = [
        "plan_a.png",
        "plan_b.png",
        "plan_c.png",
    ]

    all_results = []

    for filename in plans:
        image_path = os.path.join(input_dir, filename)

        if not os.path.exists(image_path):
            print(f"\nSKIPPED — not found: {image_path}")
            continue

        plan_name = os.path.splitext(filename)[0]

        json_path  = os.path.join(output_dir, f"{plan_name}_data.json")
        recon_path = os.path.join(output_dir, f"{plan_name}_reconstructed.png")

        output, canvas = run_parser(image_path, json_path, recon_path)

        if canvas is not None:
            all_results.append((canvas, plan_name))

    # Show all plans together in one window
    print("\nShowing all reconstructed plans...")
    show_all_plans(all_results)
