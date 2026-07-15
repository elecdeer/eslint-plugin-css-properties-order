import css from "@eslint/css";
import { RuleTester } from "eslint";
import { describe, it } from "vite-plus/test";
import propertiesOrder from "../src/rules/properties-order.ts";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  plugins: { css },
  language: "css/css",
});

ruleTester.run("properties-order", propertiesOrder, {
  valid: [
    // デフォルト (recess order) で整列済み
    "a { position: absolute; top: 0; display: flex; width: 10px; color: red; }",
    // 宣言 1 つ
    "a { color: red; }",
    // 空ブロック
    "a { }",
    // 同一プロパティの重複
    "a { color: red; color: blue; }",
    // prefixed → unprefixed の順
    "a { -webkit-transform: none; transform: none; }",
    // カスタムプロパティは任意位置
    "a { color: red; --x: 1; }",
    "a { --x: 1; display: block; --y: 2; color: red; }",
    // unspecified はデフォルト (ignore) で任意位置
    "a { unknown-prop: 1; display: block; also-unknown: 2; color: red; }",
    // @media 内で整列済み
    "@media (min-width: 100px) { a { display: block; color: red; } }",
    // ネスト規則内で整列済み
    "a { display: block; color: red; & span { position: absolute; top: 0; } }",
    // @font-face (unspecified プロパティのみ)
    '@font-face { font-family: "Foo"; src: url(foo.woff2); }',
  ],
  invalid: [
    {
      // 基本の 2 宣言逆順
      code: "a { color: red; display: block; }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "display", before: "color" },
        },
      ],
    },
    {
      // 3 宣言シャッフル
      code: "a { color: red; width: 10px; display: block; }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "width", before: "color" },
        },
        {
          messageId: "expectedOrder",
          data: { property: "display", before: "color" },
        },
      ],
    },
    {
      // unprefixed → prefixed の逆順
      code: "a { transform: none; -webkit-transform: none; }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "-webkit-transform", before: "transform" },
        },
      ],
    },
    {
      // 大文字プロパティも正規化して判定
      code: "a { COLOR: red; DISPLAY: block; }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "DISPLAY", before: "COLOR" },
        },
      ],
    },
    {
      // カスタムプロパティを挟んでも順序違反は検出
      code: "a { color: red; --x: 1; display: block; }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "display", before: "color" },
        },
      ],
    },
    {
      // ネストブロック内の違反も検出
      code: "a { display: block; & span { color: red; position: absolute; } }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "position", before: "color" },
        },
      ],
    },
    {
      // @media 内の違反も検出
      code: "@media (min-width: 100px) { a { color: red; display: block; } }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "display", before: "color" },
        },
      ],
    },
  ],
});
