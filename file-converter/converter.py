"""Rebuild one untrusted image or PDF in an isolated child process.

Cloud Run IAM must authenticate requests before they reach this application.
No Drive, Supabase, or application credentials belong in this service.
"""
import io
import os
import subprocess
import sys
import warnings

from flask import Flask, Response, request
from PIL import Image, ImageOps, UnidentifiedImageError
import fitz

MAX_INPUT = 10 * 1024 * 1024
# Both Drive adapters must be able to store the rebuilt file. Keep this below
# Apps Script's 10 MiB payload limit rather than bypassing rebuilding.
MAX_OUTPUT = 10 * 1024 * 1024
MAX_PIXELS = 20_000_000
MAX_DIMENSION = 6000
MAX_PAGES = 20
PDF_SCALE = 1.25
MAX_PAGE_PIXELS = 4_000_000
TIMEOUT_SECONDS = 45
FORMATS = {"image/png": "PNG", "image/jpeg": "JPEG", "image/webp": "WEBP"}
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_INPUT


def rebuild_image(raw: bytes, mime: str) -> bytes:
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(io.BytesIO(raw)) as image:
            if image.format != FORMATS[mime] or image.width > MAX_DIMENSION or image.height > MAX_DIMENSION or image.width * image.height > MAX_PIXELS:
                raise ValueError("image dimensions or format rejected")
            if getattr(image, "n_frames", 1) != 1:
                raise ValueError("animated images are not supported")
            image.load()
            image = ImageOps.exif_transpose(image)
            # Copy only pixels: never propagate source metadata or extra chunks.
            mode = "RGBA" if "A" in image.getbands() and mime != "image/jpeg" else "RGB"
            image = Image.frombytes(mode, image.size, image.convert(mode).tobytes())
            for factor, quality in ((1.0, 90), (0.85, 85), (0.70, 80), (0.55, 75), (0.40, 70)):
                size = (max(1, int(image.width * factor)), max(1, int(image.height * factor)))
                candidate = image if factor == 1 else image.resize(size, Image.Resampling.LANCZOS)
                out = io.BytesIO()
                opts = {"quality": quality} if mime in ("image/jpeg", "image/webp") else {"optimize": True}
                candidate.save(out, format=FORMATS[mime], **opts)
                if len(out.getbuffer()) <= MAX_OUTPUT:
                    return out.getvalue()
            raise ValueError("rebuilt image exceeds output limit")


def rebuild_pdf(raw: bytes) -> bytes:
    with fitz.open(stream=raw, filetype="pdf") as source:
        if source.needs_pass or source.page_count < 1 or source.page_count > MAX_PAGES:
            raise ValueError("encrypted or excessive page count")
        for resolution_factor, quality in ((1.0, 85), (0.8, 80), (0.65, 75), (0.5, 70), (0.4, 65)):
            with fitz.open() as clean:
                for page in source:
                    rect = page.rect
                    if rect.width <= 0 or rect.height <= 0 or rect.width > MAX_DIMENSION or rect.height > MAX_DIMENSION:
                        raise ValueError("invalid page dimensions")
                    scale = min(PDF_SCALE, (MAX_PAGE_PIXELS / (rect.width * rect.height)) ** 0.5,
                                MAX_DIMENSION / rect.width, MAX_DIMENSION / rect.height) * resolution_factor
                    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), colorspace=fitz.csRGB, alpha=False, annots=False)
                    if pix.width * pix.height > MAX_PAGE_PIXELS or max(pix.width, pix.height) > MAX_DIMENSION:
                        raise ValueError("page render too large")
                    out_page = clean.new_page(width=rect.width, height=rect.height)
                    out_page.insert_image(out_page.rect, stream=pix.tobytes("jpeg", jpg_quality=quality))
                result = clean.tobytes(garbage=4, deflate=True)
                if len(result) <= MAX_OUTPUT:
                    return result
        raise ValueError("rebuilt PDF exceeds output limit")


def rebuild(raw: bytes, mime: str) -> bytes:
    if not raw or len(raw) > MAX_INPUT:
        raise ValueError("invalid input size")
    if mime in FORMATS:
        result = rebuild_image(raw, mime)
    elif mime == "application/pdf" and raw.startswith(b"%PDF-"):
        result = rebuild_pdf(raw)
    else:
        raise ValueError("unsupported file")
    if not result or len(result) > MAX_OUTPUT:
        raise ValueError("invalid output size")
    return result


@app.post("/rebuild")
def handle_rebuild():
    mime = request.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
    if mime not in (*FORMATS, "application/pdf"):
        return {"error": "unsupported_type"}, 415
    raw = request.get_data(cache=False)
    if not raw or len(raw) > MAX_INPUT:
        return {"error": "invalid_size"}, 413
    try:
        process = subprocess.run([sys.executable, "-B", __file__, "worker", mime], input=raw,
                                 stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                 timeout=TIMEOUT_SECONDS, check=False)
    except subprocess.TimeoutExpired:
        return {"error": "conversion_timeout"}, 504
    if process.returncode or not process.stdout or len(process.stdout) > MAX_OUTPUT:
        return {"error": "conversion_failed"}, 422
    return Response(process.stdout, content_type=mime, headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


if __name__ == "__main__" and len(sys.argv) == 3 and sys.argv[1] == "worker":
    try:
        sys.stdout.buffer.write(rebuild(sys.stdin.buffer.read(MAX_INPUT + 1), sys.argv[2]))
    except (ValueError, OSError, RuntimeError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        sys.exit(1)
