module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:react-hooks/recommended"],
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh"],
  rules: {
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "off",
  },
  overrides: [
    {
      // Vercel serverless functions run in Node, not the browser -- this
      // is the one part of the codebase that uses process.env directly.
      files: ["api/**/*.ts"],
      env: { node: true, browser: false },
    },
  ],
}
