# eslint-plugin-css-order

ESLint plugin to enforce CSS property order for [@eslint/css](https://github.com/eslint/css), ported from [stylelint-order](https://github.com/hudochenkov/stylelint-order)'s `order/properties-order` rule.

The default order follows [stylelint-config-recess-order](https://github.com/stormwarning/stylelint-config-recess-order) (Recess-style: positioning → box model → typography → visual).

## Installation

```bash
npm install --save-dev eslint @eslint/css eslint-plugin-css-order
```

Requires ESLint >= 9.15.0 (flat config) and @eslint/css >= 1.0.0.

## Usage

```js
// eslint.config.js
import css from "@eslint/css";
import cssOrder from "eslint-plugin-css-order";

export default [
  {
    files: ["**/*.css"],
    plugins: { css, "css-order": cssOrder },
    language: "css/css",
    rules: {
      "css-order/properties-order": "warn",
    },
  },
];
```

Or use the recommended config (still requires the `language` setup from @eslint/css):

```js
import css from "@eslint/css";
import cssOrder from "eslint-plugin-css-order";

export default [
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
  },
  cssOrder.configs.recommended,
];
```

## Rules

### properties-order

Enforces the order of properties within declaration blocks. Auto-fixable with `--fix`.

With no options, the order follows stylelint-config-recess-order.

```css
/* ✗ Bad */
a {
  color: red;
  display: block;
}

/* ✓ Good */
a {
  display: block;
  color: red;
}
```

#### Options

The first option is an array of property names and/or group objects:

```js
"css-order/properties-order": ["warn", [
  "position",
  { properties: ["top", "right", "bottom", "left"] },
  { order: "flexible", properties: ["width", "height"] },
  "color",
]]
```

- A string entry matches a single property.
- A group object's `properties` are ordered as listed. With `order: "flexible"`, properties in the group may appear in any order relative to each other.
- Vendor-prefixed properties (e.g. `-webkit-transform`) are expected right before their unprefixed counterpart, unless listed explicitly.
- Custom properties (`--foo`) are ignored and keep their position when fixing.

The second option:

```js
"css-order/properties-order": ["warn", [...], { unspecified: "bottom" }]
```

- `unspecified`: how properties not in the list are treated.
  - `"ignore"` (default): allowed anywhere. When fixing, they are moved after all specified properties (matching stylelint-order).
  - `"top"`: expected before all specified properties.
  - `"bottom"`: expected after all specified properties.
  - `"bottomAlphabetical"`: expected at the bottom, in alphabetical order.

## Differences from stylelint-order

- Only `properties-order` is ported. `order/order` and `properties-alphabetical-order` are not included.
- Empty-line options (`emptyLineBefore`, `noEmptyLineBetween`, `emptyLineMinimumPropertyThreshold`) are not supported; the rule only checks and fixes ordering.
- Auto-fix is suppressed (reports only) when comments or nested rules / at-rules sit between the declarations being sorted, since moving declarations across them could detach comments or change the cascade.
- Sass/Less-specific concepts (`$variables`, mixins) are out of scope; this plugin targets plain CSS parsed by @eslint/css.

## Development

```bash
vp install   # install dependencies
vp test      # run the unit tests
vp check     # format, lint, and type check
vp pack      # build the library
```

## Release

Releases are managed with pnpm's native change intents (changesets-compatible):

1. Record a change intent alongside your change: `pnpm change` (writes to `.changeset/`).
2. When intents land on `main`, the Release workflow opens/updates a release PR that applies `pnpm version -r` (version bump + changelog).
3. Merging the release PR publishes to npm via OIDC trusted publishing and creates a GitHub Release.

## License

MIT. The default property order data is derived from [stylelint-config-recess-order](https://github.com/stormwarning/stylelint-config-recess-order) (ISC).
