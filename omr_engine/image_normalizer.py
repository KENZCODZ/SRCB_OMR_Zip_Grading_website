import cv2
import numpy as np


class ImageNormalizer:
    """
    ImageNormalizer standardizes OMR sheet images before processing.
    Handles scale normalization, noise reduction, illumination/shadow flattening,
    and adaptive contrast enhancement (CLAHE).
    """

    def __init__(
        self,
        max_dimension: int = 1600,
        enable_illumination_correction: bool = True,
        enable_clahe: bool = True,
        enable_denoise: bool = True,
        clahe_clip_limit: float = 2.0,
        clahe_tile_grid_size: tuple = (8, 8),
    ):
        self.max_dimension = max_dimension
        self.enable_illumination_correction = enable_illumination_correction
        self.enable_clahe = enable_clahe
        self.enable_denoise = enable_denoise
        self.clahe_clip_limit = clahe_clip_limit
        self.clahe_tile_grid_size = clahe_tile_grid_size

    def resize_standard(self, image: np.ndarray) -> np.ndarray:
        """
        Resizes image down to max_dimension while preserving aspect ratio.
        If image dimensions are within bounds, returns original image.
        """
        if image is None or image.size == 0:
            return image

        h, w = image.shape[:2]
        max_side = max(h, w)

        if max_side <= self.max_dimension:
            return image

        scale = self.max_dimension / float(max_side)
        new_w = int(w * scale)
        new_h = int(h * scale)

        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

    def denoise(self, image: np.ndarray) -> np.ndarray:
        """
        Applies subtle noise reduction (bilateral filter) to smooth out camera grain
        without blurring sharp geometric edges of bubbles and alignment markers.
        """
        if image is None or not self.enable_denoise:
            return image

        if len(image.shape) == 3:
            return cv2.bilateralFilter(image, d=5, sigmaColor=35, sigmaSpace=35)
        else:
            return cv2.bilateralFilter(image, d=5, sigmaColor=35, sigmaSpace=35)

    def correct_illumination(self, gray: np.ndarray) -> np.ndarray:
        """
        Estimates and eliminates uneven background illumination (shadows, flash falloff)
        using morphological closing with a large kernel.
        """
        if gray is None or not self.enable_illumination_correction:
            return gray

        h, w = gray.shape[:2]
        # Kernel size relative to image dimension (approx 5% of min dimension, odd number)
        min_dim = min(h, w)
        ksize = max(31, int(min_dim * 0.05))
        if ksize % 2 == 0:
            ksize += 1

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (ksize, ksize))
        # Morphological closing estimates background intensity pattern
        background = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)

        # Avoid division by zero
        background = np.maximum(background, 1)

        # Divide gray by background and scale to 255
        normalized = np.uint8(np.clip((gray.astype(np.float32) / background.astype(np.float32)) * 255.0, 0, 255))
        return normalized

    def enhance_contrast(self, gray: np.ndarray) -> np.ndarray:
        """
        Applies Contrast Limited Adaptive Histogram Equalization (CLAHE) to bring out
        pencil/pen marks and corner alignment boxes in low-contrast captures.
        """
        if gray is None or not self.enable_clahe:
            return gray

        clahe = cv2.createCLAHE(
            clipLimit=self.clahe_clip_limit,
            tileGridSize=self.clahe_tile_grid_size,
        )
        return clahe.apply(gray)

    def to_normalized_grayscale(self, image: np.ndarray) -> np.ndarray:
        """
        Full grayscale pipeline: resize -> denoise -> grayscale -> illumination correction -> CLAHE.
        Returns single-channel uint8 grayscale image optimal for OMR thresholding and corner finding.
        """
        if image is None or image.size == 0:
            return image

        resized = self.resize_standard(image)
        denoised = self.denoise(resized)

        if len(denoised.shape) == 3:
            gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)
        else:
            gray = denoised.copy()

        corrected = self.correct_illumination(gray)
        enhanced = self.enhance_contrast(corrected)
        return enhanced

    def normalize(self, image: np.ndarray) -> np.ndarray:
        """
        Full color image normalization pipeline:
        Resizes, denoises, and normalizes light intensity/contrast across channels (in LAB color space).
        Returns normalized BGR 3-channel uint8 image.
        """
        if image is None or image.size == 0:
            return image

        resized = self.resize_standard(image)
        denoised = self.denoise(resized)

        if len(denoised.shape) == 2:
            # Grayscale image supplied; convert to BGR after grayscale normalization
            norm_gray = self.to_normalized_grayscale(denoised)
            return cv2.cvtColor(norm_gray, cv2.COLOR_GRAY2BGR)

        # Process luminance (L) channel in LAB color space to preserve color balance
        lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        l_corrected = self.correct_illumination(l_channel)
        l_enhanced = self.enhance_contrast(l_corrected)

        merged_lab = cv2.merge([l_enhanced, a_channel, b_channel])
        normalized_bgr = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)
        return normalized_bgr
