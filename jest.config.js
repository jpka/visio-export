module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^binary-loader!": "<rootDir>/__tests__/mocks/binary-loader.ts",
    "\\.xml$": "<rootDir>/__tests__/mocks/raw-loader.ts",
  },
};
