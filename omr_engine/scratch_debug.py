import cv2
import numpy as np
import os

def main():
    template_path = "ZipGrade50QuestionV2.png"
    if not os.path.exists(template_path):
        print("Template not found.")
        return
        
    image = cv2.imread(template_path)
    
    # Simple hardcoded corners from previous run
    corners = [[497.0, 615.0], [2045.0, 615.0], [497.0, 2728.0], [2045.0, 2728.0]]
    
    src_pts = np.array(corners, dtype=np.float32)
    dst_pts = np.array([
        [50, 50],
        [800, 50],
        [50, 1050],
        [800, 1050]
    ], dtype=np.float32)
    
    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(image, M, (850, 1100))
    
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 3
    )
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    print(f"Total raw contours: {len(contours)}")
    
    # Sort contours by area to see the sizes of candidate bubbles
    stats = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        area = cv2.contourArea(c)
        aspect_ratio = float(w) / h if h > 0 else 0
        perimeter = cv2.arcLength(c, True)
        circularity = (4 * np.pi * area) / (perimeter * perimeter) if perimeter > 0 else 0
        
        # Store all contours within a wide size range
        if 5 <= w <= 50 and 5 <= h <= 50:
            stats.append((w, h, area, circularity, aspect_ratio, x, y))
            
    # Print the top 350 stats sorted by y then x
    stats_sorted = sorted(stats, key=lambda s: (s[6], s[5]))
    print("Sample contours (w, h, area, circularity, aspect_ratio, x, y):")
    for i, s in enumerate(stats_sorted[:40]):
        print(f"{i}: w={s[0]}, h={s[1]}, area={s[2]:.1f}, circ={s[3]:.2f}, aspect={s[4]:.2f}, x={s[5]}, y={s[6]}")

if __name__ == "__main__":
    main()
