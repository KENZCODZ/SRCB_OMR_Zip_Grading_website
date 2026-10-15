#!/usr/bin/env python3
"""
live_omr.py
Live Optical Mark Recognition (OMR) system using OpenCV and Python.
Based on the computer vision pipeline:
  1. Pre-processing (Grayscale, Gaussian Blur, Canny Edge Detection, Adaptive Thresholding)
  2. Contour & Marker Detection (4-corner fiducial squares + rectangular contour approximation)
  3. Perspective Transformation (Deskewing to standardized 850x1100 bird's-eye view)
  4. Thresholding & Bubble Extraction (Illumination normalization & pixel fill density)
  5. Grading & Inverse Perspective Transform (Green/Red circles & Score HUD projected back onto live webcam feed)
  6. Live Feed Loop (Real-time camera loop with interactive keyboard controls & database submission)

Integrated with the SRCB EduAssess / ZipGrade system (database.py, omr.py).
"""

import cv2
import numpy as np
import argparse
import time
import os
import sys
import json
import uuid
from typing import Optional, Dict, Any, List, Tuple

# Ensure omr_engine root is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(CURRENT_DIR)

from image_normalizer import ImageNormalizer
from omr import OMREngine, OMRCornerDetectionError

try:
    import database
    DB_AVAILABLE = True
except Exception:
    DB_AVAILABLE = False


class LiveOMRScanner:
    def __init__(
        self,
        camera_index: int = 0,
        frame_width: int = 1280,
        frame_height: int = 720,
        exam_id: Optional[str] = None,
        custom_key: Optional[Dict[str, str]] = None,
    ):
        self.camera_index = camera_index
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.exam_id = exam_id

        self.engine = OMREngine()
        self.normalizer = ImageNormalizer()

        # Load Exam & Answer Key
        self.exam_name = "Demo 50-Item Exam"
        self.answer_key: Dict[str, str] = {}
        self.total_questions = 50
        self.passing_score = 30
        self._load_exam(exam_id, custom_key)

        # Temporal smoothing for corners across frames
        self.smoothed_corners: Optional[np.ndarray] = None
        self.smoothing_alpha = 0.4  # Exponential moving average weight for new frame
        self.consecutive_misses = 0
        self.max_misses_before_reset = 5

        # Freeze / Pause state
        self.is_frozen = False
        self.frozen_frame: Optional[np.ndarray] = None
        self.last_results: Optional[Dict[str, Any]] = None

        # Submission status message
        self.status_message = "Point camera at answer sheet. Press 's' to submit, 'c' to freeze, 'q' to quit."
        self.status_message_time = time.time()

    def _load_exam(self, exam_id: Optional[str], custom_key: Optional[Dict[str, str]]):
        """Loads answer key from database or defaults to 50-item demo key."""
        if custom_key:
            self.answer_key = custom_key
            self.total_questions = len(custom_key)
            self.exam_name = f"Custom Key ({self.total_questions} items)"
            return

        if exam_id and DB_AVAILABLE:
            try:
                database.init_db()
                exam = database.get_exam(exam_id)
                if exam:
                    self.exam_name = exam.get("name", "Active Exam")
                    self.answer_key = exam.get("answer_key", {})
                    self.total_questions = exam.get("num_items", len(self.answer_key)) or 50
                    self.passing_score = exam.get("passing_score", int(self.total_questions * 0.6))
                    print(f"Loaded exam '{self.exam_name}' with {len(self.answer_key)} items from database.")
                    return
            except Exception as e:
                print(f"Notice: Could not load exam '{exam_id}' from MySQL: {e}")

        # Fallback to demo key (ZipGrade 50 standard)
        pattern = ["A", "B", "C", "D", "E"]
        self.answer_key = {str(i): pattern[(i - 1) % 5] for i in range(1, 51)}
        self.total_questions = 50
        self.passing_score = 30
        self.exam_name = "SRCB EduAssess Demo Exam (50 Items)"
        print("Using demo 50-item answer key (A, B, C, D, E cyclic).")

    def _smooth_corners(self, raw_corners: List[List[float]]) -> List[List[float]]:
        """
        Applies Exponential Moving Average (EMA) smoothing to corner coordinates
        to remove jitter and create a rock-solid Augmented Reality overlay.
        """
        curr = np.array(raw_corners, dtype=np.float32)
        if self.smoothed_corners is None or self.consecutive_misses > 0:
            self.smoothed_corners = curr
        else:
            self.smoothed_corners = (
                self.smoothing_alpha * curr + (1.0 - self.smoothing_alpha) * self.smoothed_corners
            )
        self.consecutive_misses = 0
        return self.smoothed_corners.tolist()

    def grade_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Optional[Dict[str, Any]]]:
        """
        Executes the live OMR computer vision pipeline on a single webcam frame:
        1. Pre-processing & Corner Detection
        2. Perspective Transformation (Deskew to 850x1100)
        3. Illumination-normalized Thresholding & Bubble Density Decoding
        4. Grading against active Answer Key
        5. Inverse Perspective Transformation back onto live webcam feed
        """
        h_orig, w_orig = frame.shape[:2]
        output_frame = frame.copy()

        # 1. Corner Detection
        raw_corners = None
        try:
            raw_corners = self.engine.detect_corners(frame)
        except OMRCornerDetectionError:
            self.consecutive_misses += 1
            if self.consecutive_misses > self.max_misses_before_reset:
                self.smoothed_corners = None

        if raw_corners is None:
            # Draw subtle viewfinder alignment reticle
            self._draw_reticle(output_frame, w_orig, h_orig)
            return output_frame, None

        # Temporal corner stabilization
        corners = self._smooth_corners(raw_corners)

        # 2. Bird's Eye Perspective Transform to 850x1100
        warped = self.engine.warp_image(frame, corners)
        template_type = self.engine.detect_template_type(warped)
        warped = self.engine.check_and_correct_rotation(warped, template_type)

        # 3. Grade the deskewed sheet
        try:
            grade_res = self.engine.grade_sheet(
                frame,
                self.answer_key,
                template_type=template_type,
            )
        except Exception:
            return output_frame, None

        # 4. Generate Inverse Perspective AR Overlay
        ar_frame = self.engine.create_ar_grading_overlay(
            image=frame,
            corners=corners,
            student_answers=grade_res["answers"],
            answer_key=self.answer_key,
            score=grade_res["score"],
            total_questions=self.total_questions,
            student_id=grade_res["student_id"],
            template_type=template_type,
        )

        # 5. Draw 4 stabilized corner points & border
        pts = np.array(corners, dtype=np.int32)
        cv2.polylines(ar_frame, [pts], isClosed=True, color=(0, 255, 120), thickness=2, lineType=cv2.LINE_AA)
        for pt in pts:
            cv2.circle(ar_frame, tuple(pt), 5, (0, 255, 255), -1)
            cv2.circle(ar_frame, tuple(pt), 7, (255, 255, 255), 1)

        self.last_results = grade_res
        return ar_frame, grade_res

    def _draw_reticle(self, frame: np.ndarray, w: int, h: int):
        """Draws viewfinder alignment corners when no sheet is locked."""
        pad = int(min(w, h) * 0.08)
        x1, y1 = pad, pad
        x2, y2 = w - pad, h - pad
        d = 35
        color = (180, 180, 180)
        thick = 2

        # TL
        cv2.line(frame, (x1, y1), (x1 + d, y1), color, thick)
        cv2.line(frame, (x1, y1), (x1, y1 + d), color, thick)
        # TR
        cv2.line(frame, (x2, y1), (x2 - d, y1), color, thick)
        cv2.line(frame, (x2, y1), (x2, y1 + d), color, thick)
        # BL
        cv2.line(frame, (x1, y2), (x1 + d, y2), color, thick)
        cv2.line(frame, (x1, y2), (x1, y2 - d), color, thick)
        # BR
        cv2.line(frame, (x2, y2), (x2 - d, y2), color, thick)
        cv2.line(frame, (x2, y2), (x2, y2 - d), color, thick)

        cv2.putText(
            frame,
            "Align sheet corner markers inside viewfinder",
            (w // 2 - 210, y2 - 15),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (220, 220, 220),
            1,
            cv2.LINE_AA,
        )

    def draw_hud(self, frame: np.ndarray, fps: float, grade_res: Optional[Dict[str, Any]]):
        """Draws top and bottom HUD telemetry bar."""
        h, w = frame.shape[:2]

        # Top Bar: Glassmorphic dark header
        cv2.rectangle(frame, (0, 0), (w, 48), (20, 20, 24), -1)
        cv2.line(frame, (0, 48), (w, 48), (60, 60, 75), 1)

        # Title & Exam
        title_str = f"SRCB Live OMR — {self.exam_name}"
        cv2.putText(frame, title_str, (16, 31), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)

        # FPS & Live Status
        fps_str = f"FPS: {fps:.1f}"
        cv2.putText(frame, fps_str, (w - 120, 31), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 230, 255), 1, cv2.LINE_AA)

        # Bottom Bar: Status & Interactive Controls
        cv2.rectangle(frame, (0, h - 38), (w, h), (18, 18, 22), -1)
        cv2.line(frame, (0, h - 38), (w, h - 38), (55, 55, 70), 1)

        # Display status message or grading summary
        if time.time() - self.status_message_time < 4.0:
            msg = self.status_message
            color = (0, 255, 200)
        elif grade_res:
            pct = (grade_res["score"] / self.total_questions) * 100 if self.total_questions > 0 else 0
            is_pass = grade_res["score"] >= self.passing_score
            pass_str = "PASSED" if is_pass else "FAILING"
            msg = f"Locked ID: {grade_res['student_id'] or 'Unknown'} | Score: {grade_res['score']}/{self.total_questions} ({pct:.1f}%) [{pass_str}] | Press 'S' to Save Submission"
            color = (0, 255, 120) if is_pass else (80, 100, 255)
        else:
            msg = "[S] Save | [C] Freeze | [R] Reset | [Q] Quit"
            color = (200, 200, 200)

        cv2.putText(frame, msg, (16, h - 13), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 1, cv2.LINE_AA)

    def save_current_submission(self, frame: np.ndarray):
        """Saves current graded submission to database & creates snapshot."""
        if not self.last_results:
            self.status_message = "Cannot save: No valid sheet currently detected."
            self.status_message_time = time.time()
            return

        res = self.last_results
        sub_id = str(uuid.uuid4())
        student_id = res.get("student_id") or "UNSPECIFIED"

        # Save snapshot image
        out_dir = os.path.join(CURRENT_DIR, "debug_output")
        os.makedirs(out_dir, exist_ok=True)
        img_filename = f"scan_{int(time.time())}_{student_id}.png"
        img_path = os.path.join(out_dir, img_filename)
        cv2.imwrite(img_path, frame)

        # Save to database if connected
        saved_db = False
        if DB_AVAILABLE:
            try:
                database.save_submission(
                    submission_id=sub_id,
                    exam_id=self.exam_id or "live-session",
                    student_id=student_id,
                    score=res["score"],
                    total_questions=self.total_questions,
                    answers=res["answers"],
                    student_id_extracted=student_id,
                )
                saved_db = True
            except Exception as e:
                print(f"Database save warning: {e}")

        # Also write local JSON log
        json_path = os.path.join(out_dir, f"submission_{sub_id[:8]}.json")
        with open(json_path, "w") as f:
            json.dump({
                "submission_id": sub_id,
                "exam_name": self.exam_name,
                "student_id": student_id,
                "score": res["score"],
                "total_questions": self.total_questions,
                "answers": res["answers"],
                "saved_to_db": saved_db,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            }, f, indent=2)

        if saved_db:
            self.status_message = f"✓ Saved! ID: {student_id} Score: {res['score']}/{self.total_questions} to database."
        else:
            self.status_message = f"✓ Snapshot saved: {img_filename} (Local output saved)."
        self.status_message_time = time.time()
        print(f"\n{self.status_message} -> {img_path}")

    def run(self):
        """Main real-time live feed loop."""
        print("\n" + "=" * 65)
        print("🎥 STARTING LIVE OMR GRADING SYSTEM")
        print(f"   Camera Index: {self.camera_index}")
        print(f"   Exam: {self.exam_name} ({self.total_questions} Items)")
        print("   Controls:")
        print("     [S] — Save current graded sheet to Database & Disk")
        print("     [C] — Freeze / Unfreeze camera frame")
        print("     [R] — Reset corner tracking buffer")
        print("     [Q] / [ESC] — Exit live feed")
        print("=" * 65 + "\n")

        cap = cv2.VideoCapture(self.camera_index)
        if not cap.isOpened():
            # Try DirectShow on Windows
            cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)

        if not cap.isOpened():
            print(f"❌ Error: Could not open camera {self.camera_index}.")
            print("   Please check that your webcam is plugged in and not in use by another app.")
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.frame_width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.frame_height)

        window_name = "SRCB EduAssess — Live OMR Studio"
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, self.frame_width, self.frame_height)

        prev_time = time.time()
        fps = 0.0
        frame: Optional[np.ndarray] = None
        annotated_frame: Optional[np.ndarray] = None

        try:
            while True:
                if not self.is_frozen:
                    ret, frame = cap.read()
                    if not ret or frame is None:
                        print("Failed to grab frame from webcam. Retrying...")
                        time.sleep(0.05)
                        continue

                    # Grade frame with inverse perspective AR overlay
                    annotated_frame, grade_res = self.grade_frame(frame)
                    self.frozen_frame = annotated_frame
                else:
                    # In frozen / review mode
                    if self.frozen_frame is not None:
                        annotated_frame = self.frozen_frame
                    elif frame is not None:
                        annotated_frame = frame
                    else:
                        time.sleep(0.05)
                        continue
                    grade_res = self.last_results

                if annotated_frame is None:
                    continue

                # Calculate smoothed FPS
                now = time.time()
                dt = now - prev_time
                prev_time = now
                if dt > 0:
                    fps = 0.9 * fps + 0.1 * (1.0 / dt)

                # Draw telemetry & status HUD
                self.draw_hud(annotated_frame, fps, grade_res)

                cv2.imshow(window_name, annotated_frame)

                # Keyboard interaction
                key = cv2.waitKey(1) & 0xFF
                if key in [ord("q"), ord("Q"), 27]:  # 27 is ESC
                    print("Exiting live scanner.")
                    break
                elif key in [ord("s"), ord("S")]:
                    self.save_current_submission(annotated_frame)
                elif key in [ord("c"), ord("C")]:
                    self.is_frozen = not self.is_frozen
                    state_str = "FROZEN" if self.is_frozen else "RESUMED"
                    self.status_message = f"Live feed {state_str}."
                    self.status_message_time = time.time()
                elif key in [ord("r"), ord("R")]:
                    self.smoothed_corners = None
                    self.last_results = None
                    self.status_message = "Tracking buffer reset."
                    self.status_message_time = time.time()

        finally:
            cap.release()
            cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="SRCB EduAssess Live OMR Scanner (OpenCV & Python)")
    parser.add_argument("--camera", type=int, default=0, help="Camera device index (default: 0)")
    parser.add_argument("--exam-id", type=str, default=None, help="Exam ID from database to grade against")
    parser.add_argument("--width", type=int, default=1280, help="Frame width (default: 1280)")
    parser.add_argument("--height", type=int, default=720, help="Frame height (default: 720)")
    parser.add_argument("--demo", action="store_true", help="Run with 50-item demo answer key")
    args = parser.parse_args()

    scanner = LiveOMRScanner(
        camera_index=args.camera,
        frame_width=args.width,
        frame_height=args.height,
        exam_id=args.exam_id,
    )
    scanner.run()


if __name__ == "__main__":
    main()
