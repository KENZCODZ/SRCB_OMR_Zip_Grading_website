import cv2
import numpy as np
import json
import os
import base64

COORDS_PATH = os.path.join(os.path.dirname(__file__), "coordinates.json")

class OMRCornerDetectionError(Exception):
    """Exception raised when the 4 corners of the sheet cannot be found or are invalid."""
    pass

class OMREngine:
    def __init__(self):
        # Coordinates are loaded fresh on each request so recalibration
        # takes effect without restarting the server.
        pass

    def _load_coordinates(self):
        """Load coordinates from disk, raising an error if not calibrated."""
        if not os.path.exists(COORDS_PATH):
            raise ValueError("Coordinates database coordinates.json has not been calibrated.")
        with open(COORDS_PATH, "r") as f:
            return json.load(f)

    def detect_corners(self, image):
        """
        Finds the 4 outermost black square markers in the image.
        Returns sorted corners: [Top-Left, Top-Right, Bottom-Left, Bottom-Right]
        """
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
            
            aspect_ratio = float(w) / h if h > 0 else 0
            solidity = float(area) / (w * h) if (w * h) > 0 else 0
            
            # Area must be between 0.015% and 1.5% of total image area
            if (0.8 <= aspect_ratio <= 1.25) and (0.8 <= solidity <= 1.0) and (0.00015 * img_area <= area <= 0.015 * img_area):
                M = cv2.moments(c)
                if M["m00"] > 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    candidates.append((cx, cy))
                    
        if len(candidates) < 4:
            raise OMRCornerDetectionError(
                f"Failed to find all 4 corner markers. Only {len(candidates)} marker candidates were detected. "
                "Ensure the sheet is flat, fully visible, and corner squares are not obscured."
            )
            
        pts = np.array(candidates, dtype=np.float32)
        
        # 4-extreme corner matching
        tl_idx = np.argmin(pts[:, 0] + pts[:, 1])
        br_idx = np.argmax(pts[:, 0] + pts[:, 1])
        tr_idx = np.argmax(pts[:, 0] - pts[:, 1])
        bl_idx = np.argmax(pts[:, 1] - pts[:, 0])
        
        indices = {tl_idx, tr_idx, bl_idx, br_idx}
        if len(indices) < 4:
            # Fallback if projections overlap (e.g. alignment issues)
            sorted_by_y = sorted(candidates, key=lambda c: c[1])
            top_two = sorted(sorted_by_y[:2], key=lambda c: c[0])
            bottom_two = sorted(sorted_by_y[2:], key=lambda c: c[0])
            
            tl = top_two[0]
            tr = top_two[-1]
            bl = bottom_two[0]
            br = bottom_two[-1]
        else:
            tl = pts[tl_idx].tolist()
            tr = pts[tr_idx].tolist()
            bl = pts[bl_idx].tolist()
            br = pts[br_idx].tolist()
            
        # Basic geometry check: ensure the corners represent a sensible bounding box
        width_top = np.linalg.norm(np.array(tr) - np.array(tl))
        width_bottom = np.linalg.norm(np.array(br) - np.array(bl))
        height_left = np.linalg.norm(np.array(bl) - np.array(tl))
        height_right = np.linalg.norm(np.array(br) - np.array(tr))
        
        min_dim = min(image.shape[0], image.shape[1])
        if width_top < min_dim * 0.3 or width_bottom < min_dim * 0.3 or height_left < min_dim * 0.3 or height_right < min_dim * 0.3:
            raise OMRCornerDetectionError(
                "Detected corners form an invalid sheet shape. "
                "Please capture the answer sheet straight-on, filling the camera frame."
            )
            
        return [tl, tr, bl, br]

    def warp_image(self, image, corners):
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

    def check_and_correct_rotation(self, warped_image):
        """
        Detects if the sheet is rotated 180° by checking bottom-center alignment markers.
        If markers are found at the top instead, rotates the image 180°.
        """
        gray = cv2.cvtColor(warped_image, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Bottom alignment markers are expected around x=375, y=1000 and x=515, y=1000.
        # Top-center rotated equivalents are around x=475, y=100 and x=335, y=100.
        # Let's inspect small ROIs (30x30 pixels) around these points.
        def get_roi_density(cx, cy):
            x1 = max(0, cx - 15)
            x2 = min(850, cx + 15)
            y1 = max(0, cy - 15)
            y2 = min(1100, cy + 15)
            roi = thresh[y1:y2, x1:x2]
            return np.mean(roi) / 255.0  # density between 0.0 and 1.0

        bottom_density = (get_roi_density(375, 1004) + get_roi_density(515, 1004)) / 2.0
        top_density = (get_roi_density(475, 96) + get_roi_density(335, 96)) / 2.0
        
        # If top has markers (high density of white pixels in binary inverted) and bottom has none:
        if top_density > 0.4 and bottom_density < 0.2:
            print("Detected 180-degree rotation. Auto-rotating image...")
            return cv2.rotate(warped_image, cv2.ROTATE_180)
            
        return warped_image

    def grade_sheet(self, image, answer_key):
        """
        Processes image, aligns/warps, detects filled bubbles, grades them.
        Returns: {
            "student_id": str,
            "score": int,
            "total_questions": int,
            "answers": dict,
            "overlay_base64": str
        }
        """
        # Load coordinates fresh from disk on every call
        coordinates = self._load_coordinates()

        # 1. Corner detection
        corners = self.detect_corners(image)
        
        # 2. Warp image
        warped = self.warp_image(image, corners)
        
        # 3. Rotation sanity check & correction
        warped = self.check_and_correct_rotation(warped)
        
        # Prepare binarized image for bubble checking
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        # Apply Otsu binarization globally (giving clear black marks)
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Create output overlay
        overlay = warped.copy()
        
        # Let's check bubbles
        fill_threshold = 0.08
        
        # A. Parse Student ID
        student_id_digits = []
        student_id_coords = coordinates.get("student_id", [])
        
        for col_idx, col in enumerate(student_id_coords):
            column_ratios = []
            for row_idx, bubble in enumerate(col):
                if bubble is None:
                    column_ratios.append((row_idx, 0, 0, 0, 0))
                    continue

                cx, cy, r = bubble["cx"], bubble["cy"], bubble["r"]
                
                # Check ROI fill ratio
                w_roi = r + 4
                x1 = max(0, cx - w_roi)
                x2 = min(850, cx + w_roi)
                y1 = max(0, cy - w_roi)
                y2 = min(1100, cy + w_roi)
                
                roi = thresh[y1:y2, x1:x2]
                fill_ratio = float(np.sum(roi == 255)) / roi.size if roi.size > 0 else 0
                column_ratios.append((row_idx, fill_ratio, cx, cy, r))
                
            # Digits map: index 0-8 represent digits 1-9, index 9 represents digit 0
            # Sort by fill ratio descending
            column_ratios_sorted = sorted(column_ratios, key=lambda x: x[1], reverse=True)
            best_idx, best_ratio, bcx, bcy, br = column_ratios_sorted[0]
            
            # Check for ambiguity (e.g. second best also above threshold)
            second_idx, second_ratio, _, _, _ = column_ratios_sorted[1]
            
            digit = "?"
            if best_ratio >= fill_threshold:
                if second_ratio >= fill_threshold:
                    digit = "?"  # Ambiguous
                    # Draw yellow highlight on both
                    cv2.circle(overlay, (bcx, bcy), br + 4, (0, 255, 255), 2)
                    cv2.circle(overlay, (column_ratios[second_idx][2], column_ratios[second_idx][3]), column_ratios[second_idx][4] + 4, (0, 255, 255), 2)
                else:
                    digit = str((best_idx + 1) % 10)  # 0-8 -> 1-9, 9 -> 0
                    # Draw green highlight for parsed ID
                    cv2.circle(overlay, (bcx, bcy), br + 4, (0, 255, 0), 2)
            else:
                # No digit filled
                digit = "?"
                
            student_id_digits.append(digit)
            
        student_id_str = "".join(student_id_digits)
        
        # B. Parse Questions
        student_answers = {}
        score = 0
        total_questions = len(answer_key)
        
        question_coords = coordinates.get("questions", {})
        
        for q_num_str, options in question_coords.items():
            # If this question number is in our answer key, grade it
            correct_ans = answer_key.get(q_num_str)
            
            ratios = []
            for opt, bubble in options.items():
                if bubble is None:
                    ratios.append((opt, 0, 0, 0, 0))
                    continue

                cx, cy, r = bubble["cx"], bubble["cy"], bubble["r"]
                
                # Check ROI fill ratio
                w_roi = r + 4
                x1 = max(0, cx - w_roi)
                x2 = min(850, cx + w_roi)
                y1 = max(0, cy - w_roi)
                y2 = min(1100, cy + w_roi)
                
                roi = thresh[y1:y2, x1:x2]
                fill_ratio = float(np.sum(roi == 255)) / roi.size if roi.size > 0 else 0
                ratios.append((opt, fill_ratio, cx, cy, r))
                
            # Sort options by fill ratio descending
            ratios_sorted = sorted(ratios, key=lambda x: x[1], reverse=True)
            best_opt, best_ratio, bcx, bcy, br = ratios_sorted[0]
            second_opt, second_ratio, _, _, _ = ratios_sorted[1]
            
            # Determine student answer status
            selected = None
            is_ambiguous = False
            is_empty = False
            
            if best_ratio >= fill_threshold:
                if second_ratio >= fill_threshold:
                    is_ambiguous = True
                    selected = [best_opt, second_opt] # Multi-filled
                else:
                    selected = best_opt
            else:
                is_empty = True
                
            student_answers[q_num_str] = {
                "selected": selected if not is_ambiguous else "".join(selected),
                "is_ambiguous": is_ambiguous,
                "is_empty": is_empty
            }
            
            # Visual feedback drawing
            # 1. Correct answer: draw Green circle on correct choice
            # 2. Incorrect answer: draw Red circle on student choice, Blue on correct choice
            # 3. Ambiguous answer: draw Yellow circle on student choices
            # 4. Empty answer: draw Blue circle on correct choice
            
            if correct_ans:
                # Find coordinates of correct and student option
                correct_coords = options.get(correct_ans)
                
                if is_empty:
                    # Draw blue circle on correct answer to show what was missed
                    if correct_coords:
                        cv2.circle(overlay, (correct_coords["cx"], correct_coords["cy"]), correct_coords["r"] + 4, (255, 0, 0), 2) # Blue (BGR: Red is 255,0,0 in cv2? Wait, OpenCV is BGR: Blue is (255, 0, 0), Green (0, 255, 0), Red (0, 0, 255))
                elif is_ambiguous:
                    # Draw yellow on the ambiguous options
                    for opt, ratio, cx, cy, r in ratios:
                        if ratio >= fill_threshold:
                            cv2.circle(overlay, (cx, cy), r + 4, (0, 255, 255), 2) # Yellow (BGR: 0, 255, 255)
                    # Also draw Blue on correct option if correct option was not one of filled
                    if correct_ans not in selected and correct_coords:
                        cv2.circle(overlay, (correct_coords["cx"], correct_coords["cy"]), correct_coords["r"] + 4, (255, 0, 0), 2) # Blue
                else:
                    # Single choice selected
                    student_opt = selected
                    student_coords = options.get(student_opt)
                    
                    if student_opt == correct_ans:
                        score += 1
                        if student_coords:
                            cv2.circle(overlay, (student_coords["cx"], student_coords["cy"]), student_coords["r"] + 4, (0, 255, 0), 2) # Green (BGR: 0, 255, 0)
                    else:
                        # Wrong answer: Red on student choice, Blue on correct choice
                        if student_coords:
                            cv2.circle(overlay, (student_coords["cx"], student_coords["cy"]), student_coords["r"] + 4, (0, 0, 255), 2) # Red (BGR: 0, 0, 255)
                        if correct_coords:
                            cv2.circle(overlay, (correct_coords["cx"], correct_coords["cy"]), correct_coords["r"] + 4, (255, 0, 0), 2) # Blue (BGR: 255, 0, 0)

        # Convert overlay image to base64
        _, buffer = cv2.imencode('.png', overlay)
        overlay_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "student_id": student_id_str,
            "score": score,
            "total_questions": total_questions,
            "answers": student_answers,
            "overlay_base64": overlay_base64
        }

    def extract_answers(self, image):
        """
        Processes image, aligns/warps, detects filled bubbles, and extracts the raw filled answers.
        Does not grade or compare against an answer key.
        Returns: {
            "student_id": str,
            "answers": dict, -- Mapping of question numbers to the selected option, e.g. "A" or None
            "overlay_base64": str
        }
        """
        # Load coordinates fresh from disk on every call
        coordinates = self._load_coordinates()

        # 1. Corner detection
        corners = self.detect_corners(image)
        
        # 2. Warp image
        warped = self.warp_image(image, corners)
        
        # 3. Rotation sanity check & correction
        warped = self.check_and_correct_rotation(warped)
        
        # Prepare binarized image for bubble checking
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Create output overlay
        overlay = warped.copy()
        fill_threshold = 0.08
        
        # A. Parse Student ID
        student_id_digits = []
        student_id_coords = coordinates.get("student_id", [])
        
        for col_idx, col in enumerate(student_id_coords):
            column_ratios = []
            for row_idx, bubble in enumerate(col):
                if bubble is None:
                    column_ratios.append((row_idx, 0, 0, 0, 0))
                    continue

                cx, cy, r = bubble["cx"], bubble["cy"], bubble["r"]
                
                w_roi = r + 4
                x1 = max(0, cx - w_roi)
                x2 = min(850, cx + w_roi)
                y1 = max(0, cy - w_roi)
                y2 = min(1100, cy + w_roi)
                
                roi = thresh[y1:y2, x1:x2]
                fill_ratio = float(np.sum(roi == 255)) / roi.size if roi.size > 0 else 0
                column_ratios.append((row_idx, fill_ratio, cx, cy, r))
                
            column_ratios_sorted = sorted(column_ratios, key=lambda x: x[1], reverse=True)
            best_idx, best_ratio, bcx, bcy, br = column_ratios_sorted[0]
            second_idx, second_ratio, _, _, _ = column_ratios_sorted[1]
            
            digit = "?"
            if best_ratio >= fill_threshold:
                if second_ratio >= fill_threshold:
                    digit = "?"  # Ambiguous
                    cv2.circle(overlay, (bcx, bcy), br + 4, (0, 255, 255), 2)
                    cv2.circle(overlay, (column_ratios[second_idx][2], column_ratios[second_idx][3]), column_ratios[second_idx][4] + 4, (0, 255, 255), 2)
                else:
                    digit = str((best_idx + 1) % 10)  # 0-8 -> 1-9, 9 -> 0
                    cv2.circle(overlay, (bcx, bcy), br + 4, (0, 255, 0), 2)
            else:
                digit = "?"
                
            student_id_digits.append(digit)
            
        student_id_str = "".join(student_id_digits)
        
        # B. Parse Questions
        extracted_answers = {}
        question_coords = coordinates.get("questions", {})
        
        for q_num_str in sorted(question_coords.keys(), key=lambda x: int(x)):
            options = question_coords[q_num_str]
            ratios = []
            for opt, bubble in options.items():
                if bubble is None:
                    ratios.append((opt, 0, 0, 0, 0))
                    continue

                cx, cy, r = bubble["cx"], bubble["cy"], bubble["r"]
                
                w_roi = r + 4
                x1 = max(0, cx - w_roi)
                x2 = min(850, cx + w_roi)
                y1 = max(0, cy - w_roi)
                y2 = min(1100, cy + w_roi)
                
                roi = thresh[y1:y2, x1:x2]
                fill_ratio = float(np.sum(roi == 255)) / roi.size if roi.size > 0 else 0
                ratios.append((opt, fill_ratio, cx, cy, r))
                
            ratios_sorted = sorted(ratios, key=lambda x: x[1], reverse=True)
            best_opt, best_ratio, bcx, bcy, br = ratios_sorted[0]
            second_opt, second_ratio, _, _, _ = ratios_sorted[1]
            
            selected = None
            is_ambiguous = False
            
            if best_ratio >= fill_threshold:
                if second_ratio >= fill_threshold:
                    is_ambiguous = True
                    selected = "".join(sorted([best_opt, second_opt]))
                    # Highlight ambiguous options in yellow
                    for opt, ratio, cx, cy, r in ratios:
                        if ratio >= fill_threshold:
                            cv2.circle(overlay, (cx, cy), r + 4, (0, 255, 255), 2)
                else:
                    selected = best_opt
                    # Highlight filled option in green
                    cv2.circle(overlay, (bcx, bcy), br + 4, (0, 255, 0), 2)
            
            extracted_answers[q_num_str] = selected
            
        # Convert overlay image to base64
        _, buffer = cv2.imencode('.png', overlay)
        overlay_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "student_id": student_id_str,
            "answers": extracted_answers,
            "overlay_base64": overlay_base64
        }
