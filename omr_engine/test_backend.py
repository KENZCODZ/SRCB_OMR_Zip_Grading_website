import unittest

from database import (
    init_db,
    authenticate_user,
    get_dashboard_summary,
    save_exam,
    save_submission,
)


class BackendAuthTests(unittest.TestCase):
    def setUp(self):
        init_db()
        from database import get_db_connection
        conn = get_db_connection()
        conn.execute("DELETE FROM submissions WHERE exam_id = 'demo-exam'")
        conn.execute("DELETE FROM exams WHERE id = 'demo-exam'")
        conn.commit()
        conn.close()

    def test_authentication_accepts_seeded_user(self):
        user = authenticate_user("dean@srcb.edu.ph", "Dean@2025")
        self.assertIsNotNone(user)
        self.assertEqual(user["role"], "dean")

    def test_authentication_rejects_bad_password(self):
        user = authenticate_user("dean@srcb.edu.ph", "wrong-password")
        self.assertIsNone(user)

    def test_dashboard_summary_returns_metrics(self):
        summary = get_dashboard_summary()
        self.assertIn("total_students", summary)
        self.assertIn("total_exams", summary)
        self.assertIn("average_score", summary)

    def test_dashboard_summary_tracks_real_exam_activity(self):
        initial_summary = get_dashboard_summary()
        save_exam("demo-exam", "Demo Exam", {"1": "A"})
        save_submission(
            submission_id=str(uuid.uuid4()),
            exam_id=test_id,
            student_id="student-100",
            score=80,
            total_questions=100,
            answers={"1": {"selected": "A", "is_empty": False, "is_ambiguous": False}},
        )

        summary = get_dashboard_summary()
        self.assertEqual(summary["total_exams"], initial_summary["total_exams"] + 1)
        self.assertEqual(summary["total_submissions"], initial_summary["total_submissions"] + 1)


if __name__ == "__main__":
    unittest.main()
