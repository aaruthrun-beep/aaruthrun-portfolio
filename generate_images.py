import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('images', exist_ok=True)

WIDTH = 960
HEIGHT = 600  # 16:10 aspect ratio

def create_base_canvas():
    img = Image.new('RGB', (WIDTH, HEIGHT), color='#FFFFFF')
    draw = ImageDraw.Draw(img)
    
    # Technical grid lines (hairline #F0F0F0)
    grid_size = 40
    for x in range(0, WIDTH, grid_size):
        draw.line([(x, 0), (x, HEIGHT)], fill='#F4F4F4', width=1)
    for y in range(0, HEIGHT, grid_size):
        draw.line([(0, y), (WIDTH, y)], fill='#F4F4F4', width=1)
        
    # Outer hairline border #E5E5E5
    draw.rectangle([(0, 0), (WIDTH - 1, HEIGHT - 1)], outline='#E5E5E5', width=1)
    
    # Corner registration marks
    m_len = 12
    # Top-left
    draw.line([(8, 8), (8 + m_len, 8)], fill='#111111', width=1)
    draw.line([(8, 8), (8, 8 + m_len)], fill='#111111', width=1)
    # Top-right
    draw.line([(WIDTH - 9, 8), (WIDTH - 9 - m_len, 8)], fill='#111111', width=1)
    draw.line([(WIDTH - 9, 8), (WIDTH - 9, 8 + m_len)], fill='#111111', width=1)
    # Bottom-left
    draw.line([(8, HEIGHT - 9), (8 + m_len, HEIGHT - 9)], fill='#111111', width=1)
    draw.line([(8, HEIGHT - 9), (8, HEIGHT - 9 - m_len)], fill='#111111', width=1)
    # Bottom-right
    draw.line([(WIDTH - 9, HEIGHT - 9), (WIDTH - 9 - m_len, HEIGHT - 9)], fill='#111111', width=1)
    draw.line([(WIDTH - 9, HEIGHT - 9), (WIDTH - 9, HEIGHT - 9 - m_len)], fill='#111111', width=1)
    
    return img, draw

def draw_title_block(draw, code, title, spec, rev="REV 1.2"):
    # Bottom technical title block
    bx1, by1, bx2, by2 = 30, HEIGHT - 70, WIDTH - 30, HEIGHT - 25
    draw.rectangle([(bx1, by1), (bx2, by2)], outline='#E5E5E5', fill='#FAFAFA', width=1)
    draw.line([(bx1 + 140, by1), (bx1 + 140, by2)], fill='#E5E5E5', width=1)
    draw.line([(bx2 - 120, by1), (bx2 - 120, by2)], fill='#E5E5E5', width=1)
    
    # Text
    draw.text((bx1 + 15, by1 + 15), f"SYS // {code}", fill='#0057FF')
    draw.text((bx1 + 155, by1 + 12), title.upper(), fill='#111111')
    draw.text((bx1 + 155, by1 + 27), spec, fill='#666666')
    draw.text((bx2 - 105, by1 + 15), f"STATUS: OK\n{rev}", fill='#111111')

# 1. NITE 369 (6-Axis Robotic Arm)
def gen_nite_369():
    img, draw = create_base_canvas()
    
    # Coordinate system base
    draw.rectangle([(160, 420), (320, 470)], outline='#111111', fill='#FFFFFF', width=2)
    draw.text((180, 440), "BASE PEDESTAL [J1]", fill='#666666')
    
    # Link 1 (Shoulder)
    draw.polygon([(240, 420), (220, 290), (260, 290)], outline='#111111', fill='#FFFFFF', width=2)
    draw.ellipse([(225, 275), (255, 305)], outline='#0057FF', fill='#FFFFFF', width=2)
    draw.text((270, 285), "J2: CYCLOIDAL 1:45", fill='#0057FF')
    
    # Link 2 (Upper Arm)
    draw.line([(240, 290), (450, 180)], fill='#111111', width=8)
    draw.line([(240, 290), (450, 180)], fill='#FFFFFF', width=4)
    draw.ellipse([(435, 165), (465, 195)], outline='#0057FF', fill='#FFFFFF', width=2)
    draw.text((475, 165), "J3: CYCLOIDAL 1:30", fill='#0057FF')
    
    # Link 3 (Forearm)
    draw.line([(450, 180), (640, 240)], fill='#111111', width=6)
    draw.line([(450, 180), (640, 240)], fill='#FFFFFF', width=2)
    
    # Wrist joints J4, J5, J6
    draw.ellipse([(625, 225), (655, 255)], outline='#111111', fill='#FFFFFF', width=2)
    draw.line([(640, 240), (710, 220)], fill='#111111', width=4)
    # End-effector gripper
    draw.line([(710, 205), (710, 235)], fill='#0057FF', width=3)
    draw.line([(710, 205), (740, 200)], fill='#0057FF', width=2)
    draw.line([(710, 235), (740, 240)], fill='#0057FF', width=2)
    draw.text((750, 215), "END EFFECTOR // R=650mm", fill='#111111')
    
    # Dimension arcs and callouts
    draw.arc([(100, 120), (780, 480)], start=210, end=330, fill='#CCCCCC', width=1)
    draw.text((360, 90), "[ SPHERICAL WORKSPACE ENVELOPE: R650 ]", fill='#666666')
    
    # Joint node callouts
    draw.line([(240, 290), (140, 220)], fill='#CCCCCC', width=1)
    draw.text((60, 205), "STM32F4 CAN NODE", fill='#666666')
    draw.line([(450, 180), (450, 120)], fill='#CCCCCC', width=1)
    draw.text((410, 105), "AS5047P 14-BIT", fill='#666666')
    
    draw_title_block(draw, "ROB-369", "NITE 369 6-Axis Manipulator", "6-DOF // 1.2kg Payload // ±0.08mm Repeatability")
    img.save('images/nite-369.webp', 'WEBP', quality=95)

# 2. MARS 369 (Modular Swarm Robot)
def gen_mars_369():
    import math
    img, draw = create_base_canvas()
    
    cx, cy, r = 480, 260, 150
    # Outer hexagon
    pts = []
    for i in range(6):
        angle = math.radians(60 * i)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(pts, outline='#111111', fill='#FFFFFF', width=2)
    
    # Inner hexagon
    r_in = 110
    pts_in = []
    for i in range(6):
        angle = math.radians(60 * i)
        pts_in.append((cx + r_in * math.cos(angle), cy + r_in * math.sin(angle)))
    draw.polygon(pts_in, outline='#E5E5E5', fill='#FAFAFA', width=1)
    
    # 3 Electro-permanent magnetic docking faces (alternating)
    for i in [0, 2, 4]:
        p1 = pts[i]
        p2 = pts[(i + 1) % 6]
        mx = (p1[0] + p2[0]) / 2
        my = (p1[1] + p2[1]) / 2
        draw.ellipse([(mx - 15, my - 15), (mx + 15, my + 15)], outline='#0057FF', fill='#FFFFFF', width=2)
        draw.text((mx - 12, my - 6), "EPM", fill='#0057FF')
        
    # 6 Directional IR transceivers on corners
    for i, p in enumerate(pts):
        draw.rectangle([(p[0] - 8, p[1] - 8), (p[0] + 8, p[1] + 8)], outline='#111111', fill='#FFFFFF', width=1)
        draw.text((p[0] + 12, p[1] - 6), f"IR-{i+1}", fill='#666666')
        
    # Center ESP32-S3 Core
    draw.rectangle([(cx - 45, cy - 45), (cx + 45, cy + 45)], outline='#111111', fill='#FFFFFF', width=2)
    draw.text((cx - 36, cy - 14), "ESP32-S3\n240MHz", fill='#111111')
    
    # Drive wheels
    draw.rectangle([(cx - 95, cy - 30), (cx - 75, cy + 30)], outline='#111111', fill='#111111')
    draw.rectangle([(cx + 75, cy - 30), (cx + 95, cy + 30)], outline='#111111', fill='#111111')
    draw.text((cx - 150, cy - 6), "LEFT WHEEL", fill='#666666')
    draw.text((cx + 105, cy - 6), "RIGHT WHEEL", fill='#666666')
    
    # Callout
    draw.line([(cx + 80, cy - 100), (cx + 200, cy - 130)], fill='#CCCCCC', width=1)
    draw.text((cx + 205, cy - 140), "HERMAPHRODITIC DOCKING FACE (18.5N)", fill='#0057FF')
    
    draw_title_block(draw, "SWM-369", "MARS 369 Swarm Robot", "Hexagonal // Electro-Perm Latch // ESP32-S3 Mesh")
    img.save('images/mars-369.webp', 'WEBP', quality=95)

# 3. BLDC FOC Actuator
def gen_bldc_foc():
    img, draw = create_base_canvas()
    cx, cy = 480, 260
    
    # Outer stator ring
    draw.ellipse([(cx - 160, cy - 160), (cx + 160, cy + 160)], outline='#111111', fill='#FFFFFF', width=2)
    draw.ellipse([(cx - 130, cy - 130), (cx + 130, cy + 130)], outline='#E5E5E5', fill='#FAFAFA', width=1)
    
    # Stator poles (12 teeth)
    import math
    for i in range(12):
        ang = math.radians(i * 30)
        x1 = cx + 80 * math.cos(ang)
        y1 = cy + 80 * math.sin(ang)
        x2 = cx + 125 * math.cos(ang)
        y2 = cy + 125 * math.sin(ang)
        draw.line([(x1, y1), (x2, y2)], fill='#111111', width=6)
        
    # Central hollow bore
    draw.ellipse([(cx - 45, cy - 45), (cx + 45, cy + 45)], outline='#0057FF', fill='#FFFFFF', width=2)
    draw.text((cx - 30, cy - 12), "12mm BORE\nPASS-THRU", fill='#0057FF')
    
    # AS5047P encoder indication
    draw.arc([(cx - 65, cy - 65), (cx + 65, cy + 65)], start=0, end=360, fill='#CCCCCC', width=1)
    
    # Inverter callouts
    draw.rectangle([(cx + 190, cy - 100), (cx + 340, cy - 30)], outline='#111111', fill='#FFFFFF', width=1)
    draw.text((cx + 205, cy - 85), "6-MOSFET INVERTER\n25kHz SVPWM / DRV8301", fill='#111111')
    draw.line([(cx + 150, cy - 50), (cx + 190, cy - 65)], fill='#CCCCCC', width=1)
    
    draw.rectangle([(cx - 350, cy - 100), (cx - 200, cy - 30)], outline='#111111', fill='#FFFFFF', width=1)
    draw.text((cx - 335, cy - 85), "STM32F405 FOC\nCURRENT LOOP: 25kHz", fill='#111111')
    draw.line([(cx - 200, cy - 65), (cx - 150, cy - 50)], fill='#CCCCCC', width=1)
    
    # Specs annotation
    draw.text((cx - 110, cy + 180), "TORQUE: 0.85Nm CONT / 2.4Nm PEAK", fill='#666666')
    
    draw_title_block(draw, "ACT-4310", "BLDC FOC Integrated Actuator", "KV100 // 25kHz SVPWM // 14-bit AS5047P // 2.4Nm Peak")
    img.save('images/bldc-foc.webp', 'WEBP', quality=95)

# 4. FFB Steer-by-Wire RC Car
def gen_ffb_steer():
    img, draw = create_base_canvas()
    
    # Chassis outline
    draw.rectangle([(160, 160), (440, 360)], outline='#111111', fill='#FFFFFF', width=2)
    # 4 Wheels
    draw.rectangle([(120, 130), (170, 190)], outline='#111111', fill='#111111')
    draw.rectangle([(120, 330), (170, 390)], outline='#111111', fill='#111111')
    draw.rectangle([(430, 130), (480, 190)], outline='#111111', fill='#111111')
    draw.rectangle([(430, 330), (480, 390)], outline='#111111', fill='#111111')
    
    # Front steering tie rod with load cell
    draw.line([(400, 160), (455, 160)], fill='#0057FF', width=3)
    draw.line([(400, 360), (455, 360)], fill='#0057FF', width=3)
    draw.rectangle([(380, 240), (420, 280)], outline='#0057FF', fill='#FFFFFF', width=2)
    draw.text((388, 253), "SRV", fill='#0057FF')
    draw.text((360, 180), "LOAD CELL TIE-ROD", fill='#0057FF')
    
    # Wireless telemetry link
    draw.line([(440, 260), (600, 260)], fill='#0057FF', width=1)
    draw.text((470, 240), "ESP-NOW <4.8ms", fill='#0057FF')
    
    # Direct drive steering wheel base
    cx, cy = 720, 260
    draw.ellipse([(cx - 80, cy - 80), (cx + 80, cy + 80)], outline='#111111', fill='#FFFFFF', width=3)
    draw.ellipse([(cx - 60, cy - 60), (cx + 60, cy + 60)], outline='#E5E5E5', fill='#FAFAFA', width=1)
    draw.line([(cx - 80, cy), (cx + 80, cy)], fill='#111111', width=3)
    draw.line([(cx, cy), (cx, cy + 80)], fill='#111111', width=3)
    draw.ellipse([(cx - 18, cy - 18), (cx + 18, cy + 18)], outline='#0057FF', fill='#FFFFFF', width=2)
    draw.text((cx - 40, cy + 95), "DIRECT DRIVE 4.2Nm", fill='#111111')
    
    draw_title_block(draw, "SBW-110", "FFB Steer-by-Wire RC Platform", "1:10 Scale // 4.2Nm Direct Drive Base // <4.8ms Latency")
    img.save('images/ffb-steer.webp', 'WEBP', quality=95)

# 5. ESP32-S3 Micro-Robot
def gen_esp32_robot():
    img, draw = create_base_canvas()
    cx, cy = 480, 260
    
    # Two-wheeled inverted pendulum vertical body
    draw.rectangle([(cx - 50, cy - 140), (cx + 50, cy + 60)], outline='#111111', fill='#FFFFFF', width=2)
    
    # Battery on top
    draw.rectangle([(cx - 35, cy - 130), (cx + 35, cy - 50)], outline='#E5E5E5', fill='#FAFAFA', width=1)
    draw.text((cx - 28, cy - 95), "18650 CELL\n3500mAh", fill='#666666')
    
    # Camera module
    draw.rectangle([(cx - 20, cy - 40), (cx + 20, cy)], outline='#0057FF', fill='#FFFFFF', width=1)
    draw.ellipse([(cx - 10, cy - 30), (cx + 10, cy - 10)], outline='#0057FF', fill='#FFFFFF', width=2)
    draw.text((cx + 65, cy - 25), "OV2640 CAMERA // 25 FPS", fill='#0057FF')
    draw.line([(cx + 20, cy - 20), (cx + 60, cy - 20)], fill='#0057FF', width=1)
    
    # IMU MPU6050
    draw.rectangle([(cx - 25, cy + 10), (cx + 25, cy + 45)], outline='#111111', fill='#FFFFFF', width=1)
    draw.text((cx - 22, cy + 22), "MPU6050", fill='#111111')
    draw.text((cx - 180, cy + 22), "200Hz MADGWICK FILTER", fill='#666666')
    draw.line([(cx - 60, cy + 28), (cx - 25, cy + 28)], fill='#CCCCCC', width=1)
    
    # Wheel axle & wheel
    draw.ellipse([(cx - 65, cy + 50), (cx + 65, cy + 180)], outline='#111111', fill='#FFFFFF', width=3)
    draw.ellipse([(cx - 25, cy + 90), (cx + 25, cy + 140)], outline='#0057FF', fill='#FFFFFF', width=2)
    draw.text((cx - 80, cy + 195), "DIAMETER 65mm SILICONE WHEEL", fill='#666666')
    
    draw_title_block(draw, "BAL-S3", "ESP32-S3 Self-Balancing Agent", "70x60x95mm // 200Hz Inverted Pendulum Loop // OV2640 Wi-Fi Video")
    img.save('images/esp32-robot.webp', 'WEBP', quality=95)

# 6. CAT Autonomous Rover
def gen_cat_rover():
    img, draw = create_base_canvas()
    cx, cy = 480, 260
    
    # Rocker-bogie chassis
    draw.line([(280, 280), (480, 230)], fill='#111111', width=6)
    draw.line([(480, 230), (680, 280)], fill='#111111', width=6)
    
    # 4 wheels (side view shows 2 main + rear bogie)
    draw.rectangle([(230, 240), (290, 350)], outline='#111111', fill='#FFFFFF', width=2)
    draw.rectangle([(670, 240), (730, 350)], outline='#111111', fill='#FFFFFF', width=2)
    draw.rectangle([(450, 260), (510, 350)], outline='#111111', fill='#FFFFFF', width=2)
    
    # Chassis body box
    draw.rectangle([(340, 160), (620, 240)], outline='#111111', fill='#FAFAFA', width=2)
    draw.text((360, 195), "IP65 SEALED AVIONICS BAY", fill='#111111')
    
    # LiDAR on top
    draw.rectangle([(450, 110), (510, 160)], outline='#0057FF', fill='#FFFFFF', width=2)
    draw.text((430, 90), "RPLIDAR A2M8 (12m)", fill='#0057FF')
    
    # RTK-GPS mast
    draw.line([(380, 160), (380, 80)], fill='#111111', width=2)
    draw.ellipse([(365, 65), (395, 85)], outline='#0057FF', fill='#FFFFFF', width=2)
    draw.text((320, 48), "RTK-GPS <2cm ACCURACY", fill='#0057FF')
    
    draw_title_block(draw, "ROV-CAT", "CAT Autonomous Field Rover", "4WD // RTK-GPS <2cm // Slamtec A2 LiDAR // ROS2 Nav2 // 4h Battery")
    img.save('images/cat-rover.webp', 'WEBP', quality=95)

# 7. Titan-Klipper CoreXY
def gen_titan_klipper():
    img, draw = create_base_canvas()
    cx, cy = 480, 260
    
    # Frame cube (Isometric-like projection)
    # Front face
    draw.rectangle([(300, 110), (660, 430)], outline='#111111', fill='#FFFFFF', width=3)
    # 3030 extrusions representation
    draw.rectangle([(320, 130), (640, 410)], outline='#E5E5E5', fill='#FAFAFA', width=1)
    
    # Gantry linear rail
    draw.line([(320, 220), (640, 220)], fill='#111111', width=5)
    draw.line([(320, 220), (640, 220)], fill='#FFFFFF', width=2)
    
    # Toolhead
    draw.rectangle([(450, 195), (510, 255)], outline='#0057FF', fill='#FFFFFF', width=2)
    draw.text((455, 218), "CAN\nHEAD", fill='#0057FF')
    draw.line([(480, 255), (480, 280)], fill='#0057FF', width=3)  # Nozzle
    
    # Print bed
    draw.rectangle([(350, 310), (610, 330)], outline='#111111', fill='#FFFFFF', width=2)
    draw.text((410, 340), "MIC-6 BED (300x300mm)", fill='#666666')
    
    # Steppers on top corners
    draw.rectangle([(280, 90), (320, 130)], outline='#111111', fill='#111111')
    draw.rectangle([(640, 90), (680, 130)], outline='#111111', fill='#111111')
    draw.text((220, 75), "NEMA 17 MOTOR A", fill='#666666')
    draw.text((610, 75), "NEMA 17 MOTOR B", fill='#666666')
    
    # Input shaping annotation
    draw.text((340, 150), "INPUT SHAPING: 68.4Hz MZV // 25,000 mm/s²", fill='#0057FF')
    
    draw_title_block(draw, "FAB-COREXY", "Titan-Klipper CoreXY Fabricator", "300x300x350mm // 500mm/s @ 25k Accel // CAN Toolhead // 65°C Chamber")
    img.save('images/titan-klipper.webp', 'WEBP', quality=95)

# 8. MARS Swarm Diagram (For Startup page)
def gen_mars_diagram():
    img, draw = create_base_canvas()
    cx, cy = 480, 240
    
    # 3 docked hexagonal modules
    import math
    def draw_hex(ox, oy, label):
        r = 75
        pts = []
        for i in range(6):
            ang = math.radians(60 * i)
            pts.append((ox + r * math.cos(ang), oy + r * math.sin(ang)))
        draw.polygon(pts, outline='#111111', fill='#FFFFFF', width=2)
        draw.text((ox - 30, oy - 8), label, fill='#111111')
        
    draw_hex(cx - 110, cy, "NODE-01")
    draw_hex(cx + 40, cy, "NODE-02")
    draw_hex(cx - 35, cy + 125, "NODE-03")
    
    # Latch indicators between nodes
    draw.text((cx - 45, cy - 25), "[ EPM LATCH ]", fill='#0057FF')
    draw.text((cx - 85, cy + 60), "[ EPM LATCH ]", fill='#0057FF')
    draw.text((cx + 10, cy + 60), "[ EPM LATCH ]", fill='#0057FF')
    
    # Data bus arrows
    draw.text((200, 100), "DECENTRALIZED PEER-TO-PEER IR DISCOVERY", fill='#0057FF')
    draw.text((200, 125), "EMERGENT SWARM RECONFIGURATION ARCHITECTURE", fill='#666666')
    
    draw_title_block(draw, "AVANI-SYS", "MARS Reconfigurable Swarm Lattice", "Dynamic Structural Docking & Autonomous Load Sharing")
    img.save('images/mars-swarm-diagram.webp', 'WEBP', quality=95)

# 9. Avatar / Engineer profile badge
def gen_avatar():
    img = Image.new('RGB', (400, 400), color='#FFFFFF')
    draw = ImageDraw.Draw(img)
    # Grid
    for i in range(0, 400, 20):
        draw.line([(i, 0), (i, 400)], fill='#F8F8F8', width=1)
        draw.line([(0, i), (400, i)], fill='#F8F8F8', width=1)
    draw.rectangle([(0, 0), (399, 399)], outline='#E5E5E5', width=1)
    
    # Precision target reticle
    draw.ellipse([(80, 80), (320, 320)], outline='#111111', width=2)
    draw.ellipse([(140, 140), (260, 260)], outline='#0057FF', width=2)
    draw.line([(40, 200), (360, 200)], fill='#E5E5E5', width=1)
    draw.line([(200, 40), (200, 360)], fill='#E5E5E5', width=1)
    
    draw.text((150, 175), "AARUTHRUN", fill='#111111')
    draw.text((155, 195), "ROBOTICS", fill='#0057FF')
    draw.text((140, 215), "PSG TECH '26", fill='#666666')
    
    img.save('images/avatar.webp', 'WEBP', quality=95)

# 10. OG Image
def gen_og_image():
    img, draw = create_base_canvas()
    draw.text((80, 140), "AARUTHRUN // PORTFOLIO", fill='#0057FF')
    draw.text((80, 180), "ROBOTICS & AUTOMATION ENGINEER", fill='#111111')
    draw.text((80, 230), "B.E. Robotics & Automation (PSG Tech) | Diploma in Mechatronics", fill='#666666')
    draw.text((80, 270), "Manipulators • BLDC FOC • Swarm Systems • Embedded Real-Time Firmware", fill='#111111')
    
    draw_title_block(draw, "SYSTEM", "AARUTHRUN TECHNICAL PORTFOLIO", "Concurrent Timeline • Multi-Domain Skills • Hardware Projects")
    img.save('images/og-image.webp', 'WEBP', quality=95)

if __name__ == '__main__':
    gen_nite_369()
    gen_mars_369()
    gen_bldc_foc()
    gen_ffb_steer()
    gen_esp32_robot()
    gen_cat_rover()
    gen_titan_klipper()
    gen_mars_diagram()
    gen_avatar()
    gen_og_image()
    print("All technical WebP images generated successfully!")
