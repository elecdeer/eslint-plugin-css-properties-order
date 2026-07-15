/**
 * eslint-plugin-css-order: enforce CSS property order for @eslint/css.
 *
 * Ported from stylelint-order (https://github.com/hudochenkov/stylelint-order).
 */
import type { Linter } from "eslint";
import pkg from "../package.json" with { type: "json" };
import propertiesOrder from "./rules/properties-order.ts";

const plugin = {
  meta: {
    name: "eslint-plugin-css-order",
    version: pkg.version,
  },
  rules: {
    "properties-order": propertiesOrder,
  },
  // configs は plugin 自身を参照するため定義後に代入する (typescript-eslint と
  // 同じパターン)。初期化順の都合でこの 1 箇所のみ型アサーションを使う。
  configs: {} as {
    recommended: Linter.Config;
  },
};

Object.assign(plugin.configs, {
  recommended: {
    name: "css-order/recommended",
    plugins: {
      "css-order": plugin,
    },
    rules: {
      "css-order/properties-order": "warn",
    },
  } satisfies Linter.Config,
});

export default plugin;
export type { PrimaryOption, PropertyGroup, UnspecifiedOption } from "./lib/order.ts";
