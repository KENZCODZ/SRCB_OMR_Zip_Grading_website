import cv2
import numpy as np
import os

def main():
    template_path = "ZipGrade50QuestionV2.png"
    image = cv2.imread(template_path)
    corners = [[497.0, 615.0], [2045.0, 615.0], [497.0, 2728.0], [2045.0, 2728.0]]
    
    src_pts = np.array(corners, dtype=np.float32)
    dst_pts = np.array([[50, 50], [800, 50], [50, 1050], [800, 1050]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(image, M, (850, 1100))
    
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    blurred = cv2.medianBlur(gray, 5)
    
    circles = cv2.HoughCircles(blurred, cv2.HOUGH_GRADIENT, dp=1.0, minDist=16,
                                param1=50, param2=12, minRadius=9, maxRadius=16)
    circles = np.round(circles[0, :]).astype("int")
    all_c = sorted([(int(cx), int(cy), int(r)) for cx, cy, r in circles], key=lambda x: (x[1], x[0]))
    
    print(f"Total Hough circles: {len(all_c)}")
    
    # Regions based on the ZipGrade layout on 850x1100 warped page:
    regions = {
        "key_version":    (50, 100,  200, 470),   # x_min, x_max, y_min, y_max
        "student_id":     (150, 310, 200, 540),
        "q_1_10":         (150, 310, 545, 990),
        "q_11_20":        (350, 530, 200, 540),
        "q_21_30":        (350, 530, 545, 990),
        "q_31_40":        (560, 740, 200, 540),
        "q_41_50":        (560, 740, 545, 990),
    }
    
    for name, (x_min, x_max, y_min, y_max) in regions.items():
        matched = [(cx, cy, r) for cx, cy, r in all_c if x_min <= cx <= x_max and y_min <= cy <= y_max]
        print(f"\n{name}: {len(matched)} circles (x:[{x_min},{x_max}] y:[{y_min},{y_max}])")
        for i, (cx, cy, r) in enumerate(matched):
            print(f"  {i}: cx={cx}, cy={cy}, r={r}")
    
    # Print unmatched
    assigned = set()
    for name, (x_min, x_max, y_min, y_max) in regions.items():
        for cx, cy, r in all_c:
            if x_min <= cx <= x_max and y_min <= cy <= y_max:
                assigned.add((cx, cy, r))
    unmatched = [c for c in all_c if c not in assigned]
    print(f"\nUnmatched: {len(unmatched)} circles")
    for i, (cx, cy, r) in enumerate(unmatched):
        print(f"  U{i}: cx={cx}, cy={cy}, r={r}")

if __name__ == "__main__":
    main()
