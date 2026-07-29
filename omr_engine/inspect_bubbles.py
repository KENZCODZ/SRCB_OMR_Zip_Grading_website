import cv2
import numpy as np
import os

def main():
    template_path = "ZipGrade50QuestionV2.png"
    if not os.path.exists(template_path):
        print("Template not found.")
        return
        
    image = cv2.imread(template_path)
    
    # Hardcoded corners
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
    
    bubbles = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        area = cv2.contourArea(c)
        aspect_ratio = float(w) / h if h > 0 else 0
        perimeter = cv2.arcLength(c, True)
        circularity = (4 * np.pi * area) / (perimeter * perimeter) if perimeter > 0 else 0
        
        if (15 <= w <= 32) and (15 <= h <= 32) and (0.75 <= aspect_ratio <= 1.3) and (area >= 100) and (circularity > 0.6):
            cx = int(x + w / 2)
            cy = int(y + h / 2)
            bubbles.append((cx, cy, w, h, area, circularity))
            
    bubbles = sorted(bubbles, key=lambda b: (b[1], b[0]))
    print(f"Total detected bubbles: {len(bubbles)}")
    print("Coordinates of detected bubbles (cx, cy, w, h, area, circularity):")
    for i, b in enumerate(bubbles[:60]):
        print(f"{i}: cx={b[0]}, cy={b[1]}, w={b[2]}, h={b[3]}, area={b[4]:.1f}, circ={b[5]:.2f}")
        
if __name__ == "__main__":
    main()
