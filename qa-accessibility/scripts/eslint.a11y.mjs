// eslint.a11y.mjs: temporary config (does not touch the project's own) with the jsx-a11y "strict" rules.
// Resolves packages from the project (cwd), so this file can live in /tmp.
// eslint-config-next already registers the "jsx-a11y" plugin: here only its rules are added. Registering it again
// (e.g. with jsxA11y.flatConfigs.recommended) gives "Cannot redefine plugin jsx-a11y".
// Usage (from the project root, with the folders that exist): npx eslint -c /tmp/qa-accessibility/eslint.a11y.mjs app components -f json > /tmp/qa-accessibility/eslint.json
import { createRequire } from "node:module";
const require = createRequire(`${process.cwd()}/package.json`);
const nextVitals = require("eslint-config-next/core-web-vitals");
const jsxA11y = require("eslint-plugin-jsx-a11y");

export default [
  ...(Array.isArray(nextVitals) ? nextVitals : nextVitals.default),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: { ...jsxA11y.flatConfigs.strict.rules },
    // next/link and next/image count as <a> and <img> for the rules
    settings: { "jsx-a11y": { components: { Link: "a", Image: "img" } } },
  },
];
