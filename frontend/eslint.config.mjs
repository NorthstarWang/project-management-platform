import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable the 'any' type linting error
      "@typescript-eslint/no-explicit-any": "off",
      // Disable unused variables warnings
      "@typescript-eslint/no-unused-vars": "off",
      // Keep React Hook dependency warnings
      "react-hooks/exhaustive-deps": "warn"
    },
  },
];

export default eslintConfig;
