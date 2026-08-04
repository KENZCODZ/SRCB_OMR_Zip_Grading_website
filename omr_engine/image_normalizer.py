import cv2
import numpy as np


class ImageNormalizer:
    """
    ImageNormalizer standardizes OMR sheet images before processing.
    Handles scale normalization, noise reduction, smooth illumination flattening,
    and adaptive contrast stretching without distorting bubble fill ratios.
    """

    def __init__(
        self,
        max_dimension: int = 1600,
        enable_illumination_correction: bool = True,
        enable_contrast_stretch: bool = True,
        enable_denoise: bool = True,
    ):
        self.max_dimension = max_dimension
        self.enable_illumination_correction = enable_illumination_correction
        self.enable_contrast_stretch = enable_contrast_stretch
        self.enable_denoise = enable_denoise

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
        Applies subtle bilateral noise reduction to smooth camera sensor grain
        without smearing sharp edges of alignment boxes or bubbles.
        """
        if image is None or not self.enable_denoise:
            return image

        return cv2.bilateralFilter(image, d=5, sigmaColor=35, sigmaSpace=35)

    def correct_illumination(self, gray: np.ndarray) -> np.ndarray:
        """
        Smooth illumination flattening using large Gaussian background estimation.
        Eliminates shadows and gradient falloff without creating blocky artifacts.
        """
        if gray is None or not self.enable_illumination_correction:
            return gray

        h, w = gray.shape[:2]
        # Smooth Gaussian background blur (kernel size ~ 10% of min dimension, odd number)
        ksize = max(51, int(min(h, w) * 0.10))
        if ksize % 2 == 0:
            ksize += 1

        background = cv2.GaussianBlur(gray, (ksize, ksize), 0)
        background = np.maximum(background, 1).astype(np.float32)

        # Divide gray by background and scale to target mean background (240)
        normalized = np.uint8(np.clip((gray.astype(np.float32) / background) * 240.0, 0, 255))
        return normalized

    def contrast_stretch(self, gray: np.ndarray) -> np.ndarray:
        """
        Percentile contrast stretching (1st to 99th percentile) to normalize overall brightness
        and deepen blacks without distorting local tile fill ratios.
        """
        if gray is None or not self.enable_contrast_stretch:
            return gray

        p_low, p_high = np.percentile(gray, (1, 99))
        if p_high <= p_low:
            return gray

        stretched = np.clip((gray.astype(np.float32) - p_low) * 255.0 / (p_high - p_low), 0, 255)
        return np.uint8(stretched)

    def to_normalized_grayscale(self, image: np.ndarray) -> np.ndarray:
        """
        Full grayscale normalization pipeline: resize -> denoise -> grayscale -> illumination -> contrast stretch.
        Returns clean, single-channel uint8 grayscale image.
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
        stretched = self.contrast_stretch(corrected)
        return stretched

    def normalize(self, image: np.ndarray) -> np.ndarray:
        """
        Full color image normalization pipeline.
        Normalizes luminance channel in LAB color space and returns BGR image.
        """
        if image is None or image.size == 0:
            return image

        resized = self.resize_standard(image)
        denoised = self.denoise(resized)

        if len(denoised.shape) == 2:
            norm_gray = self.to_normalized_grayscale(denoised)
            return cv2.cvtColor(norm_gray, cv2.COLOR_GRAY2BGR)

        lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        l_corrected = self.correct_illumination(l_channel)
        l_stretched = self.contrast_stretch(l_corrected)

        merged_lab = cv2.merge([l_stretched, a_channel, b_channel])
        normalized_bgr = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)
        return normalized_bgr
