# Engineering Core Domains

## 01. Robotics & Robot Engineering

**Specialisation:** Robot Architecture
- Serial, SCARA, parallel and Cartesian robots

**Specialisation:** Robot Kinematics
- Forward and inverse kinematics, DH parameters

**Specialisation:** Robot Mechanisms
- Joint mechanisms, linkages and transmission

**Specialisation:** End Effectors
- Grippers, custom tools and attachments

**Specialisation:** Robot Integration
- Multi-axis robotic systems and hardware integration

*Removed: Robot dynamics and robot calibration. They aren't necessary for this portfolio.*

---

## 02. Motion Control & Control Engineering

**Specialisation:** Motion Control
- Positioning, homing and axis coordination

**Specialisation:** PID Control
- Closed-loop position and velocity control

**Specialisation:** Trajectory Planning
- Linear, circular and joint-space motion

**Specialisation:** Motion Profiling
- Trapezoidal and S-curve profiles

**Specialisation:** CNC Controllers
- GRBL, LinuxCNC and G-code

**Specialisation:** Real-Time Motion
- Step generation, PIO and synchronisation

---

## 03. Mechanical Design & CAD

**Specialisation:** 3D CAD Modelling
- Part modelling and assemblies

**Specialisation:** Mechanical Design
- Robot structures and mechanical components

**Specialisation:** Mechanism Design
- Gear trains, planetary and cycloidal mechanisms

**Specialisation:** Design Development
- Concept development and design iterations

**Specialisation:** CAD Platforms
- Fusion 360, Onshape, SolidWorks

*This section focuses on your actual CAD models, assemblies and design screenshots rather than generic mechanical engineering theory.*

---

## 04. Manufacturing & Fabrication

**Specialisation:** Additive Manufacturing
- FDM 3D printing and slicing

**Specialisation:** Rapid Prototyping
- Prototype development and iteration

**Specialisation:** Mechanical Fabrication
- Cutting, drilling and joining

**Specialisation:** Assembly & Integration
- Component assembly and fitting

**Specialisation:** Manufacturing Processes
- Material selection and manufacturing methods

*No CNC machining specialisation here.*

---

## 05. PCB Design & Electronics

**Specialisation:** Circuit Design
- Basic analog and digital circuits

**Specialisation:** PCB Development
- Schematic capture and PCB layout

**Specialisation:** Microcontroller Boards
- ESP32 and STM32-based boards

**Specialisation:** Electronic Interfacing
- Sensors, connectors and peripheral circuits

**Specialisation:** PCB Testing
- Assembly, debugging and validation

*Keep this section focused on your actual PCB work. You don't need to claim advanced multilayer PCB design or power electronics expertise.*

---

## 06. Embedded Systems & Firmware

**Specialisation:** Microcontrollers
- Arduino, STM32, ESP32 and RP2040

**Specialisation:** Firmware Development
- Embedded C/C++ and peripheral configuration

**Specialisation:** Sensor Integration
- Encoders, IMUs and other sensors

**Specialisation:** Communication Protocols
- SPI, I2C, UART, CAN

**Specialisation:** Distributed Systems
- Multi-controller architectures

**Specialisation:** Hardware Interfacing
- Drivers, actuators and peripherals

---

## 07. Motor Drives & Motor Control

**Specialisation:** BLDC Motor Control
- BLDC motor interfacing and control

**Specialisation:** Field-Oriented Control
- FOC implementation

**Specialisation:** Stepper Motor Control
- Stepper drivers and microstepping

**Specialisation:** Servo Motor Control
- Servo interfacing and positioning

**Specialisation:** Motor Feedback
- Encoder-based motor feedback

*Current sensing, motor characterisation and power-stage design are not listed as separate capabilities.*

---

## 08. Industrial Automation & System Integration

**Specialisation:** PLC Programming
- Ladder logic and industrial sequencing

**Specialisation:** Industrial Communication
- TCP/IP, Ethernet and Modbus TCP

**Specialisation:** Robot Integration
- Communication between multiple robotic systems

**Specialisation:** Automated Assembly
- Multi-station assembly systems

**Specialisation:** System Coordination
- PLC, robots, AMRs and supervisory controllers

**Specialisation:** HMI & Monitoring
- Machine status and production dashboards

*This is particularly relevant to your PRUVES 4.0 assembly-line concept.*

---

# Tools & Technologies

## CAD & Design

(Fusion 360) (Onshape) (SolidWorks)

## Robotics & Simulation

(ROS 2) (RoboDK) (RViz) (MATLAB)

## Embedded & Firmware

(STM32CubeIDE) (Arduino IDE) (PlatformIO) (Marlin) (Klipper) (SimpleFOC)

## Development Environment

(C) (C++) (Python) (Linux) (Git) (GitHub)

---

# Recommended Website Layout

**Central positioning:** A hands-on engineer who works across mechanical design, electronics, embedded systems, robotics and automation, with an emphasis on building and integrating complete hardware systems.

**For each specialisation, use this content structure:**

- **Your photograph:** Actual hardware, CAD screenshot or testing setup.
- **Title:** For example, Compound Planetary Gearbox Design.
- **Description:** Two or three sentences explaining what you built or implemented.
- **Tools:** Fusion 360, RP2040, STM32, etc.
- **Project link:** Connect it to NITE 369, ScrapX6 or another relevant project.

*This will let someone explore your engineering work visually instead of reading a long list of claimed skills.*

---

*Suggested hierarchy:*

**Engineering**

8 CORE DOMAINS

01. Robotics & Robot Engineering (5 specialisations)

02. Motion Control & Control Engineering (6 specialisations)

03. Mechanical Design & CAD (5 specialisations)

04. Manufacturing & Fabrication (5 specialisations)

05. PCB Design & Electronics (5 specialisations)

06. Embedded Systems & Firmware (6 specialisations)

07. Motor Drives & Motor Control (5 specialisations)

08. Industrial Automation & System Integration (6 specialisations)

---

**Tools & Technologies**

CAD & Design: (Fusion 360) (Onshape) (SolidWorks)

Robotics & Simulation: (ROS 2) (RoboDK) (RViz) (MATLAB)

Embedded & Firmware: (STM32CubeIDE) (Arduino IDE) (PlatformIO) (Marlin) (Klipper) (SimpleFOC)

Development Environment: (C) (C++) (Python) (Linux) (Git) (GitHub)
<tool_call>
<function=shell>
<parameter=command>
Start-Process python -ArgumentList '-m','http.server','8000','--bind','127.0.0.1' -WorkingDirectory "D:\projects\portfolio 2" -ErrorAction SilentlyContinue; Start-Process python -ArgumentList '-m','http.server','8080','--bind','127.0.0.1' -WorkingDirectory "D:\projects\portfolio 2" -ErrorAction SilentlyContinue; Start-Sleep -Seconds 3; python "D:\projects\portfolio 2\test_portfolio.py" 2>&1 | Select-String -Pattern "FAIL|RESULT" | ForEach-Object { $_.Line }