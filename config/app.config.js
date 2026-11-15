/**
 * AARUTHRUN PORTFOLIO — APPLICATION CONFIGURATION
 * Centralized configuration for all app-wide settings
 * Imported by modules that need shared constants
 */

const AppConfig = (function () {
  'use strict';

  // Application metadata
  const APP = {
    name: 'Aaruthrun Portfolio',
    version: '2.0.0',
    author: 'Aaruthrun Saravanakumar',
    description: 'Robotics & Automation Engineering Portfolio',
    baseUrl: window.location.origin + window.location.pathname.replace(/\/[^\/]+$/, '') || '.',
  };

  // Site metadata for SEO/meta tags
  const SITE = {
    title: 'Aaruthrun — Robotics & Automation Engineer',
    defaultTitle: 'Aaruthrun — Robotics & Automation Engineer | Mechatronics Portfolio',
    description: 'Technical portfolio of Aaruthrun, Robotics & Automation Engineering student at PSG College of Technology. 6-DOF manipulators, BLDC FOC motor control, autonomous swarms, and embedded real-time systems.',
    ogImage: 'images/aaruthrun.jpeg',
    twitterCard: 'summary_large_image',
  };

  // Author information
  const AUTHOR = {
    name: 'Aaruthrun',
    fullName: 'Aaruthrun Saravanakumar',
    email: 'aaruthrun@gmail.com',
    github: 'https://github.com/aaruthrun-beep',
    githubHandle: '@aaruthrun-beep',
    linkedin: 'https://linkedin.com/in/aaruthrun-saravanakumar',
    location: {
      department: 'Department of Robotics & Automation Engineering',
      institution: 'PSG College of Technology',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
    },
    tags: ['ROBOTICS', 'AUTOMATION', 'EMBEDDED', 'CONTROL SYSTEMS'],
  };

  // Navigation configuration
  const NAV = {
    items: [
      { label: 'About', href: 'index.html', priority: 1 },
      { label: 'Projects', href: 'projects.html', priority: 2 },
      { label: 'Timeline', href: 'timeline.html', priority: 3 },
      { label: 'Gallery', href: 'gallery.html', priority: 4 },
      { label: 'Skills', href: 'skills.html', priority: 5 },
      { label: 'Startups', href: 'startup.html', priority: 6 },
      { label: 'Blog', href: 'blog.html', priority: 7 },
      { label: 'Education', href: 'education.html', priority: 8 },
      { label: 'Contact', href: 'contact.html', priority: 9 },
    ],
    brand: {
      label: 'AARUTHRUN',
      href: 'index.html',
    },
  };

  // Footer configuration
  const FOOTER = {
    currentYear: new Date().getFullYear(),
    links: {
      navigation: [
        { label: 'About & Home', href: 'index.html' },
        { label: 'Filterable Project Archive', href: 'projects.html' },
        { label: 'Concurrent Project Gantt', href: 'timeline.html' },
        { label: 'Infinite Photo Gallery', href: 'gallery.html' },
        { label: 'Cross-Linked Skills Matrix', href: 'skills.html' },
        { label: 'Startups (Dynamics & Agrotech)', href: 'startup.html' },
        { label: 'Engineering Blog', href: 'blog.html' },
        { label: 'Education & Credentials', href: 'education.html' },
      ],
      connect: [
        { label: 'aaruthrun@gmail.com', href: 'mailto:aaruthrun@gmail.com', external: true },
        { label: 'GitHub // @aaruthrun-beep', href: 'https://github.com/aaruthrun-beep', external: true },
        { label: 'LinkedIn Profile', href: 'https://linkedin.com/in/aaruthrun-saravanakumar', external: true },
        { label: 'Send Secure Message', href: 'contact.html' },
        { label: 'Technical Bio & Philosophy', href: 'index.html#about-bio' },
      ],
    },
    quotes: [
      {
        text: '"Ere long intelligence — transmitted without wires — will throb through the earth like a pulse through a living organism."',
        author: 'NIKOLA TESLA',
        source: 'ELECTRICAL ENGINEER, JUN 1892',
      },
    ],
    credits: [
      'Built with semantic HTML5, pure CSS, and vanilla JS.',
      'HOSTED_ON: GITHUB_PAGES // WCAG_AA // TESLA IMAGES: WIKIPEDIA COMMONS',
    ],
  };

  // Data paths
  const DATA = {
    projectsJson: './data/projects.json',
    projectsJsonFallback: './projects.json',
    imagesDir: 'images/',
  };

  // Animation configuration
  const ANIMATIONS = {
    reveal: {
      threshold: 0.06,
      rootMargin: '0px 0px -48px 0px',
      duration: 550,
      staggerDuration: 450,
      staggerDelay: 80,
      cardDuration: 500,
      cardDelay: 70,
    },
    transition: {
      default: '150ms ease',
      hover: '150ms ease',
    },
    reducedMotion: {
      prefers: '(prefers-reduced-motion: reduce)',
    },
  };

  // Storage keys
  const STORAGE = {
    theme: 'portfolio-theme',
    themes: {
      light: 'light',
      dark: 'dark',
    },
  };

  // Filter configuration
  const FILTERS = {
    tags: ['ALL', 'Robotics', 'Embedded', 'Mechanical', 'Control', 'Fabrication', 'Competition'],
    statuses: ['ALL', 'Active', 'Completed', 'Paused', 'On Hold'],
  };

  // Timeline configuration
  const TIMELINE = {
    statusColors: {
      active: '#0057FF',
      completed: '#111111',
      paused: '#E07B00',
      'on hold': '#888888',
    },
    statusLabels: {
      active: '● ACTIVE',
      completed: '✓ COMPLETED',
      paused: '⏸ PAUSED',
      'on hold': '⊘ ON HOLD',
    },
    defaultZoom: 'ALL',
  };

  // Gallery configuration
  const GALLERY = {
    /* The canvas sizes itself to the layout. Photos are never scaled down
       or cropped. Files smaller than minPhotoEdge are shown larger (up to
       maxPhotoUpscale) so a low-resolution photo does not become a speck
       next to a 4K one. */
    minPhotoEdge: 2400,    /* long-edge floor, in source pixels */
    maxPhotoUpscale: 3,    /* ceiling; 2400px never needs more than 2.7x */
    minScale: 0.004,
    maxScale: 1.5,
    zoomFactor: 1.35,
    maxRot: 6,             /* random tilt per photo, ± degrees */
    pad: 6,                /* clear space between photos, layout px */
    density: 0.75,         /* starting radius guess: area coverage */
    candidates: 60,        /* best-fit samples tried per photo */
    jitter: 0.1,           /* score noise, fraction of circle radius */
    compact: 50,           /* compaction passes when packing from scratch */
    projectGap: 420,       /* gap between circles; covers the ink stroke */
    clusterMargin: 900,    /* canvas padding around the whole map */
  };

  // Skills domains configuration
  const SKILLS_DOMAINS = [
    {
      title: 'CAD & DIGITAL FABRICATION',
      skills: [
        { name: 'SolidWorks', note: '3D Parametric CAD, Large Assemblies, FEA Stress Simulation' },
        { name: 'GD&T', note: 'Geometric Dimensioning & Tolerancing (ASME Y14.5)' },
        { name: 'CNC Machining', note: '3-Axis Milling, CAM toolpaths, Aluminum 6061-T6, Speeds & Feeds' },
        { name: 'CoreXY Kinematics', note: 'High-speed 3D printing gantry design, belt resonance tuning' },
        { name: 'Rapid Prototyping', note: 'PETG, Carbon Fiber Nylon (PA-CF), Polycarbonate, SLA Resin' },
        { name: 'Sheet Metal', note: 'Laser cutting, CNC press brake forming, chassis enclosures' },
      ],
    },
    {
      title: 'EMBEDDED SYSTEMS & FIRMWARE',
      skills: [
        { name: 'STM32', note: 'ARM Cortex-M4/M7, bare-metal C, HAL/LL, Hardware Timers, DMA' },
        { name: 'ESP32-S3', note: 'Dual-core Xtensa, ESP-IDF, FreeRTOS, ESP-NOW low latency mesh' },
        { name: 'FreeRTOS', note: 'Deterministic real-time scheduling, queues, semaphores, mutexes' },
        { name: 'CAN Bus', note: 'CAN 2.0B / CAN-FD, differential transceiver layout, arbitration' },
        { name: 'KiCAD', note: '4-layer PCB routing, high-current MOSFET planes, EMI shielding' },
        { name: 'UART/SPI/I2C', note: 'High-speed sensor buses (AS5047P 10MHz SPI, IMUs, OLEDs)' },
      ],
    },
    {
      title: 'CONTROL SYSTEMS & MOTOR DRIVES',
      skills: [
        { name: 'Field Oriented Control', note: 'Clarke/Park transforms, Space Vector PWM (SVPWM), Id/Iq PI' },
        { name: 'PID Tuning', note: 'Cascaded current-velocity-position loops, anti-windup, feedforward' },
        { name: 'Inverse Kinematics', note: 'Analytical DH decoupling, spherical wrist IK, numerical solvers' },
        { name: 'Swarm Algorithms', note: 'Artificial Potential Fields (APF), decentralized lattice consensus' },
        { name: 'IMU Sensor Fusion', note: 'Madgwick AHRS filter, Extended Kalman Filter (EKF)' },
      ],
    },
    {
      title: 'VISION, ROBOTICS & SOFTWARE',
      skills: [
        { name: 'ROS2', note: 'ROS2 Humble, MoveIt2, ros2_control hardware abstraction, Nav2' },
        { name: 'Python', note: 'NumPy, SciPy, Matplotlib, kinematics modeling, serial telemetry' },
        { name: 'C/C++', note: 'Modern C++ (17/20), embedded C, pointer arithmetic, zero allocations' },
        { name: 'OpenCV', note: 'Camera calibration, color thresholding, feature detection, optical flow' },
        { name: 'LiDAR SLAM', note: 'Cartographer 2D, costmap generation, obstacle avoidance' },
        { name: 'Klipper Firmware', note: 'Custom printer configuration, input shaping, resonance analysis' },
      ],
    },
    {
      title: 'LAB INSTRUMENTATION & TOOLS',
      skills: [
        { name: 'Oscilloscope', note: 'Digital storage scope, MOSFET gate ringing analysis, SPI decoding' },
        { name: 'Logic Analyzer', note: 'CAN frame decoding, I2C bus timing validation, pulse measuring' },
        { name: 'Load Cell / Strain Gauge', note: 'Wheatstone bridge excitation, INA instrumentation amplifiers' },
        { name: 'Infrared Comms', note: 'Modulated 38 kHz directional transceivers for bearing detection' },
        { name: 'RTK-GPS', note: 'Multi-band GNSS, NTRIP RTCM3 differential centimeter corrections' },
      ],
    },
  ];

  // Public API
  return {
    getApp: () => ({ ...APP }),
    getSite: () => ({ ...SITE }),
    getAuthor: () => ({ ...AUTHOR }),
    getNav: () => ({ items: [...NAV.items], brand: { ...NAV.brand } }),
    getFooter: () => ({ ...FOOTER }),
    getData: () => ({ ...DATA }),
    getAnimations: () => ({ ...ANIMATIONS }),
    getStorage: () => ({ ...STORAGE }),
    getFilters: () => ({ tags: [...FILTERS.tags], statuses: [...FILTERS.statuses] }),
    getTimeline: () => ({
      statusColors: { ...TIMELINE.statusColors },
      statusLabels: { ...TIMELINE.statusLabels },
      defaultZoom: TIMELINE.defaultZoom,
    }),
    getGallery: () => ({ ...GALLERY }),
    getSkillsDomains: () => JSON.parse(JSON.stringify(SKILLS_DOMAINS)),
  };
})();
