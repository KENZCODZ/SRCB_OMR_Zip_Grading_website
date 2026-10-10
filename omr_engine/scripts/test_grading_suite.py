import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
import json
from omr import OMREngine

def main():
    engine = OMREngine()

    # 1. Test c240032.jpeg with its wave answer key
    c240032_key = {
        '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E',
        '6': 'D', '7': 'C', '8': 'B', '9': 'A', '10': 'B',
        '11': 'C', '12': 'E', '13': 'D', '14': 'C', '15': 'B',
        '16': 'A', '17': 'B', '18': 'C', '19': 'D', '20': 'E',
        '21': 'E', '22': 'D', '23': 'C', '24': 'B', '25': 'A',
        '26': 'B', '27': 'C', '28': 'D', '29': 'E', '30': 'D',
        '31': 'C', '32': 'B', '33': 'A', '34': 'B', '35': 'C',
        '36': 'D', '37': 'E', '38': 'D', '39': 'C', '40': 'B',
        '41': 'A', '42': 'B', '43': 'C', '44': 'D', '45': 'E',
        '46': 'D', '47': 'C', '48': 'B', '49': 'A', '50': 'B'
    }

    print("=== 1. Testing c240032.jpeg (EduAssess Student Sheet) ===")
    img_c = cv2.imread("assets/c240032.jpeg")
    assert img_c is not None, "Failed to load assets/c240032.jpeg"
    res_c = engine.grade_sheet(img_c, c240032_key)
    print("Template:", res_c["template_type"])
    print("Student ID:", res_c["student_id"])
    print("Key:", res_c.get("key"))
    print("Score:", res_c["score"], "/", res_c["total_questions"])
    assert res_c["template_type"] == "eduassess_6980", f"Expected eduassess_6980, got {res_c['template_type']}"
    assert res_c["student_id"] == "240032", f"Expected 240032, got {res_c['student_id']}"
    assert res_c["score"] == 50, f"Expected 50, got {res_c['score']}"

    print("\n=== 2. Testing new.jpg (ZipGrade Clean Template) ===")
    img_new = cv2.imread("assets/new.jpg")
    assert img_new is not None, "Failed to load assets/new.jpg"
    dummy_zip_key = {str(i): "A" for i in range(1, 51)}
    res_new = engine.grade_sheet(img_new, dummy_zip_key)
    print("Template:", res_new["template_type"])
    print("Student ID:", res_new["student_id"])
    print("Score:", res_new["score"], "/", res_new["total_questions"])
    assert res_new["template_type"] == "zipgrade_50", f"Expected zipgrade_50, got {res_new['template_type']}"
    assert res_new["score"] == 0, f"Expected 0 on empty sheet, got {res_new['score']}"

    print("\n=== 3. Testing EduAssess6980_50Question.png Template ===")
    img_edu = cv2.imread("assets/EduAssess6980_50Question.png")
    assert img_edu is not None, "Failed to load assets/EduAssess6980_50Question.png"
    res_edu = engine.grade_sheet(img_edu, c240032_key)
    print("Template:", res_edu["template_type"])
    print("Student ID:", res_edu["student_id"])
    assert res_edu["template_type"] == "eduassess_6980"

    print("\n=== 4. Testing ZipGrade50QuestionV2.png High-Res Template ===")
    img_zv2 = cv2.imread("assets/ZipGrade50QuestionV2.png")
    assert img_zv2 is not None, "Failed to load assets/ZipGrade50QuestionV2.png"
    res_zv2 = engine.grade_sheet(img_zv2, dummy_zip_key)
    print("Template:", res_zv2["template_type"])
    print("Student ID:", res_zv2["student_id"])
    assert res_zv2["template_type"] == "zipgrade_50"

    print("\n=== 5. Testing extract_answers on c240032.jpeg ===")
    assert img_c is not None
    ext_c = engine.extract_answers(img_c)
    print("Extracted template:", ext_c["template_type"])
    print("Extracted Student ID:", ext_c["student_id"])
    print("Extracted Q1-Q5:", {str(i): ext_c["answers"][str(i)] for i in range(1, 6)})
    assert ext_c["student_id"] == "240032"
    assert ext_c["answers"]["1"] == "A"
    assert ext_c["answers"]["2"] == "B"
    assert ext_c["answers"]["3"] == "C"
    assert ext_c["answers"]["4"] == "D"
    assert ext_c["answers"]["5"] == "E"

    print("\n=======================================================")
    print(" ALL 5 TEST CASES PASSED WITH 100% SUCCESS!")
    print("=======================================================")

if __name__ == "__main__":
    main()
