import unittest

from database import (
    init_db,
    authenticate_user,
    get_dashboard_summary,
    save_exam,
    get_exam,
    list_exams,
    delete_exam,
    save_submission,
    list_submissions,
    register_user,
    list_pending_users,
    update_user_status,
)


class BackendIntegrationTests(unittest.TestCase):
    def setUp(self):
        init_db()
        delete_exam("demo-test-exam")
        from database import get_db_connection
        conn = get_db_connection()
        conn.execute("DELETE FROM users WHERE email = 'test.teacher@srcb.edu.ph'")
        conn.commit()
        conn.close()

    def test_authentication_accepts_seeded_user(self):
        res = authenticate_user("dean@srcb.edu.ph", "Dean@2025")
        self.assertTrue(res.get("success", False))
        self.assertEqual(res["user"]["role"], "dean")

    def test_authentication_accepts_admin_user(self):
        res = authenticate_user("admin@srcb.edu.ph", "Admin@2025")
        self.assertTrue(res.get("success", False))
        self.assertEqual(res["user"]["role"], "admin")
        self.assertEqual(res["user"]["name"], "System Administrator")

    def test_authentication_rejects_bad_password(self):
        res = authenticate_user("dean@srcb.edu.ph", "wrong-password")
        self.assertFalse(res.get("success", False))

    def test_registration_and_approval_flow(self):
        reg_res = register_user(
            name="Test Teacher",
            email="test.teacher@srcb.edu.ph",
            password="Password@123",
            role="teacher",
            programme="BSIT",
            department="Computing Studies",
        )
        self.assertEqual(reg_res["status"], "pending")

        # Pending user should not be able to login
        login_res = authenticate_user("test.teacher@srcb.edu.ph", "Password@123")
        self.assertFalse(login_res.get("success", False))
        self.assertEqual(login_res.get("error"), "pending_approval")

        # Approve user
        approved = update_user_status(reg_res["id"], "active")
        self.assertTrue(approved)

        # Approved user can now login
        login_res_after = authenticate_user("test.teacher@srcb.edu.ph", "Password@123")
        self.assertTrue(login_res_after.get("success", False))

    def test_admin_create_teacher_and_student_accounts(self):
        from database import create_user_account, list_all_users, delete_user

        # Admin creates a teacher account directly active
        t_user = create_user_account(
            name="Prof. Sarah Connor",
            email="sarah.connor@srcb.edu.ph",
            password="Teacher@Pass1",
            role="teacher",
            programme="BSIT",
            department="Computing Studies",
            status="active",
        )
        self.assertEqual(t_user["role"], "teacher")
        self.assertEqual(t_user["status"], "active")

        # Admin creates a student account directly active
        s_user = create_user_account(
            name="John Connor",
            email="john.connor@srcb.edu.ph",
            password="Student@Pass1",
            role="student",
            programme="BSIT",
            department="Computing Studies",
            status="active",
        )
        self.assertEqual(s_user["role"], "student")
        self.assertEqual(s_user["status"], "active")

        # Verify teacher can log in immediately
        t_login = authenticate_user("sarah.connor@srcb.edu.ph", "Teacher@Pass1")
        self.assertTrue(t_login.get("success", False))
        self.assertEqual(t_login["user"]["name"], "Prof. Sarah Connor")

        # Verify student can log in immediately
        s_login = authenticate_user("john.connor@srcb.edu.ph", "Student@Pass1")
        self.assertTrue(s_login.get("success", False))
        self.assertEqual(s_login["user"]["name"], "John Connor")

        # Clean up created accounts
        delete_user(t_user["id"])
        delete_user(s_user["id"])

    def test_exam_with_rich_metadata_lifecycle(self):
        exam = save_exam(
            exam_id="demo-test-exam",
            name="Midterm Web Development",
            answer_key={"1": "A", "2": "B", "3": "C"},
            exam_type="Midterm",
            academic_year="2025-2026",
            semester="1st Semester",
            subject="Web Systems",
            course_code="ITP305",
            section="BSIT 3-A",
            program="BSIT",
            instructor_name="Prof. John",
            num_items=3,
            passing_score=2,
            instructions="No cheating",
            exam_date="2026-08-17",
        )
        self.assertEqual(exam["id"], "demo-test-exam")
        self.assertEqual(exam["course_code"], "ITP305")
        self.assertEqual(exam["num_items"], 3)

        retrieved = get_exam("demo-test-exam")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved["subject"], "Web Systems")

        save_submission(
            submission_id="demo-sub-001",
            exam_id="demo-test-exam",
            student_id="2022-001",
            score=3,
            total_questions=3,
            answers={"1": "A", "2": "B", "3": "C"},
        )

        subs = list_submissions("demo-test-exam")
        self.assertEqual(len(subs), 1)
        self.assertEqual(subs[0]["score"], 3)

        summary = get_dashboard_summary()
        self.assertGreaterEqual(summary["total_exams"], 1)
        self.assertGreaterEqual(summary["total_submissions"], 1)

        deleted = delete_exam("demo-test-exam")
        self.assertTrue(deleted)


if __name__ == "__main__":
    unittest.main()
