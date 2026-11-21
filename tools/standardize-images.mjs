#!/usr/bin/env node
/** 
 * AARUTHRUN PORTFOLIO — STANDARDIZE PROJECT IMAGES
 * Resizes all project 1.png images to consistent dimensions for uniform logos.
 * Usage: node tools/standardize-images.mjs
 */

import sharp from 'sharp';
import { readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve('.');
const PROJECTS_DIR = resolve(PROJECT_ROOT, 'images/projects');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'images/standardized');

const TARGET_WIDTH = 400; // consistent max width for all project logos
const TARGET_HEIGHT = null; // null = maintain aspect ratio

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

// Discover all project directories
const projectDirs = readdirSync(PROJECTS_DIR)
  .filter(d => {
    const fullPath = resolve(PROJECTS_DIR, d);
    return statSync(fullPath).isDirectory();
  });

console.log(`Found ${projectDirs.length} project directories\n`);

// Process each project
for (const slug of projectDirs) {
  const projectImgPath = resolve(PROJECTS_DIR, slug, '1.png');

  if (!existsSync(projectImgPath)) {
    console.log(`⚠️  SKIP: ${slug} — no 1.png found`);
    continue;
  }

  try {
    const metadata = await sharp(projectImgPath).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    // Calculate target dimensions maintaining aspect ratio
    let targetWidth = TARGET_WIDTH;
    let targetHeight = null;

    if (TARGET_HEIGHT) {
      // Fixed dimensions
      targetWidth = TARGET_WIDTH;
      targetHeight = TARGET_HEIGHT;
    } else {
      // Maintain aspect ratio based on target width
      const aspectRatio = originalHeight / originalWidth;
      targetHeight = Math.round(targetWidth * aspectRatio);
    }

    console.log(`✅ ${slug}: ${originalWidth}x${originalHeight} → ${targetWidth}x${targetHeight}`);

    // Resize and save with high quality
    await sharp(projectImgPath)
      .resize(targetWidth, targetHeight, {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false,
        fit: 'inside',
        position: 'center'
      })
      .png({
        quality: 90,
        compressionLevel: 9
      })
      .toFile(resolve(OUTPUT_DIR, `${slug}-logo.png`));

  } catch (err) {
    console.error(`❌ ${slug}: Error — ${err.message}`);
  }
}

console.log('\nDone! Standardized logos are in: images/standardized/');
console.log('Update your HTML to reference images/standardized/<slug>-logo.png');