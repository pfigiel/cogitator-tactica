import path from "path";

const config = {
  plugins: {
    "@csstools/postcss-global-data": {
      files: [
        path.resolve(
          process.cwd(),
          "../../packages/ui-kit/src/breakpoints.css",
        ),
      ],
    },
    "postcss-custom-media": {},
    "postcss-mixins": {
      mixinsFiles: [
        path.resolve(process.cwd(), "../../packages/ui-kit/src/typography.css"),
      ],
    },
  },
};

export default config;
