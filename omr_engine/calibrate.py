"""
calibrate.py — Robust bubble coordinate calibration for ZipGrade 50-Question V2.

Uses HoughCircles to detect bubble candidates, then grid-snaps them into the
known structural layout (5 options per row, 10 rows per column-group) using
clustering on y-coordinates (rows) and x-coordinates (option columns).

Outputs coordinates.json with per-bubble {cx, cy, r} for every structural element.
"""

import cv2
import numpy as np
import json
import os


# ─── Region definitions on the 850×1100 warped page ────────────────────────
# Each region: (x_min, x_max, y_min, y_max, expected_cols, expected_rows, label)
REGIONS = {
    "key_version": (50, 100,  200,  470, 1, 5),
    "student_id":  (150, 320,  200,  575, 5, 10),
    "q_1_10":      (150, 320,  575, 1020, 5, 10),
    "q_11_20":     (360, 540,  200,  575, 5, 10),
    "q_21_30":     (360, 540,  575, 1020, 5, 10),
    "q_31_40":     (570, 750,  200,  575, 5, 10),
    "q_41_50":     (570, 750,  575, 1020, 5, 10),
}


def get_corners(image):
    """Finds the 4 outermost black square markers."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
    )
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    img_area = image.shape[0] * image.shape[1]
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        area = cv2.contourArea(c)
        ar = float(w) / h if h > 0 else 0
        sol = float(area) / (w * h) if (w * h) > 0 else 0
        if 0.8 <= ar <= 1.25 and 0.8 <= sol <= 1.0 and 0.00015 * img_area <= area <= 0.01 * img_area:
            M = cv2.moments(c)
            if M["m00"] > 0:
                candidates.append((int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"])))

    if len(candidates) < 4:
        raise ValueError(f"Only {len(candidates)} corner candidates found.")

    pts = np.array(candidates, dtype=np.float32)
    tl = pts[np.argmin(pts[:, 0] + pts[:, 1])].tolist()
    br = pts[np.argmax(pts[:, 0] + pts[:, 1])].tolist()
    tr = pts[np.argmax(pts[:, 0] - pts[:, 1])].tolist()
    bl = pts[np.argmax(pts[:, 1] - pts[:, 0])].tolist()
    return [tl, tr, bl, br]


def warp_image(image, corners):
    src = np.array(corners, dtype=np.float32)
    dst = np.array([[50, 50], [800, 50], [50, 1050], [800, 1050]], dtype=np.float32)
    return cv2.warpPerspective(image, cv2.getPerspectiveTransform(src, dst), (850, 1100))


def cluster_1d(values, n_clusters, tol=20):
    """
    Cluster a list of numeric values into exactly n_clusters groups.
    Returns sorted list of cluster centers (floats).
    Uses iterative merge: sort, then greedily group values within tol of each other.
    If the resulting groups != n_clusters, adjusts tol and retries.
    """
    values = sorted(values)
    for attempt_tol in [tol, tol * 0.7, tol * 1.5, tol * 0.5, tol * 2.0]:
        groups = []
        for v in values:
            if groups and abs(v - np.mean(groups[-1])) < attempt_tol:
                groups[-1].append(v)
            else:
                groups.append([v])
        if len(groups) == n_clusters:
            return [float(np.mean(g)) for g in groups]
    # Fallback: return the n_clusters largest groups by count
    groups = []
    for v in values:
        if groups and abs(v - np.mean(groups[-1])) < tol:
            groups[-1].append(v)
        else:
            groups.append([v])
    groups.sort(key=lambda g: len(g), reverse=True)
    centers = sorted([float(np.mean(g)) for g in groups[:n_clusters]])
    return centers


def snap_region(circles, x_min, x_max, y_min, y_max, n_cols, n_rows):
    """
    Given raw Hough circles and a bounding region, snap them into a grid
    of (n_cols × n_rows).  Returns a list-of-lists: grid[row][col] = {cx, cy, r}.
    Missing cells are interpolated from the grid spacing.
    """
    # Filter circles into this region
    pts = [(cx, cy, r) for cx, cy, r in circles if x_min <= cx <= x_max and y_min <= cy <= y_max]

    if len(pts) < n_cols * n_rows * 0.5:
        print(f"  WARNING: only {len(pts)} circles in region, expected {n_cols * n_rows}")

    # Cluster x-values into n_cols columns
    col_centers = cluster_1d([p[0] for p in pts], n_cols)
    # Cluster y-values into n_rows rows
    row_centers = cluster_1d([p[1] for p in pts], n_rows)

    # Build the grid, assigning each circle to nearest (row, col)
    grid = [[None] * n_cols for _ in range(n_rows)]
    used = set()

    for ri, ry in enumerate(row_centers):
        for ci, cx_c in enumerate(col_centers):
            best = None
            best_dist = float('inf')
            for idx, (cx, cy, r) in enumerate(pts):
                if idx in used:
                    continue
                d = np.sqrt((cx - cx_c) ** 2 + (cy - ry) ** 2)
                if d < best_dist and d < 25:  # max snap distance
                    best_dist = d
                    best = idx
            if best is not None:
                used.add(best)
                grid[ri][ci] = {"cx": int(pts[best][0]), "cy": int(pts[best][1]), "r": int(pts[best][2])}

    # Interpolate missing cells from column/row centers and median radius
    radii = [p[2] for p in pts]
    median_r = int(np.median(radii)) if radii else 12
    for ri, ry in enumerate(row_centers):
        for ci, cx_c in enumerate(col_centers):
            if grid[ri][ci] is None:
                grid[ri][ci] = {"cx": int(round(cx_c)), "cy": int(round(ry)), "r": median_r}

    return grid, row_centers, col_centers


def main():
    template_path = os.path.join(os.path.dirname(__file__), "ZipGrade50QuestionV2.png")
    if not os.path.exists(template_path):
        print(f"Error: Template not found at {template_path}")
        return

    image = cv2.imread(template_path)
    print("Step 1: Detecting corners...")
    corners = get_corners(image)
    print(f"  Corners: {corners}")

    print("Step 2: Warping to 850x1100...")
    warped = warp_image(image, corners)

    print("Step 3: Hough circle detection...")
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    blurred = cv2.medianBlur(gray, 5)
    raw = cv2.HoughCircles(blurred, cv2.HOUGH_GRADIENT, dp=1.0, minDist=16,
                           param1=50, param2=12, minRadius=9, maxRadius=16)
    if raw is None:
        print("  No circles found!"); return
    all_circles = [(int(c[0]), int(c[1]), int(c[2])) for c in np.round(raw[0, :]).astype(int)]
    print(f"  Raw Hough circles: {len(all_circles)}")

    # --- Step 4: Snap each region -----------------------------------------
    output = {}

    # Key Version (1 col x 5 rows)
    print("Step 4a: Key Version...")
    r = REGIONS["key_version"]
    kv_grid, _, _ = snap_region(all_circles, *r)
    labels = ["A", "B", "C", "D", "F"]
    output["key_version"] = {labels[i]: kv_grid[i][0] for i in range(min(5, len(kv_grid)))}
    print(f"  Key Version: {len(output['key_version'])} bubbles")

    # Student ID (5 cols x 10 rows)
    print("Step 4b: Student ID...")
    r = REGIONS["student_id"]
    sid_grid, _, _ = snap_region(all_circles, *r)
    # Transpose so it's stored as columns (one per digit position)
    sid_cols = []
    for ci in range(5):
        col = [sid_grid[ri][ci] for ri in range(10)]
        sid_cols.append(col)
    output["student_id"] = sid_cols
    print(f"  Student ID: {len(sid_cols)} columns x {len(sid_cols[0])} rows")

    # Question groups
    q_map = [
        ("q_1_10",  1),
        ("q_11_20", 11),
        ("q_21_30", 21),
        ("q_31_40", 31),
        ("q_41_50", 41),
    ]
    questions = {}
    opts = ["A", "B", "C", "D", "E"]
    for region_name, start_q in q_map:
        print(f"Step 4: {region_name} (Q{start_q}-{start_q + 9})...")
        r = REGIONS[region_name]
        g, _, _ = snap_region(all_circles, *r)
        for ri in range(10):
            q_num = str(start_q + ri)
            questions[q_num] = {opts[ci]: g[ri][ci] for ci in range(5)}
        print(f"  {region_name}: 10 questions x 5 options OK")

    output["questions"] = questions

    # --- Step 5: Save -----------------------------------------------------
    out_path = os.path.join(os.path.dirname(__file__), "coordinates.json")
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    # Quick sanity counts
    total_q = len(questions)
    total_bubbles = (
        len(output["key_version"])
        + sum(len(col) for col in output["student_id"])
        + sum(len(opts_dict) for opts_dict in questions.values())
    )
    print(f"\nCalibration complete!")
    print(f"   Questions calibrated: {total_q}")
    print(f"   Total bubble positions: {total_bubbles}")
    print(f"   Saved to: {out_path}")

    # Save annotated debug image
    debug = warped.copy()
    for q, opts_dict in questions.items():
        for opt, b in opts_dict.items():
            if b is not None:
                cv2.circle(debug, (b["cx"], b["cy"]), b["r"], (0, 255, 0), 1)
    for label, b in output["key_version"].items():
        if b is not None:
            cv2.circle(debug, (b["cx"], b["cy"]), b["r"], (255, 0, 0), 1)
    for col in output["student_id"]:
        for b in col:
            if b is not None:
                cv2.circle(debug, (b["cx"], b["cy"]), b["r"], (0, 0, 255), 1)
    cv2.imwrite(os.path.join(os.path.dirname(__file__), "debug_calibrated.png"), debug)
    print("   Debug image: debug_calibrated.png")


if __name__ == "__main__":
    main()
