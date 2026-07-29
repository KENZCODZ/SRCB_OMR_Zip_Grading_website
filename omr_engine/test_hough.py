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
    blurred = cv2.medianBlur(gray, 5)
    
    # Run Hough Circles
    # param1: gradient threshold for Canny
    # param2: accumulator threshold for circle centers (lower means more circles)
    # minRadius: min circle radius
    # maxRadius: max circle radius
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.0,
        minDist=15,
        param1=50,
        param2=12,
        minRadius=8,
        maxRadius=16
    )
    
    if circles is not None:
        circles = np.round(circles[0, :]).astype("int")
        print(f"Hough Circles found {len(circles)} circles.")
        
        # Print a few
        for i, (cx, cy, r) in enumerate(circles[:30]):
            print(f"{i}: cx={cx}, cy={cy}, r={r}")
    else:
        print("No circles found.")

if __name__ == "__main__":
    main()
