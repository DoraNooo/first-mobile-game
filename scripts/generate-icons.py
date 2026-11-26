#!/usr/bin/env python3
"""
Generate charming glossy PWA icons for CHARLIE:
  - icons/icon-512.png (512x512)
  - icons/icon-192.png (192x192)
  - icons/apple-touch-icon.png (180x180)

Renders at 1024x1024 (2x supersampled) with PIL for smooth anti-aliasing.
Designed with generous maskable safe-zone padding so Charlie and his 3
lava droplets stay well inside circular/squircle adaptive icon masks.
"""

import math
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

SIZE = 1024
CX = SIZE * 0.5
CY = SIZE * 0.51


def lerp(a, b, t):
    return a + (b - a) * t


def make_radial_gradient(size, center, max_r, stops):
    """Create an RGBA radial gradient image using smooth concentric ellipses."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = center
    steps = 110
    for i in range(steps, 0, -1):
        t = i / steps  # 1.0 at outer edge -> 0.0 at center
        r = max_r * t
        color = stops[-1][1]
        for s0, s1 in zip(stops, stops[1:]):
            if s0[0] <= t <= s1[0]:
                local_t = (t - s0[0]) / max(1e-6, (s1[0] - s0[0]))
                color = tuple(
                    int(round(lerp(a, b, local_t))) for a, b in zip(s0[1], s1[1])
                )
                break
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    return img


def composite_soft_shape(canvas, mask_img, rgb, alpha_scale=1.0, blur=0):
    """Composite a solid RGB color using an L-mode mask (avoids dark premultiplication halos)."""
    m = mask_img.filter(ImageFilter.GaussianBlur(radius=blur)) if blur > 0 else mask_img
    if alpha_scale < 1.0:
        m = m.point(lambda p: int(round(p * alpha_scale)))
    layer = Image.new("RGBA", canvas.size, rgb + (0,))
    layer.putalpha(m)
    canvas.alpha_composite(layer)


def organic_blob_points(cx, cy, base_r, num_pts=180):
    """Plump, friendly, subtly organic lava-lamp silhouette (maskable-safe)."""
    pts = []
    for i in range(num_pts):
        theta = (i / num_pts) * math.tau
        wobble = (
            1.0
            + 0.022 * math.sin(theta * 2 - 0.5)
            + 0.015 * math.cos(theta * 3 + 0.4)
            + 0.018 * math.sin(theta)  # subtly plump lower cheeks
        )
        rx = base_r * 1.02 * wobble
        ry = base_r * 0.98 * wobble
        pts.append((cx + math.cos(theta) * rx, cy + math.sin(theta) * ry))
    return pts


def draw_droplet(canvas, x, y, r):
    """Draw a glowing coral-amber satellite lava droplet with a crisp glossy highlight."""
    glow = make_radial_gradient(
        SIZE,
        (x, y),
        r * 2.4,
        [
            (0.0, (255, 160, 108, 125)),
            (0.5, (255, 118, 98, 42)),
            (1.0, (255, 102, 102, 0)),
        ],
    )
    canvas.alpha_composite(glow)

    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).ellipse((x - r, y - r, x + r, y + r), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=0.8))

    body = make_radial_gradient(
        SIZE,
        (x - r * 0.28, y - r * 0.30),
        r * 1.35,
        [
            (0.0, (255, 224, 178, 255)),
            (0.42, (255, 168, 112, 255)),
            (0.85, (255, 104, 102, 255)),
            (1.0, (226, 72, 86, 255)),
        ],
    )
    body_clipped = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    body_clipped.paste(body, (0, 0), mask)
    canvas.alpha_composite(body_clipped)

    # Pure-white glossy highlight (no dark halo)
    hl_mask = Image.new("L", (SIZE, SIZE), 0)
    hr = r * 0.27
    hx, hy = x - r * 0.28, y - r * 0.28
    ImageDraw.Draw(hl_mask).ellipse((hx - hr, hy - hr, hx + hr, hy + hr), fill=255)
    composite_soft_shape(canvas, hl_mask, (255, 255, 255), alpha_scale=0.68, blur=r * 0.08)


def draw_rotated_ellipse_highlight(canvas, center, rx, ry, angle_deg, rgb, alpha, blur=0):
    """Draw a halo-free anti-aliased rotated ellipse onto canvas."""
    pad = int(max(rx, ry) * 2.4) + 24
    mask_local = Image.new("L", (pad * 2, pad * 2), 0)
    ImageDraw.Draw(mask_local).ellipse((pad - rx, pad - ry, pad + rx, pad + ry), fill=255)
    rot_mask = mask_local.rotate(-angle_deg, resample=Image.BICUBIC, expand=False)
    if blur > 0:
        rot_mask = rot_mask.filter(ImageFilter.GaussianBlur(radius=blur))
    rot_mask = rot_mask.point(lambda p: int(round(p * alpha)))
    layer = Image.new("RGBA", (pad * 2, pad * 2), rgb + (0,))
    layer.putalpha(rot_mask)
    x0 = int(round(center[0] - pad))
    y0 = int(round(center[1] - pad))
    canvas.alpha_composite(layer, (x0, y0))


def quadratic_bezier(p0, p1, p2, steps=64):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1.0 - t
        x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
        y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
        pts.append((x, y))
    return pts


def draw_smooth_stroke(draw, pts, width, fill):
    """Draw an ultra-smooth round-capped curve using dense overlapping circles."""
    r = width * 0.5
    for px, py in pts:
        draw.ellipse((px - r, py - r, px + r, py + r), fill=fill)


def render_charlie_icon():
    # 1. Deep teal bioluminescent background (#081b25 base with soft radial glow)
    canvas = Image.new("RGBA", (SIZE, SIZE), (8, 27, 37, 255))
    bg_grad = make_radial_gradient(
        SIZE,
        (CX, CY - SIZE * 0.04),
        SIZE * 0.76,
        [
            (0.0, (18, 52, 68, 255)),
            (0.45, (10, 33, 45, 255)),
            (0.82, (8, 27, 37, 255)),
            (1.0, (6, 18, 26, 255)),
        ],
    )
    canvas.alpha_composite(bg_grad)

    # Subtle bioluminescent teal ambient motes (halo-free)
    mote_mask = Image.new("L", (SIZE, SIZE), 0)
    mdraw = ImageDraw.Draw(mote_mask)
    for mx, my, mr, intensity in [
        (0.18, 0.24, 10, 110),
        (0.83, 0.20, 8, 95),
        (0.85, 0.78, 12, 85),
        (0.16, 0.76, 9, 85),
        (0.28, 0.14, 6, 75),
        (0.74, 0.85, 7, 80),
    ]:
        x, y = mx * SIZE, my * SIZE
        mdraw.ellipse((x - mr, y - mr, x + mr, y + mr), fill=intensity)
    composite_soft_shape(canvas, mote_mask, (110, 231, 218), alpha_scale=0.6, blur=5)

    # 2. Warm bioluminescent aura behind Charlie (maskable-safe)
    body_r = SIZE * 0.268  # ~53.6% diameter -> comfortably inside 66% maskable safe zone
    aura = make_radial_gradient(
        SIZE,
        (CX, CY),
        body_r * 1.92,
        [
            (0.0, (255, 168, 112, 125)),
            (0.42, (255, 134, 98, 72)),
            (0.75, (255, 102, 102, 22)),
            (1.0, (255, 102, 102, 0)),
        ],
    )
    canvas.alpha_composite(aura)

    # 3. Three tiny glowing lava droplets nearby (all inside maskable safe zone)
    droplets = [
        (CX - body_r * 1.16, CY - body_r * 0.70, body_r * 0.175),  # top-left
        (CX + body_r * 1.16, CY - body_r * 0.50, body_r * 0.145),  # top-right
        (CX - body_r * 0.96, CY + body_r * 0.92, body_r * 0.130),  # bottom-left
    ]
    for dx, dy, dr in droplets:
        draw_droplet(canvas, dx, dy, dr)

    # 4. Main Charlie organic lava-lamp body
    pts = organic_blob_points(CX, CY, body_r)
    body_mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(body_mask).polygon(pts, fill=255)
    body_mask_aa = body_mask.filter(ImageFilter.GaussianBlur(radius=1.0))

    # Rich coral-amber radial gradient (oversized radius so bottom-right edge is 100% covered)
    body_grad = make_radial_gradient(
        SIZE,
        (CX - body_r * 0.26, CY - body_r * 0.30),
        body_r * 1.65,
        [
            (0.0, (255, 226, 178, 255)),   # hot golden-peach core
            (0.32, (255, 174, 114, 255)),  # warm amber-coral
            (0.70, (255, 106, 100, 255)),  # vibrant coral
            (1.0, (224, 68, 86, 255)),     # deep coral-rose edge
        ],
    )

    # Internal convection bubbles & warm bounce glow (clipped to body)
    interior = body_grad.copy()
    bounce = make_radial_gradient(
        SIZE,
        (CX + body_r * 0.36, CY + body_r * 0.42),
        body_r * 0.78,
        [
            (0.0, (255, 224, 168, 95)),
            (0.6, (255, 178, 120, 36)),
            (1.0, (255, 168, 112, 0)),
        ],
    )
    interior.alpha_composite(bounce)

    for bx, by, br in [
        (CX - body_r * 0.42, CY + body_r * 0.34, body_r * 0.24),
        (CX + body_r * 0.48, CY - body_r * 0.24, body_r * 0.20),
        (CX + body_r * 0.14, CY + body_r * 0.56, body_r * 0.17),
    ]:
        bub = make_radial_gradient(
            SIZE,
            (bx - br * 0.2, by - br * 0.2),
            br,
            [
                (0.0, (255, 232, 186, 105)),
                (0.65, (255, 182, 122, 42)),
                (1.0, (255, 168, 112, 0)),
            ],
        )
        interior.alpha_composite(bub)

    # Clean, halo-free glossy liquid top-left highlight & sparkle dot
    draw_rotated_ellipse_highlight(
        interior,
        (CX - body_r * 0.34, CY - body_r * 0.47),
        body_r * 0.26,
        body_r * 0.12,
        -32,
        (255, 255, 255),
        alpha=0.44,
        blur=5,
    )
    draw_rotated_ellipse_highlight(
        interior,
        (CX - body_r * 0.56, CY - body_r * 0.28),
        body_r * 0.068,
        body_r * 0.045,
        22,
        (255, 255, 255),
        alpha=0.68,
        blur=2,
    )

    body_clipped = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    body_clipped.paste(interior, (0, 0), body_mask_aa)
    canvas.alpha_composite(body_clipped)

    # Smooth luminous inner rim highlight derived cleanly from body_mask
    eroded = body_mask.filter(ImageFilter.MinFilter(size=15))
    rim_mask = ImageChops.subtract(body_mask, eroded).filter(ImageFilter.GaussianBlur(radius=1.5))
    composite_soft_shape(canvas, rim_mask, (255, 242, 224), alpha_scale=0.34, blur=0)

    # 5. Cute expressive face (rosy cheeks, glossy dark-berry eyes, smile + 2 little white teeth)
    dark_berry = (46, 16, 36, 255)
    eye_spacing = body_r * 0.295
    eye_y = CY - body_r * 0.065

    # Soft rosy cheeks (halo-free)
    cheek_mask = Image.new("L", (SIZE, SIZE), 0)
    cdraw = ImageDraw.Draw(cheek_mask)
    for side in (-1, 1):
        chx = CX + side * eye_spacing * 1.24
        chy = CY + body_r * 0.125
        crx = body_r * 0.135
        cry = body_r * 0.082
        cdraw.ellipse((chx - crx, chy - cry, chx + crx, chy + cry), fill=255)
    composite_soft_shape(canvas, cheek_mask, (255, 86, 134), alpha_scale=0.42, blur=body_r * 0.05)

    # Face elements layer
    face_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(face_layer)

    # Glossy dark-berry eyes with primary + secondary white catchlights
    eye_r = body_r * 0.155
    for side in (-1, 1):
        ex = CX + side * eye_spacing
        ey = eye_y
        fdraw.ellipse(
            (ex - eye_r * 0.95, ey - eye_r * 1.07, ex + eye_r * 0.95, ey + eye_r * 1.07),
            fill=dark_berry,
        )
        # Primary crisp white catchlight (top-left)
        c1_x = ex - eye_r * 0.28
        c1_y = ey - eye_r * 0.33
        c1_r = eye_r * 0.36
        fdraw.ellipse((c1_x - c1_r, c1_y - c1_r, c1_x + c1_r, c1_y + c1_r), fill=(255, 255, 255, 255))

        # Tiny secondary sparkle catchlight (bottom-right)
        c2_x = ex + eye_r * 0.27
        c2_y = ey + eye_r * 0.29
        c2_r = eye_r * 0.155
        fdraw.ellipse((c2_x - c2_r, c2_y - c2_r, c2_x + c2_r, c2_y + c2_r), fill=(255, 255, 255, 230))

    # Cute dark-berry smile with TWO crisp little white teeth peeking down!
    mouth_y = CY + body_r * 0.17
    mw = body_r * 0.255
    smile_depth = body_r * 0.135

    lip_y = mouth_y + smile_depth * 0.34
    span_half_w = mw * 0.86
    tooth_h = body_r * 0.108
    tooth_offset = span_half_w * 0.45
    tooth_half_w = max(tooth_h * 0.44, span_half_w * 0.22)
    tooth_outline_w = body_r * 0.022

    for side in (-1, 1):
        tx = CX + side * tooth_offset
        tip_x = tx - side * tooth_half_w * 0.10
        tip_y = lip_y + tooth_h
        left_edge = quadratic_bezier(
            (tx - tooth_half_w, lip_y),
            (tx - tooth_half_w * 0.52, lip_y + tooth_h * 0.72),
            (tip_x, tip_y),
            steps=24,
        )
        right_edge = quadratic_bezier(
            (tip_x, tip_y),
            (tx + tooth_half_w * 0.52, lip_y + tooth_h * 0.72),
            (tx + tooth_half_w, lip_y),
            steps=24,
        )
        tooth_poly = left_edge + right_edge[1:]
        fdraw.polygon(tooth_poly, fill=(255, 255, 255, 255))
        draw_smooth_stroke(fdraw, tooth_poly, tooth_outline_w, dark_berry)

    # Smooth curved dark-berry smile stroke over the tooth roots
    smile_pts = quadratic_bezier(
        (CX - mw, mouth_y),
        (CX, mouth_y + smile_depth),
        (CX + mw, mouth_y),
        steps=90,
    )
    draw_smooth_stroke(fdraw, smile_pts, body_r * 0.056, dark_berry)

    canvas.alpha_composite(face_layer)

    # Flatten to opaque RGB PNG
    final_rgb = Image.new("RGB", (SIZE, SIZE), (8, 27, 37))
    final_rgb.paste(canvas, (0, 0), canvas)
    return final_rgb


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icons_dir = os.path.join(repo_root, "icons")
    os.makedirs(icons_dir, exist_ok=True)

    master = render_charlie_icon()
    outputs = [
        ("icon-512.png", 512),
        ("icon-192.png", 192),
        ("apple-touch-icon.png", 180),
    ]
    for filename, px in outputs:
        out_path = os.path.join(icons_dir, filename)
        resized = master.resize((px, px), Image.LANCZOS)
        resized.save(out_path, format="PNG", optimize=True)
        print(f"Generated {out_path} ({px}x{px}, {os.path.getsize(out_path)} bytes)")


if __name__ == "__main__":
    main()
