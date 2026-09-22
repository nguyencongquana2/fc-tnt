import math
from PIL import Image, ImageDraw, ImageFont

def create_fc_tnt_logo(size=512):
    # Create image with RGBA
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center_x, center_y = size / 2, size / 2
    radius = size * 0.46
    
    # Outer Glow Ring (Emerald / Cyan)
    for i in range(12):
        r = radius + (12 - i) * (size / 120)
        alpha = int(18 + i * 15)
        # Gradient color from emerald (16, 185, 129) to cyan (6, 182, 212)
        draw.ellipse(
            [center_x - r, center_y - r, center_x + r, center_y + r],
            outline=(16, 185, 129, alpha),
            width=int(size * 0.008)
        )
        
    # Main Shield / Circle Background (Deep Slate Blue)
    draw.ellipse(
        [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
        fill=(15, 23, 42, 255),  # #0f172a
        outline=(16, 185, 129, 255), # #10b981
        width=int(size * 0.035)
    )
    
    # Inner border (Cyan accent)
    inner_r = radius * 0.90
    draw.ellipse(
        [center_x - inner_r, center_y - inner_r, center_x + inner_r, center_y + inner_r],
        outline=(6, 182, 212, 180), # #06b6d4
        width=int(size * 0.012)
    )
    
    # Gold Stars at Top (⭐⭐⭐)
    star_y = center_y - radius * 0.68
    star_offsets = [-size * 0.16, 0, size * 0.16]
    star_sizes = [size * 0.032, size * 0.042, size * 0.032]
    
    for offset_x, star_r in zip(star_offsets, star_sizes):
        sx = center_x + offset_x
        sy = star_y if offset_x == 0 else star_y + size * 0.02
        # Draw a 5-pointed star
        points = []
        for p in range(10):
            angle = p * math.pi / 5 - math.pi / 2
            r_val = star_r if p % 2 == 0 else star_r * 0.45
            points.append((sx + r_val * math.cos(angle), sy + r_val * math.sin(angle)))
        draw.polygon(points, fill=(245, 158, 11, 255)) # Gold #f59e0b
        draw.polygon(points, outline=(251, 191, 36, 255))
        
    # Soccer Ball in the center
    ball_r = size * 0.28
    ball_y = center_y + size * 0.02
    
    # Ball base circle (White)
    draw.ellipse(
        [center_x - ball_r, ball_y - ball_r, center_x + ball_r, ball_y + ball_r],
        fill=(248, 250, 252, 255), # White slate
        outline=(30, 41, 59, 255),
        width=int(size * 0.015)
    )
    
    # Center Pentagon of Soccer ball
    pent_r = ball_r * 0.40
    pent_points = []
    for p in range(5):
        angle = p * 2 * math.pi / 5 - math.pi / 2
        pent_points.append((center_x + pent_r * math.cos(angle), ball_y + pent_r * math.sin(angle)))
    draw.polygon(pent_points, fill=(30, 41, 59, 255)) # Dark slate
    
    # Pentagons connected to center
    for i in range(5):
        p1 = pent_points[i]
        p2 = pent_points[(i + 1) % 5]
        angle_mid = (i * 2 + 1) * math.pi / 5 - math.pi / 2
        
        # Outer edge line
        out_x = center_x + ball_r * 0.96 * math.cos(i * 2 * math.pi / 5 - math.pi / 2)
        out_y = ball_y + ball_r * 0.96 * math.sin(i * 2 * math.pi / 5 - math.pi / 2)
        draw.line([p1, (out_x, out_y)], fill=(30, 41, 59, 255), width=int(size * 0.012))
        
        # Outer small edge patches
        edge_angle = i * 2 * math.pi / 5 - math.pi / 2
        patch_r1 = ball_r * 0.72
        patch_r2 = ball_r * 0.98
        pt_a = (center_x + patch_r1 * math.cos(edge_angle - 0.22), ball_y + patch_r1 * math.sin(edge_angle - 0.22))
        pt_b = (center_x + patch_r2 * math.cos(edge_angle - 0.15), ball_y + patch_r2 * math.sin(edge_angle - 0.15))
        pt_c = (center_x + patch_r2 * math.cos(edge_angle + 0.15), ball_y + patch_r2 * math.sin(edge_angle + 0.15))
        pt_d = (center_x + patch_r1 * math.cos(edge_angle + 0.22), ball_y + patch_r1 * math.sin(edge_angle + 0.22))
        draw.polygon([pt_a, pt_b, pt_c, pt_d], fill=(51, 65, 85, 255))
        
    # Ribbon / Banner for "FC TNT"
    banner_w = size * 0.76
    banner_h = size * 0.20
    banner_y = center_y + radius * 0.46
    
    # Banner background shape (slanted ribbon)
    ribbon_pts = [
        (center_x - banner_w/2, banner_y),
        (center_x + banner_w/2, banner_y),
        (center_x + banner_w/2 - size*0.04, banner_y + banner_h),
        (center_x - banner_w/2 + size*0.04, banner_y + banner_h)
    ]
    # Banner shadow
    shadow_pts = [(x, y + size*0.015) for x, y in ribbon_pts]
    draw.polygon(shadow_pts, fill=(0, 0, 0, 140))
    # Banner main
    draw.polygon(ribbon_pts, fill=(16, 185, 129, 255), outline=(255, 255, 255, 220), width=int(size * 0.012))
    
    # Try loading a bold font, or fallback to default
    try:
        font_large = ImageFont.truetype("arialbd.ttf", int(size * 0.12))
        font_small = ImageFont.truetype("arialbd.ttf", int(size * 0.065))
    except Exception:
        try:
            font_large = ImageFont.truetype("DejaVuSans-Bold.ttf", int(size * 0.12))
            font_small = ImageFont.truetype("DejaVuSans-Bold.ttf", int(size * 0.065))
        except Exception:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
            
    # Text "FC TNT"
    text = "FC TNT"
    try:
        bbox = draw.textbbox((0, 0), text, font=font_large)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
    except Exception:
        tw, th = size * 0.35, size * 0.1
    tx = center_x - tw / 2
    ty = banner_y + (banner_h - th) / 2 - size * 0.01
    
    # Text Shadow
    draw.text((tx + 2, ty + 2), text, font=font_large, fill=(15, 23, 42, 255))
    # Text White
    draw.text((tx, ty), text, font=font_large, fill=(255, 255, 255, 255))
    
    # Top text "EST. 2026" or "PHỦI HÀ NỘI"
    sub_text = "EST. 2026"
    try:
        s_bbox = draw.textbbox((0, 0), sub_text, font=font_small)
        stw = s_bbox[2] - s_bbox[0]
    except Exception:
        stw = size * 0.25
    stx = center_x - stw / 2
    sty = center_y - radius * 0.40
    draw.text((stx + 1, sty + 1), sub_text, font=font_small, fill=(0, 0, 0, 180))
    draw.text((stx, sty), sub_text, font=font_small, fill=(6, 182, 212, 255))
    
    return img

if __name__ == "__main__":
    import os
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icons_dir = os.path.join(base_dir, "assets", "icons")
    images_dir = os.path.join(base_dir, "assets", "images")
    os.makedirs(icons_dir, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)
    
    # 512x512 Master Logo
    logo_512 = create_fc_tnt_logo(512)
    logo_512.save(os.path.join(images_dir, "logo-512.png"), format="PNG")
    logo_512.save(os.path.join(images_dir, "logo.png"), format="PNG")
    
    # 192x192 Icon
    logo_192 = logo_512.resize((192, 192), Image.Resampling.LANCZOS)
    logo_192.save(os.path.join(icons_dir, "favicon-192.png"), format="PNG")
    logo_192.save(os.path.join(icons_dir, "favicon.png"), format="PNG")
    
    # 180x180 Apple Touch Icon
    logo_180 = logo_512.resize((180, 180), Image.Resampling.LANCZOS)
    logo_180.save(os.path.join(icons_dir, "apple-touch-icon.png"), format="PNG")
    
    # 48x48 Icon for Google Search Favicon requirement (multiple of 48px)
    logo_48 = logo_512.resize((48, 48), Image.Resampling.LANCZOS)
    logo_48.save(os.path.join(icons_dir, "favicon-48.png"), format="PNG")
    
    # Favicon.ico with multi-size (16, 32, 48, 64)
    logo_16 = logo_512.resize((16, 16), Image.Resampling.LANCZOS)
    logo_32 = logo_512.resize((32, 32), Image.Resampling.LANCZOS)
    logo_64 = logo_512.resize((64, 64), Image.Resampling.LANCZOS)
    
    ico_path = os.path.join(icons_dir, "favicon.ico")
    logo_512.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    
    print("Successfully generated all favicon & logo assets in assets/icons and assets/images!")
