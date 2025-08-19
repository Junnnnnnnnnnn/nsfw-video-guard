module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
    'import',
    'unused-imports',
    'simple-import-sort',
    'spellcheck',
  ],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
    browser: true,
  },
  ignorePatterns: ['node_modules/', 'dist/', '.eslintrc.js'],
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/no-base-to-string': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    'max-lines-per-function': ['error', 50],

    // Import rules
    'import/order': [
      'error',
      {
        groups: [
          ['builtin', 'external'],
          ['internal', 'parent', 'sibling', 'index'],
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-unresolved': 'off',
    'import/no-cycle': 'off',
    'import/newline-after-import': 'error',

    // Unused imports
    'unused-imports/no-unused-imports': 'off',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],

    // Simple import sort
    'simple-import-sort/imports': 'off',
    'simple-import-sort/exports': 'error',

    // General JavaScript rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'arrow-body-style': ['error', 'as-needed'],
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'no-multiple-empty-lines': ['error', { max: 1 }],
  },
  overrides: [
    {
      files: ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*.ts'],
      rules: {
        'max-lines-per-function': 'off', // 테스트 파일에서는 함수 길이 제한 해제
        'no-console': 'off', // 테스트 파일에서는 console 사용 허용
      },
    },
  ],
};
