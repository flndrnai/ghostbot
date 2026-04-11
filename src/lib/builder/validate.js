// Builder Validator — checks if a step produced the expected results

import fs from 'fs';
import path from 'path';

/**
 * Validate a completed step by checking expected files exist.
 * @param {Object} step - The builder step with expectedFiles
 * @param {string} projectPath - Absolute path to the project root
 * @returns {{ passed: boolean, checks: Array<{ name: string, passed: boolean, message: string }> }}
 */
export function validateStep(step, projectPath) {
  const checks = [];

  // Parse expected files from validation result or step data
  let expectedFiles = [];
  try {
    if (step.validationResult) {
      const vr = JSON.parse(step.validationResult);
      expectedFiles = vr.expectedFiles || [];
    }
  } catch {}

  // If no expected files defined, pass by default
  if (!expectedFiles.length) {
    return { passed: true, checks: [{ name: 'no-validation', passed: true, message: 'No validation criteria defined' }] };
  }

  for (const filePath of expectedFiles) {
    const fullPath = path.join(projectPath, filePath);
    const exists = fs.existsSync(fullPath);
    checks.push({
      name: `file:${filePath}`,
      passed: exists,
      message: exists ? `File exists: ${filePath}` : `Missing expected file: ${filePath}`,
    });
  }

  const passed = checks.every((c) => c.passed);
  return { passed, checks };
}
