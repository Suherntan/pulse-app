import unittest
from unittest import mock

import find_leads


def place(name="Klinik Sihat", phone="", website="", pid="a"):
    p = {"id": pid, "displayName": {"text": name}}
    if phone:
        p["internationalPhoneNumber"] = phone
    if website:
        p["websiteUri"] = website
    return p


class IsMobileTest(unittest.TestCase):
    def test_mobiles(self):
        for n in ("+60 12-345 6789", "012-345 6789", "0111-234 5678", "60123456789", "+60 16-2345678"):
            self.assertTrue(find_leads.is_mobile(n), n)

    def test_landlines_and_tollfree(self):
        for n in ("+60 3-1234 5678", "03-1234 5678", "04-123 4567", "1300-88-1234", "1800 81 1234", "", "abc"):
            self.assertFalse(find_leads.is_mobile(n), n)


class ExtractContactsTest(unittest.TestCase):
    def test_email_on_own_domain(self):
        html = '<a href="mailto:info@klinik.com.my">Email us</a> support@wix.com'
        got = find_leads.extract_contacts(html, "https://www.klinik.com.my/")
        self.assertEqual(got["emails"], ["info@klinik.com.my"])

    def test_free_mail_allowed_junk_dropped(self):
        html = "owner@gmail.com logo@2x.png you@example.com"
        got = find_leads.extract_contacts(html, "https://shop.my")
        self.assertEqual(got["emails"], ["owner@gmail.com"])

    def test_mobile_from_text_and_whatsapp_link(self):
        html = 'Call 03-1234 5678 or 012-345 6789. <a href="https://wa.me/60198765432">WhatsApp</a>'
        got = find_leads.extract_contacts(html, "https://x.my")
        self.assertEqual(len(got["mobiles"]), 2)
        self.assertTrue(all(find_leads.is_mobile(m) for m in got["mobiles"]))

    def test_landline_not_picked_up(self):
        got = find_leads.extract_contacts("Tel 03-1234 5678 / 1300-88-1234", "https://x.my")
        self.assertEqual(got["mobiles"], [])


class ToLeadTest(unittest.TestCase):
    def test_listed_mobile_kept(self):
        lead = find_leads.to_lead(place(phone="+60 12-345 6789"), "q")
        self.assertEqual(lead["phone"], "+60 12-345 6789")

    def test_landline_only_dropped(self):
        self.assertIsNone(find_leads.to_lead(place(phone="+60 3-1234 5678"), "q"))

    def test_landline_with_site_email_kept_as_email_lead(self):
        lead = find_leads.to_lead(place(phone="+60 3-1234 5678"), "q", "Gap 06",
                                  {"emails": ["info@a.my"], "mobiles": []})
        self.assertEqual((lead["phone"], lead["email"]), ("", "info@a.my"))
        self.assertIn("landline: +60 3-1234 5678", lead["notes"])
        self.assertIn("angle: Gap 06", lead["notes"])

    def test_landline_with_site_mobile_uses_mobile(self):
        lead = find_leads.to_lead(place(phone="03-1234 5678"), "q", "",
                                  {"emails": [], "mobiles": ["012-345 6789"]})
        self.assertEqual(lead["phone"], "012-345 6789")

    def test_nothing_reachable_dropped(self):
        self.assertIsNone(find_leads.to_lead(place(), "q"))


class CollectTest(unittest.TestCase):
    def test_dedupes_places_and_reads_each_site_once(self):
        p = place(phone="03-1234 5678", website="https://a.my")
        fetch = mock.Mock(return_value={"emails": ["info@a.my"], "mobiles": []})
        with mock.patch.object(find_leads, "search", return_value=[p]):
            leads, total = find_leads.collect(["q1", {"q": "q2", "angle": "Gap 01"}], "key", 10, fetch=fetch)
        self.assertEqual((len(leads), total), (1, 1))
        fetch.assert_called_once_with("https://a.my")

    def test_no_website_and_landline_dropped(self):
        with mock.patch.object(find_leads, "search", return_value=[place(phone="03-1234 5678")]):
            leads, total = find_leads.collect(["q"], "key", 10, fetch=mock.Mock())
        self.assertEqual((leads, total), ([], 1))


if __name__ == "__main__":
    unittest.main()
