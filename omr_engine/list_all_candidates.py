import cv2
import numpy as np
import os

def main():
    template_path = "ZipGrade50QuestionV2.png"
    if not os.path.exists(template_path):
        print("Template not found.")
        return
        
    image = cv2.imread(template_path)
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
    
    candidates = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        area = cv2.contourArea(c)
        aspect_ratio = float(w) / h if h > 0 else 0
        perimeter = cv2.arcLength(c, True)
        circularity = (4 * np.pi * area) / (perimeter * perimeter) if perimeter > 0 else 0
        
        # Broad range: w and h between 10 and 45
        if 10 <= w <= 45 and 10 <= h <= 45:
            cx = int(x + w / 2)
            cy = int(y + h / 2)
            candidates.append((cx, cy, w, h, area, circularity))
            
    candidates = sorted(candidates, key=lambda b: (b[1], b[0]))
    print(f"Found {len(candidates)} broad candidates.")
    
    # Print the ones on the far left (x < 150)
    print("\nLeft-most candidates (x < 150):")
    left_cands = [c for c in candidates if c[0] < 150]
    for i, c in enumerate(left_cands):
        print(f"L{i}: cx={c[0]}, cy={c[1]}, w={c[2]}, h={c[3]}, area={c[4]:.1f}, circ={c[5]:.2f}")
        
    # Print the coordinates of some middle candidates
    print("\nMiddle candidates (x between 350 and 400, y between 200 and 600):")
    mid_cands = [c for c in candidates if 350 <= c[0] <= 400 and 200 <= c[1] <= 600]
    for i, c in enumerate(mid_cands[:20]):
        print(f"M{i}: cx={c[0]}, cy={c[1]}, w={c[2]}, h={c[3]}, area={c[4]:.1f}, circ={c[5]:.2f}")

if __name__ == "__main__":
    main()
