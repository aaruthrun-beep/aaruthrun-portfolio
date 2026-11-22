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
    url: 'https://aaruthrun-beep.github.io/aaruthrun-portfolio',
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

  // Contact configuration
  // FormSubmit is a static-host-compatible form-to-email service. The endpoint
  // is public (it contains the public contact address), not an API key.
  const CONTACT = {
    formEndpoint: 'https://formsubmit.co/ajax/aaruthrun@gmail.com',
    formFallbackEndpoint: 'https://formsubmit.co/aaruthrun@gmail.com',
    // Long enough to catch a script that submits instantly, short enough that
    // a person who fills the form from autofill is never held back.
    minimumSubmitTimeMs: 1200,
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
      { label: 'Journal', href: 'journal.html', priority: 7 },
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
      // The header already carries the site navigation, so the footer does not
      // repeat it.
      connect: [
        { label: 'Résumé (PDF)', href: 'images/resume/Aaruthrun_S_FlowCV_Resume_2026-11-21.pdf', external: true },
        { label: 'Curriculum Vitae', href: 'cv.html' },
        { label: 'aaruthrun@gmail.com', href: 'mailto:aaruthrun@gmail.com', external: true },
        { label: 'GitHub // @aaruthrun-beep', href: 'https://github.com/aaruthrun-beep', external: true },
        { label: 'LinkedIn Profile', href: 'https://linkedin.com/in/aaruthrun-saravanakumar', external: true },
        { label: 'Send Secure Message', href: 'contact.html' },
        { label: 'Technical Bio & Philosophy', href: 'index.html#about-bio' },
      ],
    },
    quotes: [
      {
        text: '"I do not think there is any thrill that can go through the human heart like that felt by the inventor as he sees some creation of the brain unfolding to success... Such emotions make a man forget food, sleep, friends, love, everything."',
        author: 'NIKOLA TESLA',
      },
      {
        text: '"If you want to find the secrets of the universe, think in terms of energy, frequency and vibration."',
        author: 'NIKOLA TESLA',
      },
      {
        text: '"I don\'t care that they stole my idea... I care that they don\'t have any of their own."',
        author: 'NIKOLA TESLA',
      },
      {
        text: '"Be alone, that is the secret of invention; be alone, that is when ideas are born."',
        author: 'NIKOLA TESLA',
      },
      {
        text: '"The spread of civilisation may be likened to a fire; first, a feeble spark, next a flickering flame, then a mighty blaze, ever increasing in speed and power."',
        author: 'NIKOLA TESLA',
      },
      {
        text: '"Let the future tell the truth, and evaluate each one according to his work and accomplishments. The present is theirs; the future, for which I have really worked, is mine."',
        author: 'NIKOLA TESLA',
      },
      {
        text: '"Today\'s scientists have substituted mathematics for experiments, and they wander off through equation after equation, and eventually build a structure which has no relation to reality."',
        author: 'NIKOLA TESLA',
      },
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
       maxPhotoUpscale) so every print on the wall reads the same size: the
       phone photos that dominate the archive are 4000px wide, so a 1080p
       screenshot or a small CAD render is lifted to that same width instead
       of printing 40% smaller than its neighbours. */
    minPhotoEdge: 4000,    /* long-edge floor, in source pixels */
    maxPhotoUpscale: 4.5,  /* ceiling; the smallest source (720px) needs 4.4x */
    minScale: 0.004,
    maxScale: 1.5,
    zoomFactor: 1.35,
    /* Circles named here are repacked from scratch on every build: their
       photos take new random spots instead of keeping the previous
       placements. Change shuffleSeed to hand out a different arrangement. */
    shuffle: ['mars-369', 'origin-one'],
    shuffleSeed: 3,
    maxRot: 6,             /* random tilt per photo, ± degrees */
    pad: 6,                /* clear space between photos, layout px */
    density: 0.75,         /* starting radius guess: area coverage */
    candidates: 60,        /* best-fit samples tried per photo */
    jitter: 0.1,           /* score noise, fraction of circle radius */
    compact: 50,           /* compaction passes when packing from scratch */
    projectGap: 420,       /* gap between circles; covers the ink stroke */
    clusterMargin: 900,    /* canvas padding around the whole map */
    /* A circle named here keeps a fixed relationship with its neighbours on
       every build instead of drifting with the packing: `above` parks it
       clear on top of that circle, and `near` slides it along the line toward
       a second one. `shift` is how far toward `near` it leans (0–1). */
    placement: {
      'origin-one': { above: 'cat-autonomous-rover', near: 'scrapx6', shift: 0.4 },
      /* AgroTech belongs to the startup page, not to the robotics cluster:
         keep it clear below the rover instead of reading as part of it. */
      'avani-agrotech': { below: 'cat-autonomous-rover', drop: 7000 },
    },
    videoEdge: 4000,       /* long edge of a video print, in layout px */
    videoControlsPx: 420,  /* once a print is this wide on screen, its player
                              shows the playback bar and takes the pointer */
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
    getContact: () => ({ ...CONTACT }),
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
    getGallery: () => ({
      ...GALLERY,
      placement: JSON.parse(JSON.stringify(GALLERY.placement || {})),
    }),
    getSkillsDomains: () => JSON.parse(JSON.stringify(SKILLS_DOMAINS)),
  };
})();
