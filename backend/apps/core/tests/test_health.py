from rest_framework.test import APITestCase


class HealthTests(APITestCase):
    def test_health_is_public(self):
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["checks"]["database"], "ok")
        self.assertIn("version", response.data)

    def test_schema_generates_without_warnings(self):
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"/api/v1/posts/", response.content)
