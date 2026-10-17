import unittest
from unittest import mock

import find_leads


class ToLeadTest(unittest.TestCase):
    def test_keeps_business_with_phone(self):
        lead = find_leads.to_lead({
            "displayName": {"text": "Klinik Sihat"},
            "internationalPhoneNumber": "+60 3-1234 5678",
            "websiteUri": "https://example.com",
            "formattedAddress": "PJ"}, "clinic in PJ")
        self.assertEqual(lead["company"], "Klinik Sihat")
        self.assertEqual(lead["phone"], "+60 3-1234 5678")
        self.assertIn("https://example.com", lead["notes"])

    def test_drops_listing_without_phone(self):
        self.assertIsNone(find_leads.to_lead({"displayName": {"text": "X"}}, "q"))

    def test_collect_skips_duplicate_places(self):
        place = {"id": "a", "displayName": {"text": "A"}, "nationalPhoneNumber": "03-111 2222"}
        with mock.patch.object(find_leads, "search", return_value=[place]):
            leads = find_leads.collect(["q1", "q2"], "key", 10)
        self.assertEqual(len(leads), 1)


if __name__ == "__main__":
    unittest.main()
