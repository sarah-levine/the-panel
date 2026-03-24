#!/usr/bin/env node
// Fixes asset paths in the sidebar HTML after Vite build
// Vite outputs HTML to dist/src/sidebar/ but assets to dist/sidebar/
// Chrome extensions need relative paths, not absolute /sidebar/... paths

import { readFileSync, writeFileSync, copyFileSync, readdirSync } from 'fs'
import { resolve, basename } from 'path'

const distDir = resolve('dist')
const htmlPath = resolve(distDir, 'src/sidebar/index.html')
const assetsDir = resolve(distDir, 'sidebar')
const sidebarDir = resolve(distDir, 'src/sidebar')

// Find JS and CSS files in dist/sidebar/
const files = readdirSync(assetsDir)
const jsFile = files.find(f => f.endsWith('.js'))
const cssFile = files.find(f => f.endsWith('.css'))

if (!jsFile || !cssFile) {
  console.error('postbuild: could not find JS or CSS in dist/sidebar/')
  process.exit(1)
}

// Copy assets next to the HTML
copyFileSync(resolve(assetsDir, jsFile), resolve(sidebarDir, jsFile))
copyFileSync(resolve(assetsDir, cssFile), resolve(sidebarDir, cssFile))

// Rewrite HTML with relative paths
const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Panel</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" rel="stylesheet" />
    <script type="module" crossorigin src="./${jsFile}"></script>
    <link rel="stylesheet" crossorigin href="./${cssFile}">
  </head>
  <body class="bg-white text-gray-900 antialiased">
    <div id="root"></div>
  </body>
</html>
`

writeFileSync(htmlPath, html)
console.log(`postbuild: fixed paths → ${jsFile}, ${cssFile}`)
