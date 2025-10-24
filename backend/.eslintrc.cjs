module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    env: { node: true, es2022: true },
    plugins: ["@typescript-eslint", "import"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript"
    ],
    rules: {
        "import/order": ["error", { "newlines-between": "always", "alphabetize": { "order": "asc" } }],
        "semi": ["error", "always"],
        "quotes": ["error", "single"],
        "indent": ["error", 2]
    }
};
