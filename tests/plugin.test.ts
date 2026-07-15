import css from "@eslint/css";
import { Linter } from "eslint";
import { describe, expect, test } from "vite-plus/test";
import plugin from "../src/index.ts";

const linter = new Linter();

const baseConfig = {
  files: ["**/*.css"],
  plugins: { css, "css-order": plugin },
  language: "css/css",
  rules: { "css-order/properties-order": "error" },
} satisfies Linter.Config;

describe("plugin E2E (Linter.verifyAndFix)", () => {
  test("順序違反を検出して自動修正する", () => {
    const result = linter.verifyAndFix(
      "a { color: red; width: 10px; display: block; }",
      baseConfig,
      "test.css",
    );
    expect(result.fixed).toBe(true);
    expect(result.output).toBe("a { display: block; width: 10px; color: red; }");
    expect(result.messages).toEqual([]);
  });

  test("整列済みのコードは変更しない", () => {
    const code = "a { display: block; width: 10px; color: red; }";
    const result = linter.verifyAndFix(code, baseConfig, "test.css");
    expect(result.fixed).toBe(false);
    expect(result.output).toBe(code);
    expect(result.messages).toEqual([]);
  });

  test("コメント混在時は fix せず報告のみ残る", () => {
    const code = "a { color: red; /* keep */ display: block; }";
    const result = linter.verifyAndFix(code, baseConfig, "test.css");
    expect(result.fixed).toBe(false);
    expect(result.output).toBe(code);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.ruleId).toBe("css-order/properties-order");
  });

  test("複数ブロックをまとめて修正する", () => {
    const result = linter.verifyAndFix(
      "a { color: red; display: block; } b { top: 0; position: absolute; }",
      baseConfig,
      "test.css",
    );
    expect(result.fixed).toBe(true);
    expect(result.output).toBe(
      "a { display: block; color: red; } b { position: absolute; top: 0; }",
    );
    expect(result.messages).toEqual([]);
  });

  test("オプション付きで動作する", () => {
    const result = linter.verifyAndFix(
      "a { display: block; unknown-prop: 1; color: red; }",
      {
        ...baseConfig,
        rules: {
          "css-order/properties-order": [
            "error",
            [{ properties: ["display", "color"] }],
            { unspecified: "bottom" },
          ],
        },
      },
      "test.css",
    );
    expect(result.fixed).toBe(true);
    expect(result.output).toBe("a { display: block; color: red; unknown-prop: 1; }");
    expect(result.messages).toEqual([]);
  });
});

describe("configs.recommended", () => {
  test("recommended config で warn として動作する", () => {
    const messages = linter.verify(
      "a { color: red; display: block; }",
      [{ files: ["**/*.css"], plugins: { css }, language: "css/css" }, plugin.configs.recommended],
      "test.css",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]?.ruleId).toBe("css-order/properties-order");
    expect(messages[0]?.severity).toBe(1);
  });
});

describe("plugin metadata", () => {
  test("meta と rules が公開されている", () => {
    expect(plugin.meta.name).toBe("eslint-plugin-css-order");
    expect(Object.keys(plugin.rules)).toEqual(["properties-order"]);
  });
});
