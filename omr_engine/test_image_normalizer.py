import unittest
import numpy as np
import cv2
import os

from image_normalizer import ImageNormalizer


class ImageNormalizerTests(unittest.TestCase):
    def setUp(self):
        self.normalizer = ImageNormalizer(max_dimension=800)
        self.sample_path = os.path.join(os.path.dirname(__file__), "ZipGrade50QuestionV2.png")

    def test_resize_standard_large_image(self):
        large_img = np.zeros((2000, 3000, 3), dtype=np.uint8)
        resized = self.normalizer.resize_standard(large_img)
        self.assertLessEqual(max(resized.shape[:2]), 800)
        self.assertEqual(resized.shape[1], 800)
        self.assertEqual(resized.shape[0], 533)

    def test_resize_standard_small_image(self):
        small_img = np.zeros((400, 500, 3), dtype=np.uint8)
        resized = self.normalizer.resize_standard(small_img)
        self.assertEqual(resized.shape, (400, 500, 3))

    def test_illumination_correction(self):
        # Create image with uneven gradient shadow
        gray = np.tile(np.linspace(50, 200, 400, dtype=np.uint8), (300, 1))
        corrected = self.normalizer.correct_illumination(gray)
        self.assertEqual(corrected.shape, gray.shape)
        self.assertEqual(corrected.dtype, np.uint8)
        # After correction, pixel variance should be reduced (flattened)
        self.assertLess(np.std(corrected), np.std(gray))

    def test_contrast_stretch(self):
        gray = np.full((100, 100), 128, dtype=np.uint8)
        stretched = self.normalizer.contrast_stretch(gray)
        self.assertEqual(stretched.shape, (100, 100))
        self.assertEqual(stretched.dtype, np.uint8)

    def test_to_normalized_grayscale(self):
        bgr = np.random.randint(0, 256, (500, 500, 3), dtype=np.uint8)
        gray = self.normalizer.to_normalized_grayscale(bgr)
        self.assertEqual(len(gray.shape), 2)
        self.assertEqual(gray.dtype, np.uint8)

    def test_normalize_bgr(self):
        bgr = np.random.randint(0, 256, (500, 500, 3), dtype=np.uint8)
        norm = self.normalizer.normalize(bgr)
        self.assertEqual(len(norm.shape), 3)
        self.assertEqual(norm.shape[2], 3)
        self.assertEqual(norm.dtype, np.uint8)

    def test_real_sample_sheet(self):
        if os.path.exists(self.sample_path):
            img = cv2.imread(self.sample_path)
            self.assertIsNotNone(img)
            norm = self.normalizer.normalize(img)
            self.assertIsNotNone(norm)
            self.assertGreater(norm.size, 0)


if __name__ == "__main__":
    unittest.main()
