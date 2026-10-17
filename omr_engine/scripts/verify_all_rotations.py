"""Verify that identify_template_corners consistently maps corners and produces
an upright, gradable warp across 0, 90 CW, 180, and 90 CCW rotations for all assets.
"""
import os
import sys
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE_DIR = os.path.dirname(HERE)
sys.path.insert(0, ENGINE_DIR)

from omr import OMREngine

def main():
    engine = OMREngine()
    assets = ['c240032.jpeg', 'new.jpg', 'EduAssess6980_50Question.png', 'ZipGrade50QuestionV2.png']

    passed = 0
    total = 0

    rotations = [
        ('0 deg', None),
        ('90 CW', cv2.ROTATE_90_CLOCKWISE),
        ('180 deg', cv2.ROTATE_180),
        ('90 CCW', cv2.ROTATE_90_COUNTERCLOCKWISE),
    ]

    for asset in assets:
        path = os.path.join(ENGINE_DIR, 'assets', asset)
        img = cv2.imread(path)
        if img is None:
            print(f"Skipping missing asset: {asset}")
            continue
        img = engine.normalizer.normalize(img)

        for rot_name, rot_code in rotations:
            total += 1
            r_img = img if rot_code is None else cv2.rotate(img, rot_code)
            corners = engine.detect_corners(r_img)
            if corners is None:
                print(f"FAIL  {asset} {rot_name}: no corners detected")
                continue
            warped = engine.warp_image(r_img, corners)
            ver = engine.verify_template(warped)
            if ver['gradable']:
                passed += 1
                print(f"PASS  {asset:32} {rot_name:8} -> layout: {ver['layout']}, fids: {ver['fiducials_found']}")
            else:
                print(f"FAIL  {asset:32} {rot_name:8} -> {ver['reason']}")

    print(f"\nSummary: {passed}/{total} passed across all rotation variants")
    if passed != total:
        sys.exit(1)

if __name__ == '__main__':
    main()
