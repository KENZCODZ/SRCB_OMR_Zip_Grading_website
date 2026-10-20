"""Export real warped OMR sheets (850x1100 grayscale, raw uint8) as fixtures for the
browser-side evaluator test (Frontend/scripts/verifyOmrEvaluation.ts).

The warp uses the same destination geometry as the live worker: detected corner-marker
centres -> (50,50), (800,50), (800,1050), (50,1050).

Usage (from omr_engine/):
    .\\.venv\\Scripts\\python.exe scripts\\export_live_fixtures.py
"""
import os
import sys

import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE_DIR = os.path.dirname(HERE)
sys.path.insert(0, ENGINE_DIR)

from omr import OMREngine  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(ENGINE_DIR), "Frontend", "scripts", "fixtures")

FIXTURES = {
    # Blank ZipGrade 50 sheet (no marks): used for blank / single / multi semantics.
    "zipgrade_blank": "new.jpg",
    # Marked EduAssess 6980 sheet: used to verify the live scanner rejects a layout
    # whose bubble coordinates it does not have.
    "eduassess_marked": "c240032.jpeg",
}


def main() -> None:
    engine = OMREngine()
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, asset in FIXTURES.items():
        img = cv2.imread(os.path.join(ENGINE_DIR, "assets", asset))
        if img is None:
            raise SystemExit(f"Missing asset: {asset}")
        img = engine.normalizer.normalize(img)
        warped = engine.warp_image(img, engine.detect_corners(img))
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        assert gray.shape == (1100, 850), gray.shape
        path = os.path.join(OUT_DIR, f"{name}.gray")
        gray.tofile(path)
        print(f"wrote {path} ({gray.shape[1]}x{gray.shape[0]})")


if __name__ == "__main__":
    main()
