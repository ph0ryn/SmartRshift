import { defineConfig } from "eslint/config";
import importX from "eslint-plugin-import-x";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";
import oxlint from "eslint-plugin-oxlint";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@stylistic": stylistic,
      "@typescript-eslint": tseslint.plugin,
      "import-x": importX,
    },
    rules: {
      "no-multiple-empty-lines": [
        "error",
        {
          max: 1,
          maxEOF: 0,
        },
      ],

      "@stylistic/padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: "*",
          next: ["return", "multiline-expression", "block-like", "try", "throw"],
        },
        {
          blankLine: "always",
          prev: ["multiline-expression", "block-like", "const", "let"],
          next: "*",
        },
        {
          blankLine: "any",
          prev: ["const", "let"],
          next: ["const", "let"],
        },
      ],

      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "class",
          format: ["StrictPascalCase"],
        },
        {
          selector: "variable",
          format: ["strictCamelCase", "UPPER_CASE"],
        },
        {
          selector: "parameter",
          format: ["strictCamelCase"],
        },
      ],

      "import-x/order": [
        "error",
        {
          alphabetize: { order: "asc" },
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"], "type"],
          "newlines-between": "always",
        },
      ],
    },
  },
  oxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),
);
