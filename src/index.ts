/**
 * eslint-plugin-css-properties-order: enforce CSS property order for @eslint/css.
 *
 * Ported from stylelint-order (https://github.com/hudochenkov/stylelint-order).
 */
import type { Linter } from "eslint";
import pkg from "../package.json" with { type: "json" };
import propertiesOrder, { type PropertiesOrderRuleDefinition } from "./rules/properties-order.ts";

/**
 * The plugin object shape. Annotated explicitly so declaration emit does not
 * have to name internal types from transitive dependencies.
 */
type CssOrderPlugin = {
  meta: {
    name: string;
    version: string;
  };
  rules: {
    "properties-order": PropertiesOrderRuleDefinition;
  };
  configs: {
    recommended: Linter.Config;
  };
};

const plugin: CssOrderPlugin = {
  meta: {
    name: "eslint-plugin-css-properties-order",
    version: pkg.version,
  },
  rules: {
    "properties-order": propertiesOrder,
  },
  // configs は plugin 自身を参照するため定義後に代入する (typescript-eslint と
  // 同じパターン)。初期化順の都合でこの 1 箇所のみ型アサーションを使う。
  configs: {} as CssOrderPlugin["configs"],
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
