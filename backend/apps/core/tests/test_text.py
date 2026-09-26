from django.test import SimpleTestCase

from apps.core.text import extract_hashtags, extract_mentions


class HashtagExtractionTests(SimpleTestCase):
    def test_extracts_unique_lowercase_tags_in_order(self):
        text = "Shipping #Django and #React today. #django again! #python3"
        self.assertEqual(extract_hashtags(text), ["django", "react", "python3"])

    def test_ignores_bare_hash_and_numbers_only(self):
        self.assertEqual(extract_hashtags("Issue # 12 and #123 and #_x"), [])

    def test_ignores_html_entities_and_mid_word_hashes(self):
        self.assertEqual(extract_hashtags("Tom&#39;s C#tag and foo#bar"), [])

    def test_supports_unicode(self):
        self.assertEqual(extract_hashtags("Hola #Programación"), ["programación"])

    def test_caps_at_ten_tags(self):
        text = " ".join(f"#tag{i}" for i in range(20))
        self.assertEqual(len(extract_hashtags(text)), 10)

    def test_empty(self):
        self.assertEqual(extract_hashtags(""), [])
        self.assertEqual(extract_hashtags(None), [])


class MentionExtractionTests(SimpleTestCase):
    def test_extracts_unique_usernames(self):
        text = "cc @ada and @Grace, thanks @ada!"
        self.assertEqual(extract_mentions(text), ["ada", "Grace"])

    def test_ignores_emails(self):
        self.assertEqual(extract_mentions("mail me at someone@example.com"), [])

    def test_handles_trailing_dot(self):
        self.assertEqual(extract_mentions("Thanks @linus."), ["linus"])

    def test_empty(self):
        self.assertEqual(extract_mentions(""), [])
