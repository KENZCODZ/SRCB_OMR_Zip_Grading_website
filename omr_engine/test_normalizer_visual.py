"""
Visual test script for ImageNormalizer.
Loads Kenneth's OMR sheet photo, runs it through the normalizer pipeline,
saves debug output images, and then runs full OMR extraction.
"""
import cv2
import numpy as np
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from image_normalizer import ImageNormalizer
from omr import OMREngine, OMRCornerDetectionError

IMAGE_PATH = os.path.join(os.path.dirname(__file__), "test_sample_kenneth.jpg")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "debug_normalizer_output")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load image
    img = cv2.imread(IMAGE_PATH)
    if img is None:
        print(f"ERROR: Could not load image from {IMAGE_PATH}")
        sys.exit(1)

    print(f"Original image shape: {img.shape}")
    print(f"Original image size:  {img.shape[1]}x{img.shape[0]}")
    print()

    normalizer = ImageNormalizer()

    # --- Step 1: Resize ---
    resized = normalizer.resize_standard(img)
    cv2.imwrite(os.path.join(OUTPUT_DIR, "01_resized.png"), resized)
    print(f"[1] Resized:          {resized.shape[1]}x{resized.shape[0]}")

    # --- Step 2: Denoise ---
    denoised = normalizer.denoise(resized)
    cv2.imwrite(os.path.join(OUTPUT_DIR, "02_denoised.png"), denoised)
    print(f"[2] Denoised:         {denoised.shape[1]}x{denoised.shape[0]}")

    # --- Step 3: Grayscale ---
    gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)
    cv2.imwrite(os.path.join(OUTPUT_DIR, "03_grayscale.png"), gray)
    print(f"[3] Grayscale:        {gray.shape[1]}x{gray.shape[0]}")

    # --- Step 4: Illumination correction ---
    corrected = normalizer.correct_illumination(gray)
    cv2.imwrite(os.path.join(OUTPUT_DIR, "04_illumination_corrected.png"), corrected)
    print(f"[4] Illumination:     {corrected.shape[1]}x{corrected.shape[0]}")

    # --- Step 5: Contrast stretch ---
    stretched = normalizer.contrast_stretch(corrected)
    cv2.imwrite(os.path.join(OUTPUT_DIR, "05_contrast_stretched.png"), stretched)
    print(f"[5] Contrast stretch: {stretched.shape[1]}x{stretched.shape[0]}")

    # --- Step 6: Full normalize (color) ---
    normalized_color = normalizer.normalize(img)
    cv2.imwrite(os.path.join(OUTPUT_DIR, "06_normalized_color.png"), normalized_color)
    print(f"[6] Normalized:       {normalized_color.shape[1]}x{normalized_color.shape[0]}")

    # --- Step 7: Full grayscale pipeline ---
    normalized_gray = normalizer.to_normalized_grayscale(img)
    cv2.imwrite(os.path.join(OUTPUT_DIR, "07_normalized_grayscale.png"), normalized_gray)
    print(f"[7] Norm Gray:        {normalized_gray.shape[1]}x{normalized_gray.shape[0]}")

    print()
    print(f"Debug images saved to: {OUTPUT_DIR}")
    print()

    # --- Step 8: Full OMR extraction with normalizer ---
    print("=" * 60)
    print("  OMR Engine Extraction (with ImageNormalizer)")
    print("=" * 60)

    engine = OMREngine()
    try:
        results = engine.extract_answers(img)
        print(f"  Student ID: {results['student_id']}")
        answered = sum(1 for v in results['answers'].values() if v is not None)
        print(f"  Answered:   {answered} / {len(results['answers'])}")
        print()
        print("  Detected answers:")
        for q in sorted(results['answers'].keys(), key=lambda x: int(x)):
            ans = results['answers'][q]
            print(f"    Q{q:>2}: {ans if ans else '(blank)'}")
        print()
        print("  [OK] OMR extraction succeeded!")
    except OMRCornerDetectionError as e:
        print(f"  [FAIL] Corner detection failed: {e}")
    except Exception as e:
        print(f"  [FAIL] Unexpected error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
