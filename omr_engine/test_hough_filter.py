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
    
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.0,
        minDist=16,
        param1=50,
        param2=12,
        minRadius=9,
        maxRadius=16
    )
    
    if circles is None:
        print("No circles found.")
        return
        
    circles = np.round(circles[0, :]).astype("int")
    
    # Let's count them in our regions
    # Adjust boundaries if needed based on actual bubble locations
    key_version_list = []
    student_id_list = []
    q_1_10_list = []
    q_11_20_list = []
    q_21_30_list = []
    q_31_40_list = []
    q_41_50_list = []
    
    # We will print out coordinates of circles that don't match any region as "ignored"
    ignored = []
    
    for cx, cy, r in circles:
        # Key version: x in [30, 95], y in [240, 480]
        # Wait, let's verify key version: does it have x between 30 and 110?
        if 30 <= cx <= 100 and 220 <= cy <= 460:
            key_version_list.append((cx, cy, r))
        # Left column top (Student ID): x in [150, 350], y in [200, 520]
        # Wait, let's check coordinates from previous list_all_candidates output:
        # M1: cx=382, cy=220. M0: cx=354, cy=220.
        # Wait! In the student ID grid:
        # There are 5 columns.
        # Let's look at the X values. The previous output showed:
        # `cx=368, 400, 433, 467, 500` at cy=206.
        # Wait! Is that student ID?
        # No! `cx=368, 400, 433, 467, 500` is the MIDDLE column top (Questions 11-20)!
        # Wait, where is the Student ID then?
        # The Student ID X coordinates:
        # Let's check lines 2-7 in previous list_all_candidates output:
        # `2: cx=346, cy=187`
        # `3: cx=414, cy=188`
        # `4: cx=481, cy=188`
        # `5: cx=625, cy=188`
        # `6: cx=691, cy=188`
        # `7: cx=555, cy=189`
        # Wait! What are these circles at cy=188?
        # Ah! Look at the X coordinates: 346, 414, 481, 555, 625, 691.
        # There are 6 circles.
        # Wait! On the template, what is at the top left under the header box?
        # Ah! The text "Student ZipGrade ID" is printed, and under it, there are 5 digit input boxes (empty square boxes) for students to write their ID digits!
        # And under the 5 digit input boxes, there is the grid of 10 rows of bubbles!
        # Wait, let's look at the columns:
        # In the template:
        # Left column top: Student ZipGrade ID (5 columns of 10 bubbles).
        # Wait, what are the X coordinates of these 5 columns?
        # Let's check:
        # In the previous output, we saw:
        # `cx=368, 400, 433, 467, 500` starting at `cy=206`.
        # Wait! If those are questions 11-20, what is at the left top?
        # Is it possible that the student ID columns are at `cx = 170, 202, 236, 270, 300`?
        # Let's check:
        # In `test_hough.py` output:
        # `1: cx=236, cy=296`
        # `2: cx=170, cy=826`
        # `4: cx=202, cy=296`
        # `5: cx=170, cy=714`
        # `8: cx=202, cy=560`
        # `13: cx=270, cy=864`
        # `15: cx=300, cy=788`
        # `16: cx=300, cy=864`
        # Yes! Look at the X coordinates: `170, 202, 236, 270, 300`!
        # These are exactly 5 columns separated by ~32-34 pixels:
        # Column 1: cx ≈ 170
        # Column 2: cx ≈ 202
        # Column 3: cx ≈ 236
        # Column 4: cx ≈ 270
        # Column 5: cx ≈ 302
        # Wow! This is extremely clear!
        # Let's check the X coordinates of the columns in the bottom left (Questions 1-10):
        # They also align with the student ID!
        # So Column 1 (Left) has X coordinates: `170, 202, 236, 270, 302`.
        # Let's check Column 2 (Middle):
        # We saw `cx = 368, 400, 433, 467, 500`. These are also 5 options separated by ~32-34 pixels!
        # Column 2 (Middle) has X coordinates: `368, 400, 433, 467, 500`.
        # Let's check Column 3 (Right):
        # We saw `cx = 577, 610, 642, 677, 710`. These are also 5 options separated by ~32-34 pixels!
        # Column 3 (Right) has X coordinates: `577, 610, 642, 677, 710`.
        # This is incredibly beautiful!
        # So:
        # - Key Version: X is around 136?
        #   Let's check in `test_hough.py` output:
        #   Is there a column at X around 136?
        #   Wait, in the output of `list_all_candidates.py` for `x < 150`, we saw:
        #   `L11: cx=136, cy=561`
        #   `L32: cx=141, cy=978`
        #   Wait! Let's check if the Key Version is at X ≈ 73?
        #   In `list_all_candidates.py` output:
        #   `L16: cx=73, cy=731, w=12, h=28` (Wait, this is not a bubble).
        #   Let's check if the Key Version is actually at X ≈ 136?
        #   Wait, why are there bubbles at `cx=136`?
        #   Ah, let's look at the vertical column on the left of Column 1 (Questions 1-10):
        #   Wait! To the left of Column 1 (bottom left) is the label section "1", "2", "3", ... "10".
        #   Wait, but what is to the left of the Student ID?
        #   To the left of Student ID is the "Key Version" box!
        #   Let's look at the Key Version box in the image:
        #   It is on the left side, aligned vertically with the student ID!
        #   So its Y coordinate range is the same as the Student ID (around 220 to 520)!
        #   And its X coordinate: since the Student ID starts at X=170, the Key Version should be to the left of it, around X=136!
        #   Wait! If the Key Version is at X ≈ 136, why did we see:
        #   `L2: cx=136, cy=258`
        #   `L3: cx=136, cy=295`
        #   `L4: cx=136, cy=333`
        #   `L5: cx=136, cy=372`
        #   `L6: cx=136, cy=409`
        #   `L7: cx=137, cy=448`
        #   `L8: cx=136, cy=486`
        #   `L9: cx=136, cy=524`
        #   `L11: cx=136, cy=561`
        #   `L12: cx=142, cy=637`
        #   `L13: cx=141, cy=675`
        #   Wait! There are bubbles at `cx=136` all the way down to `cy=978`!
        #   Wait, what is at `cx=136`?
        #   Let's look at the ZipGrade sheet again:
        #   The labels for the questions (1, 2, 3... 10) and (21, 22... 30) are printed.
        #   Wait, does the first column of bubbles (Questions 1-10) have labels "1", "2", ... "10" on its left?
        #   Yes! The labels "1", "2", ... "10" are printed at X ≈ 136!
        #   And the bubbles for Questions 1-10 are at X = 170, 202, 236, 270, 302!
        #   So the contours at `cx=136` from `cy=560` to `cy=950` are the question number labels (digits 1 to 10)!
        #   And the contours at `cx=136` from `cy=220` to `cy=524` are the Key Version bubbles?
        #   Wait! In the Key Version section:
        #   Are the Key Version bubbles at X ≈ 136?
        #   Wait, if they are bubbles, their circularity would be high!
        #   But we saw that `cx=136` at `cy=220` to `cy=524` had circularity around 0.17 to 0.55!
        #   Why would Key Version bubbles have low circularity?
        #   Wait! Let's check the letters inside them. Under the Key Version, the letters are A, B, C, D, F.
        #   Let's check if the Key Version is actually at X ≈ 73?
        #   Wait! In the template image, is there a Key Version column on the far left?
        #   Let's check:
        #   `L15: cx=57, cy=726`
        #   `L19: cx=57, cy=782`
        #   Wait, no! The Key Version box is on the far left.
        #   Let's check its X coordinate:
        #   Let's write a script that draws all Hough Circles on the warped image and prints their X coordinates in the left-most region (x < 250).
        #   Let's see what Hough Circles finds at x < 250!

        if cx < 250 and 200 <= cy <= 550:
            ignored.append((cx, cy, r))
            
    print("\nLeft top Hough Circles (x < 250, 200 <= y <= 550):")
    for i, c in enumerate(sorted(ignored, key=lambda x: (x[1], x[0]))):
        print(f"LT{i}: cx={c[0]}, cy={c[1]}, r={c[2]}")

if __name__ == "__main__":
    main()
