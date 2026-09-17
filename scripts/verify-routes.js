/**
 * scripts/verify-routes.js
 * 
 * Build-time link integrity check for React Router SPA.
 * Scans App.tsx for declared routes and ensures every <Link to="..."> or navigate("...")
 * in the codebase targets a valid registered route.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const appFile = path.join(srcDir, 'App.tsx');

function getDeclaredRoutes() {
  const content = fs.readFileSync(appFile, 'utf8');
  const routeRegex = /<Route[^>]*\bpath=["']([^"']+)["']/g;
  const routes = [];
  let match;

  while ((match = routeRegex.exec(content)) !== null) {
    if (match[1] !== '*') {
      routes.push(match[1]);
    }
  }

  return routes;
}

function routeToRegex(route) {
  // Replace params like :id with regex matchers
  const pattern = route
    .replace(/:[a-zA-Z0-9_]+/g, '[^/?#]+')
    .replace(/\//g, '\\/');
  return new RegExp(`^${pattern}$`);
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function verifyLinks() {
  const declaredRoutes = getDeclaredRoutes();
  const routePatterns = declaredRoutes.map((r) => ({
    route: r,
    regex: routeToRegex(r),
  }));

  console.log(`\n🔍 Verifying Route Integrity...`);
  console.log(`📋 Found ${declaredRoutes.length} declared routes in App.tsx:`, declaredRoutes.join(', '));

  const allFiles = getAllFiles(srcDir);
  const errors = [];
  let checkedCount = 0;

  // Regex to match <Link to="..."> or navigate("...")
  const linkRegex = /<(?:Link|NavLink)[^>]*\bto=\{?["'`](\/[^"'`?#\s]*)["'`]\}?/g;
  const navigateRegex = /\bnavigate\(["'`](\/[^"'`?#\s]*)["'`]\)/g;

  for (const file of allFiles) {
    // Skip test files, mock files, or verify-routes script
    if (file.includes('.test.') || file.includes('.spec.') || file === appFile) continue;

    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(rootDir, file);

    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      checkedCount++;
      const targetPath = match[1];
      const isValid = routePatterns.some((p) => p.regex.test(targetPath));
      if (!isValid) {
        errors.push({ file: relativePath, link: targetPath, raw: match[0] });
      }
    }

    while ((match = navigateRegex.exec(content)) !== null) {
      checkedCount++;
      const targetPath = match[1];
      const isValid = routePatterns.some((p) => p.regex.test(targetPath));
      if (!isValid) {
        errors.push({ file: relativePath, link: targetPath, raw: match[0] });
      }
    }
  }

  console.log(`✅ Checked ${checkedCount} internal links/navigates across ${allFiles.length} files.`);

  if (errors.length > 0) {
    console.error(`\n❌ Found ${errors.length} broken internal link(s):`);
    for (const err of errors) {
      console.error(`  - ${err.file}: "${err.link}" (found in: ${err.raw})`);
    }
    process.exit(1);
  } else {
    console.log(`🎉 All internal links resolve to valid routes declared in App.tsx!\n`);
  }
}

verifyLinks();
