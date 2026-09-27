# Real3D FlipBook (optional)

This portfolio is wired for the commercial **Real3D FlipBook JS** plugin
(from [real3dflipbook.com](https://real3dflipbook.com/) / CodeCanyon).

## Drop-in install

After you purchase and download the plugin zip:

1. Copy from the plugin package:
   - `build/css/flipbook.style.css` → `vendor/real3d-flipbook/css/flipbook.style.css`
   - `build/js/flipbook.min.js` → `vendor/real3d-flipbook/js/flipbook.min.js`
   - Also copy any sibling asset folders the build needs (fonts, sounds, pdf.worker, etc.) into `vendor/real3d-flipbook/` matching the plugin’s relative paths.
2. Refresh the site.

When `FlipBook` / `Flipbook` is detected, the app uses Real3D automatically.
Otherwise it falls back to the open-source **page-flip** 3D engine so the portfolio still works.

## Expected layout

```
vendor/real3d-flipbook/
  css/flipbook.style.css
  js/flipbook.min.js
  (plus any other build assets required by your plugin version)
```
