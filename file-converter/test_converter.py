import io
import unittest
from unittest.mock import patch

import fitz
from PIL import Image, PngImagePlugin
import converter


class ConverterTests(unittest.TestCase):
    def image(self, fmt, metadata=False):
        out = io.BytesIO()
        kwargs = {}
        if metadata:
            info = PngImagePlugin.PngInfo()
            info.add_text("private", "must not survive")
            kwargs["pnginfo"] = info
        Image.new("RGB", (40, 30), (10, 20, 30)).save(out, fmt, **kwargs)
        return out.getvalue()

    def pdf(self, pages=1, script=False):
        with fitz.open() as document:
            for _ in range(pages):
                document.new_page().insert_text((72, 72), "original text")
            if script:
                document.xref_set_key(document.pdf_catalog(), "OpenAction", "<</S/JavaScript/JS(app.alert\\(1\\))>>")
            return document.tobytes()

    def test_images_are_reencoded_without_metadata(self):
        for mime, fmt in [("image/png", "PNG"), ("image/jpeg", "JPEG"), ("image/webp", "WEBP")]:
            original = self.image(fmt, metadata=fmt == "PNG")
            with Image.open(io.BytesIO(converter.rebuild(original, mime))) as result:
                self.assertEqual(result.size, (40, 30))
                self.assertNotIn("private", result.info)

    def test_eicar_embedded_in_image_metadata_is_not_carried_forward(self):
        # EICAR here is inert local fixture data, not a malware-scanner test.
        marker = ("X5O!P%@AP[4\\PZX54(P^)7CC)7}$" + "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*")
        original = io.BytesIO()
        info = PngImagePlugin.PngInfo()
        info.add_text("comment", marker)
        Image.new("RGB", (10, 10), (10, 20, 30)).save(original, "PNG", pnginfo=info)
        rebuilt = converter.rebuild(original.getvalue(), "image/png")
        self.assertIn(marker.encode(), original.getvalue())
        self.assertNotIn(marker.encode(), rebuilt)
        with Image.open(io.BytesIO(rebuilt)) as result:
            self.assertEqual(result.getpixel((0, 0)), (10, 20, 30))

    def test_pdf_becomes_image_only_and_removes_script(self):
        with fitz.open(stream=converter.rebuild(self.pdf(2, True), "application/pdf"), filetype="pdf") as result:
            self.assertEqual(result.page_count, 2)
            self.assertEqual(result[0].get_text(), "")
            self.assertTrue(result[0].get_images())
            self.assertEqual(result.xref_get_key(result.pdf_catalog(), "OpenAction")[0], "null")

    def test_rejects_fake_image_oversized_input_and_page_count(self):
        with self.assertRaises(Exception): converter.rebuild(b"not an image", "image/png")
        with self.assertRaises(ValueError): converter.rebuild(b"x" * (converter.MAX_INPUT + 1), "image/png")
        with self.assertRaises(ValueError): converter.rebuild(self.pdf(converter.MAX_PAGES + 1), "application/pdf")

    def test_pixel_limit_and_timeout(self):
        with patch.object(converter, "MAX_DIMENSION", 20):
            with self.assertRaises(ValueError): converter.rebuild(self.image("PNG"), "image/png")
        with converter.app.test_client() as client, patch.object(converter.subprocess, "run", side_effect=converter.subprocess.TimeoutExpired("worker", 1)):
            self.assertEqual(client.post("/rebuild", data=self.image("PNG"), content_type="image/png").status_code, 504)

    def test_real_http_handler(self):
        with converter.app.test_client() as client:
            response = client.post("/rebuild", data=self.image("PNG"), content_type="image/png")
            self.assertEqual(response.status_code, 200)
            with Image.open(io.BytesIO(response.data)) as result: self.assertEqual(result.size, (40, 30))
            self.assertEqual(client.post("/rebuild", data=b"fake", content_type="image/png").status_code, 422)
            self.assertEqual(client.post("/rebuild", data=b"fake", content_type="text/plain").status_code, 415)


if __name__ == "__main__": unittest.main()
