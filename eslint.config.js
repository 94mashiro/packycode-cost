// @ts-check
import js from "@eslint/js"
import prettierConfig from "eslint-config-prettier"
import perfectionist from "eslint-plugin-perfectionist"
import prettier from "eslint-plugin-prettier"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"

/** @type {import('eslint').Linter.Config[]} */
const config = tseslint.config([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  perfectionist.configs["recommended-natural"],
  prettierConfig,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        console: "readonly",
        exports: "readonly",
        global: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly"
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        project: [
          "./packages/*/tsconfig.json",
          "./packages/*/tsconfig.app.json",
          "./packages/*/tsconfig.node.json"
        ],
        tsconfigRootDir: import.meta.dirname
      },
      sourceType: "module"
    },
    plugins: {
      prettier,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" }
      ],

      // 通用规则
      "no-console": ["warn", { allow: ["warn", "error"] }], // 允许 warn 和 error，其他需要使用 logger
      "no-debugger": process.env.NODE_ENV === "production" ? "error" : "warn",
      "no-duplicate-imports": "error",
      "no-empty": "off",
      // 防止抽象泄漏：禁止直接使用 Plasmo Storage API
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@plasmohq/storage"],
              message: "不允许直接使用 @plasmohq/storage。请使用 ~/lib/storage 中的抽象层。"
            }
          ]
        }
      ],
      "no-var": "error",

      "prefer-const": "error",
      // 代码风格
      "prefer-destructuring": [
        "error",
        {
          array: true,
          object: true
        }
      ],

      "prettier/prettier": "error",
      "react-hooks/exhaustive-deps": "warn",

      // React Hooks相关
      "react-hooks/rules-of-hooks": "error",

      // React Refresh相关
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true }
      ]
    }
  },
  {
    // 存储层合法使用 Plasmo Storage
    files: ["**/lib/storage/**/*.ts", "**/lib/storage/**/*.js"],
    rules: {
      "no-restricted-imports": "off" // 存储抽象层可以使用底层 API
    }
  },
  {
    files: ["**/*.{js,cjs}"],
    languageOptions: {
      ecmaVersion: 2024,
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        console: "readonly",
        exports: "readonly",
        global: "readonly",
        module: "readonly",
        node: true,
        process: "readonly",
        require: "readonly"
      },
      sourceType: "commonjs"
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "error"
    }
  },
  {
    // Logger 模块专用规则 - 允许使用 console
    files: ["**/logger.ts", "**/logger.js"],
    rules: {
      "no-console": "off" // Logger 模块需要使用 console
    }
  },
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".vscode/**",
      ".idea/**",
      "*.min.js",
      "pnpm-lock.yaml",
      ".prettierrc.cjs",
      ".commitlintrc.js",
      ".pnpmfile.cjs",
      "turbo.json",
      // Plasmo specific
      ".plasmo/**",
      // Environment and log files
      ".env*.local",
      "*.log",
      ".pnpm-debug.log*",
      "npm-debug.log*",
      "yarn-debug.log*",
      "yarn-error.log*",
      // TypeScript build info
      ".tsbuildinfo",
      // macOS
      ".DS_Store",
      // PEM files
      "*.pem"
    ]
  }
])

export default config
