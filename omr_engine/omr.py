import cv2
import numpy as np
import json
import os
import base64
from typing import Optional, Dict, Any, List, Tuple
from image_normalizer import ImageNormalizer

COORDS_ZIPGRADE_PATH = os.path.join(os.path.dirname(__file__), "coordinates.json")
COORDS_EDUASSESS_PATH = os.path.join(os.path.dirname(__file__), "eduassess_coordinates.json")


class OMRCornerDetectionError(Exception):
    """Exception raised when the 4 corners of the sheet cannot be found or are invalid."""
    pass


class OMREngine:
    def __init__(self, normalizer: Optional[ImageNormalizer] = None):
        self.normalizer = normalizer or ImageNormalizer()
        self._cached_coords: Dict[str, Any] = {}

    def _load_coordinates(self, template_type: str = "auto") -> Dict[str, Any]:
        """
        Loads coordinates for the specified template type.
        Supports 'eduassess_6980', 'zipgrade_50', or 'auto'.
        """
        if template_type in self._cached_coords:
            return self._cached_coords[template_type]

        if template_type == "eduassess_6980":
            if not os.path.exists(COORDS_EDUASSESS_PATH):
                raise ValueError("EduAssess 6980 coordinates file (eduassess_coordinates.json) not found.")
            with open(COORDS_EDUASSESS_PATH, "r") as f:
                coords = json.load(f)
            self._cached_coords[template_type] = coords
            return coords
        else:
            if not os.path.exists(COORDS_ZIPGRADE_PATH):
                raise ValueError("Coordinates database coordinates.json has not been calibrated.")
            with open(COORDS_ZIPGRADE_PATH, "r") as f:
                coords = json.load(f)
            self._cached_coords["zipgrade_50"] = coords
            return coords

    def detect_corners(self, image: np.ndarray) -> List[List[float]]:
        """
        Finds the 4 outermost black square markers in the image with multi-tier robustness.
        Returns sorted corners: [Top-Left, Top-Right, Bottom-Left, Bottom-Right]
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        img_area = float(image.shape[0] * image.shape[1])
        min_dim = float(min(image.shape[0], image.shape[1]))

        min_marker_area = max(50.0, 0.00003 * img_area)
        max_marker_area = 0.025 * img_area

        # Prepare binarization methods in priority order:
        # 1. Otsu thresholding (ideal for uniform scans & templates without merging nearby text)
        _, thresh_otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # 2. Adaptive thresholding with standard 21-pixel window (ideal for real camera photos)
        thresh_adapt_21 = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 3
        )

        # 3. Adaptive thresholding with proportional window
        bs = max(15, int(min_dim / 40) * 2 + 1)
        thresh_adapt_prop = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, bs, 3
        )

        methods = [thresh_otsu, thresh_adapt_21, thresh_adapt_prop]

        for thresh in methods:
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            candidates: List[Tuple[int, int]] = []

            for c in contours:
                x, y, w, h = cv2.boundingRect(c)
                area = cv2.contourArea(c)
                ar = float(w) / h if h > 0 else 0
                sol = float(area) / (w * h) if (w * h) > 0 else 0

                if (0.70 <= ar <= 1.35) and (sol >= 0.76) and (min_marker_area <= area <= max_marker_area):
                    M = cv2.moments(c)
                    if M["m00"] > 0:
                        cx = int(M["m10"] / M["m00"])
                        cy = int(M["m01"] / M["m00"])
                        candidates.append((cx, cy))

            if len(candidates) < 4:
                continue

            pts = np.array(candidates, dtype=np.float32)

            tl_idx = int(np.argmin(pts[:, 0] + pts[:, 1]))
            br_idx = int(np.argmax(pts[:, 0] + pts[:, 1]))
            tr_idx = int(np.argmax(pts[:, 0] - pts[:, 1]))
            bl_idx = int(np.argmax(pts[:, 1] - pts[:, 0]))

            indices = {tl_idx, tr_idx, bl_idx, br_idx}
            if len(indices) < 4:
                sorted_by_y = sorted(candidates, key=lambda c: c[1])
                top_two = sorted(sorted_by_y[:2], key=lambda c: c[0])
                bottom_two = sorted(sorted_by_y[-2:], key=lambda c: c[0])
                tl = [float(top_two[0][0]), float(top_two[0][1])]
                tr = [float(top_two[-1][0]), float(top_two[-1][1])]
                bl = [float(bottom_two[0][0]), float(bottom_two[0][1])]
                br = [float(bottom_two[-1][0]), float(bottom_two[-1][1])]
            else:
                tl = pts[tl_idx].tolist()
                tr = pts[tr_idx].tolist()
                bl = pts[bl_idx].tolist()
                br = pts[br_idx].tolist()

            # Geometric sanity check
            w_top = np.linalg.norm(np.array(tr) - np.array(tl))
            w_bot = np.linalg.norm(np.array(br) - np.array(bl))
            h_left = np.linalg.norm(np.array(bl) - np.array(tl))
            h_right = np.linalg.norm(np.array(br) - np.array(tr))

            if (
                w_top >= min_dim * 0.35
                and w_bot >= min_dim * 0.35
                and h_left >= min_dim * 0.35
                and h_right >= min_dim * 0.35
            ):
                return [tl, tr, bl, br]

        raise OMRCornerDetectionError(
            "Failed to find all 4 corner markers. "
            "Ensure the sheet is flat, fully visible, and corner squares are not obscured."
        )

    def warp_image(self, image: np.ndarray, corners: List[List[float]]) -> np.ndarray:
        """Warps the source image to a standardized 850x1100 view using detected corners."""
        src_pts = np.array(corners, dtype=np.float32)
        dst_pts = np.array([
            [50, 50],
            [800, 50],
            [50, 1050],
            [800, 1050]
        ], dtype=np.float32)

        M = cv2.getPerspectiveTransform(src_pts, dst_pts)
        warped = cv2.warpPerspective(image, M, (850, 1100))
        return warped

    def detect_template_type(self, warped_image: np.ndarray) -> str:
        """
        Classifies whether the warped sheet is EduAssess (6980) or ZipGrade (50 Question).
        Returns 'eduassess_6980' or 'zipgrade_50'.
        """
        gray = cv2.cvtColor(warped_image, cv2.COLOR_BGR2GRAY)
        bg = cv2.GaussianBlur(gray, (51, 51), 0)
        norm = cv2.divide(gray, bg, scale=255)
        _, thresh = cv2.threshold(norm, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        def get_density(cx: int, cy: int, half: int = 15) -> float:
            roi = thresh[max(0, cy - half):min(1100, cy + half), max(0, cx - half):min(850, cx + half)]
            return float(np.mean(roi)) / 255.0 if roi.size > 0 else 0.0

        # EduAssess has 4 internal column divider squares at (314, 638), (538, 638), (314, 1056), (538, 1056)
        edu_mid1 = get_density(314, 638)
        edu_mid2 = get_density(538, 638)
        edu_bot1 = get_density(314, 1056)
        edu_bot2 = get_density(538, 1056)
        edu_score = (edu_mid1 + edu_mid2 + edu_bot1 + edu_bot2) / 4.0

        # Also check mid-level markers
        edu_mid_score = (edu_mid1 + edu_mid2) / 2.0

        if edu_score >= 0.20 or edu_mid_score >= 0.22:
            return "eduassess_6980"
        return "zipgrade_50"

    def check_and_correct_rotation(self, warped_image: np.ndarray, template_type: str = "auto") -> np.ndarray:
        """
        Detects if the sheet is rotated 180° by checking alignment markers.
        If markers are found at the top instead of bottom, rotates the image 180°.
        """
        gray = cv2.cvtColor(warped_image, cv2.COLOR_BGR2GRAY)
        bg = cv2.GaussianBlur(gray, (51, 51), 0)
        norm = cv2.divide(gray, bg, scale=255)
        _, thresh = cv2.threshold(norm, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        def get_roi_density(cx: int, cy: int, size: int = 30) -> float:
            half = size // 2
            x1 = max(0, cx - half)
            x2 = min(850, cx + half)
            y1 = max(0, cy - half)
            y2 = min(1100, cy + half)
            roi = thresh[y1:y2, x1:x2]
            return float(np.mean(roi)) / 255.0 if roi.size > 0 else 0.0

        if template_type == "eduassess_6980":
            # In EduAssess, bottom markers are at (308, 1045) and (528, 1045).
            # If rotated 180°, they appear at (850 - 308 = 542, 1100 - 1045 = 55) and (322, 55).
            bottom_density = (get_roi_density(308, 1045) + get_roi_density(528, 1045)) / 2.0
            top_density = (get_roi_density(542, 55) + get_roi_density(322, 55)) / 2.0

            if top_density > 0.35 and bottom_density < 0.20:
                print("Detected 180-degree rotation (EduAssess). Auto-rotating image...")
                return cv2.rotate(warped_image, cv2.ROTATE_180)
        else:
            # ZipGrade alignment markers
            bottom_density = (get_roi_density(375, 1004) + get_roi_density(515, 1004)) / 2.0
            top_density = (get_roi_density(475, 96) + get_roi_density(335, 96)) / 2.0

            if top_density > 0.35 and bottom_density < 0.20:
                print("Detected 180-degree rotation (ZipGrade). Auto-rotating image...")
                return cv2.rotate(warped_image, cv2.ROTATE_180)

        return warped_image

    def grade_sheet(
        self,
        image: np.ndarray,
        answer_key: Dict[str, str],
        template_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes image, aligns/warps, detects template, detects filled bubbles, and grades them.
        Returns: {
            "student_id": str,
            "score": int,
            "total_questions": int,
            "answers": dict,
            "template_type": str,
            "overlay_base64": str
        }
        """
        # 0. Image normalization
        image = self.normalizer.normalize(image)

        # 1. Corner detection
        corners = self.detect_corners(image)

        # 2. Warp image
        warped = self.warp_image(image, corners)

        # 3. Detect template if not specified
        if not template_type or template_type == "auto":
            template_type = self.detect_template_type(warped)

        # 4. Rotation sanity check & correction
        warped = self.check_and_correct_rotation(warped, template_type)

        # 5. Load coordinates for detected template
        coordinates = self._load_coordinates(template_type)

        # 6. Illumination-normalized binarization (removes paper shadows & bleed-through)
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        bg = cv2.GaussianBlur(gray, (51, 51), 0)
        norm = cv2.divide(gray, bg, scale=255)
        _, thresh = cv2.threshold(norm, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Create output overlay
        overlay = warped.copy()
        fill_threshold = 0.12
        ambiguity_margin = 0.08

        # A. Parse Student ID
        student_id_digits: List[str] = []
        student_id_coords = coordinates.get("student_id", [])
        is_eduassess = (template_type == "eduassess_6980")

        for col_idx, col in enumerate(student_id_coords):
            column_ratios = []
            for row_idx, bubble in enumerate(col):
                if bubble is None:
                    column_ratios.append((row_idx, 0.0, 0, 0, 0))
                    continue

                cx, cy, r = bubble["cx"], bubble["cy"], bubble["r"]
                w_roi = r + 2
                x1 = max(0, cx - w_roi)
                x2 = min(850, cx + w_roi)
                y1 = max(0, cy - w_roi)
                y2 = min(1100, cy + w_roi)

                roi = thresh[y1:y2, x1:x2]
                fill_ratio = float(np.sum(roi == 255)) / roi.size if roi.size > 0 else 0.0
                column_ratios.append((row_idx, fill_ratio, cx, cy, r))

            column_ratios_sorted = sorted(column_ratios, key=lambda x: x[1], reverse=True)
            best_idx, best_ratio, bcx, bcy, br = column_ratios_sorted[0]
            second_idx, second_ratio, scx, scy, sr = column_ratios_sorted[1]

            digit = "?"
            if best_ratio >= fill_threshold:
                if second_ratio >= fill_threshold and (best_ratio - second_ratio < ambiguity_margin or second_ratio / best_ratio > 0.70):
                    digit = "?"  # Ambiguous
                    cv2.circle(overlay, (bcx, bcy), br + 4, (0, 255, 255), 2)
                    cv2.circle(overlay, (scx, scy), sr + 4, (0, 255, 255), 2)
                else:
                    if is_eduassess:
                        # EduAssess row 0..9 -> digits 0..9
                        digit = str(best_idx)
                    else:
                        # ZipGrade row 0..8 -> digits 1..9, row 9 -> digit 0
                        digit = str((best_idx + 1) % 10)
                    cv2.circle(overlay, (bcx, bcy), br + 4, (0, 255, 0), 2)
            else:
                digit = "?"

            student_id_digits.append(digit)

        student_id_str = "".join(student_id_digits)

        # Optional: Parse Key Version / Key if available
        parsed_key = None
        key_coords = coordinates.get("key") or coordinates.get("key_version")
        if key_coords:
            key_ratios = []
            for opt, bubble in key_coords.items():
                if bubble is None:
                    continue
                cx, cy, r = bubble["cx"], bubble["cy"], bubble["r"]
                roi = thresh[max(0, cy - r):min(1100, cy + r), max(0, cx - r):min(850, cx + r)]
                ratio = float(np.sum(roi == 255)) / roi.size if roi.size > 0 else 0.0
                key_ratios.append((opt, ratio, cx, cy, r))
            if key_ratios:
                key_ratios_sorted = sorted(key_ratios, key=lambda x: x[1], reverse=True)
                if key_ratios_sorted[0][1] >= fill_threshold:
                    parsed_key = key_ratios_sorted[0][0]
                    cv2.circle(overlay, (key_ratios_sorted[0][2], key_ratios_sorted[0][3]), key_ratios_sorted[0][4] + 4, (255, 165, 0), 2)

        # B. Parse Questions
        student_answers: Dict[str, Any] = {}
        score = 0
        total_questions = len(answer_key)
        question_coords = coordinates.get("questions", {})

        for q_num_str, options in question_coords.items():
            correct_ans = answer_key.get(q_num_str)

            ratios = []
            for opt, bubble in options.items():
                if bubble is None:
                    ratios.append((opt, 0.0, 0, 0, 0))
                    continue

                cx, cy, r = bubble["cx"], bubble["cy"], bubble["r"]
                w_roi = r + 2
                x1 = max(0, cx - w_roi)
                x2 = min(850, cx + w_roi)
                y1 = max(0, cy - w_roi)
                y2 = min(1100, cy + w_roi)

                roi = thresh[y1:y2, x1:x2]
                fill_ratio = float(np.sum(roi == 255)) / roi.size if roi.size > 0 else 0.0
                ratios.append((opt, fill_ratio, cx, cy, r))

            ratios_sorted = sorted(ratios, key=lambda x: x[1], reverse=True)
            best_opt, best_ratio, bcx, bcy, br = ratios_sorted[0]
            second_opt, second_ratio, scx, scy, sr = ratios_sorted[1]

            selected = None
            is_ambiguous = False
            is_empty = False

            if best_ratio >= fill_threshold:
                if second_ratio >= fill_threshold and (best_ratio - second_ratio < ambiguity_margin or second_ratio / best_ratio > 0.70):
                    is_ambiguous = True
                    selected = "".join(sorted([best_opt, second_opt]))
                else:
                    selected = best_opt
            else:
                is_empty = True

            student_answers[q_num_str] = {
                "selected": selected,
                "is_ambiguous": is_ambiguous,
                "is_empty": is_empty
            }

            # Visual feedback drawing
            if correct_ans:
                correct_coords = options.get(correct_ans)

                if is_empty:
                    # Blue circle on correct answer to show what was missed
                    if correct_coords:
                        cv2.circle(overlay, (correct_coords["cx"], correct_coords["cy"]), correct_coords["r"] + 4, (255, 0, 0), 2)
                elif is_ambiguous:
                    # Yellow on ambiguous options
                    for opt, ratio, cx, cy, r in ratios:
                        if ratio >= fill_threshold:
                            cv2.circle(overlay, (cx, cy), r + 4, (0, 255, 255), 2)
                    if correct_ans not in (selected or "") and correct_coords:
                        cv2.circle(overlay, (correct_coords["cx"], correct_coords["cy"]), correct_coords["r"] + 4, (255, 0, 0), 2)
                else:
                    student_opt = selected
                    student_coords = options.get(student_opt)

                    if student_opt == correct_ans:
                        score += 1
                        if student_coords:
                            cv2.circle(overlay, (student_coords["cx"], student_coords["cy"]), student_coords["r"] + 4, (0, 255, 0), 2)
                    else:
                        if student_coords:
                            cv2.circle(overlay, (student_coords["cx"], student_coords["cy"]), student_coords["r"] + 4, (0, 0, 255), 2)
                        if correct_coords:
                            cv2.circle(overlay, (correct_coords["cx"], correct_coords["cy"]), correct_coords["r"] + 4, (255, 0, 0), 2)

        # Convert overlay image to base64
        _, buffer = cv2.imencode(".png", overlay)
        overlay_base64 = base64.b64encode(buffer).decode("utf-8")

        return {
            "student_id": student_id_str,
            "key": parsed_key,
            "score": score,
            "total_questions": total_questions,
            "answers": student_answers,
            "template_type": template_type,
            "overlay_base64": overlay_base64
        }

    def extract_answers(
        self,
        image: np.ndarray,
        template_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes image, aligns/warps, detects template, detects filled bubbles, and extracts answers.
        Does not grade or compare against an answer key.
        """
        # 0. Image normalization
        image = self.normalizer.normalize(image)

        # 1. Corner detection
        corners = self.detect_corners(image)

        # 2. Warp image
        warped = self.warp_image(image, corners)

        # 3. Detect template if not specified
        if not template_type or template_type == "auto":
            template_type = self.detect_template_type(warped)

        # 4. Rotation sanity check & correction
        warped = self.check_and_correct_rotation(warped, template_type)

        # 5. Load coordinates for detected template
        coordinates = self._load_coordinates(template_type)

        # 6. Illumination-normalized binarization
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        bg = cv2.GaussianBlur(gray, (51, 51), 0)
        norm = cv2.divide(gray, bg, scale=255)
        _, thresh = cv2.threshold(norm, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        overlay = warped.copy()
        fill_threshold = 0.12
        ambiguity_margin = 0.08
        is_eduassess = (template_type == "eduassess_6980")

        # A. Parse Student ID
        student_id_digits: List[str] = []
        student_id_coords = coordinates.get("student_id", [])

        for col_idx, col in enumerate(student_id_coords):
            column_ratios = []
            for row_idx, bubble in enumerate(col):
                if bubble is None:
                    column_ratios.append((row_idx, 0.0, 0, 0, 0))
                    continue

                cx, cy, r = bubble["cx"], bubble["cy"], bubble["r"]
                w_roi = r + 2
                x1 = max(0, cx - w_roi)
                x2 = min(850, cx + w_roi)
                y1 = max(0, cy - w_roi)
                y2 = min(1100, cy + w_roi)

                roi = thresh[y1:y2, x1:x2]
                fill_ratio = float(np.sum(roi == 255)) / roi.size if roi.size > 0 else 0.0
                column_ratios.append((row_idx, fill_ratio, cx, cy, r))

            column_ratios_sorted = sorted(column_ratios, key=lambda x: x[1], reverse=True)
            best_idx, best_ratio, bcx, bcy, br = column_ratios_sorted[0]
            second_idx, second_ratio, scx, scy, sr = column_ratios_sorted[1]

            digit = "?"
            if best_ratio >= fill_threshold:
                if second_ratio >= fill_threshold and (best_ratio - second_ratio < ambiguity_margin or second_ratio / best_ratio > 0.70):
                    digit = "?"
                    cv2.circle(overlay, (bcx, bcy), br + 4, (0, 255, 255), 2)
                    cv2.circle(overlay, (scx, scy), sr + 4, (0, 255, 255), 2)
                else:
                    digit = str(best_idx) if is_eduassess else str((best_idx + 1) % 10)
                    cv2.circle(overlay, (bcx, bcy), br + 4, (0, 255, 0), 2)
            else:
                digit = "?"

            student_id_digits.append(digit)

        student_id_str = "".join(student_id_digits)

        # B. Parse Questions
        extracted_answers: Dict[str, Any] = {}
        question_coords = coordinates.get("questions", {})

        for q_num_str in sorted(question_coords.keys(), key=lambda x: int(x)):
            options = question_coords[q_num_str]
            ratios = []
            for opt, bubble in options.items():
                if bubble is None:
                    ratios.append((opt, 0.0, 0, 0, 0))
                    continue

                cx, cy, r = bubble["cx"], bubble["cy"], bubble["r"]
                w_roi = r + 2
                x1 = max(0, cx - w_roi)
                x2 = min(850, cx + w_roi)
                y1 = max(0, cy - w_roi)
                y2 = min(1100, cy + w_roi)

                roi = thresh[y1:y2, x1:x2]
                fill_ratio = float(np.sum(roi == 255)) / roi.size if roi.size > 0 else 0.0
                ratios.append((opt, fill_ratio, cx, cy, r))

            ratios_sorted = sorted(ratios, key=lambda x: x[1], reverse=True)
            best_opt, best_ratio, bcx, bcy, br = ratios_sorted[0]
            second_opt, second_ratio, scx, scy, sr = ratios_sorted[1]

            selected = None
            if best_ratio >= fill_threshold:
                if second_ratio >= fill_threshold and (best_ratio - second_ratio < ambiguity_margin or second_ratio / best_ratio > 0.70):
                    selected = "".join(sorted([best_opt, second_opt]))
                    for opt, ratio, cx, cy, r in ratios:
                        if ratio >= fill_threshold:
                            cv2.circle(overlay, (cx, cy), r + 4, (0, 255, 255), 2)
                else:
                    selected = best_opt
                    cv2.circle(overlay, (bcx, bcy), br + 4, (0, 255, 0), 2)

            extracted_answers[q_num_str] = selected

        # Convert overlay image to base64
        _, buffer = cv2.imencode(".png", overlay)
        overlay_base64 = base64.b64encode(buffer).decode("utf-8")

        return {
            "student_id": student_id_str,
            "answers": extracted_answers,
            "template_type": template_type,
            "overlay_base64": overlay_base64
        }
