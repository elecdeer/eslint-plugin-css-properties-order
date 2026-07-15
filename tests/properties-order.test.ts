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
      output: "a { display: block; color: red; }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "display", before: "color" },
        },
      ],
    },
    {
      // 3 宣言シャッフル → 1 パスで完全ソート
      code: "a { color: red; width: 10px; display: block; }",
      output: "a { display: block; width: 10px; color: red; }",
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
      code: "a { transform: none; -webkit-transform: scale(2); }",
      output: "a { -webkit-transform: scale(2); transform: none; }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "-webkit-transform", before: "transform" },
        },
      ],
    },
    {
      // 大文字プロパティも正規化して判定・修正
      code: "a { COLOR: red; DISPLAY: block; }",
      output: "a { DISPLAY: block; COLOR: red; }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "DISPLAY", before: "COLOR" },
        },
      ],
    },
    {
      // カスタムプロパティはスロット位置に残したまま並べ替え
      code: "a { color: red; --x: 1; display: block; }",
      output: "a { display: block; --x: 1; color: red; }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "display", before: "color" },
        },
      ],
    },
    {
      // !important と複雑な値は保持される
      code: 'a { color: red !important; grid-template-areas: "x y" "z w"; }',
      output: 'a { grid-template-areas: "x y" "z w"; color: red !important; }',
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "grid-template-areas", before: "color" },
        },
      ],
    },
    {
      // unspecified: ignore (既定) の fix では未指定プロパティが末尾に移動する
      code: "a { unknown-prop: 1; color: red; display: block; }",
      output: "a { display: block; color: red; unknown-prop: 1; }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "display", before: "color" },
        },
      ],
    },
    {
      // ネストブロック内の違反も検出・修正
      code: "a { display: block; & span { color: red; position: absolute; } }",
      output: "a { display: block; & span { position: absolute; color: red; } }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "position", before: "color" },
        },
      ],
    },
    {
      // @media 内の違反も検出・修正
      code: "@media (min-width: 100px) { a { color: red; display: block; } }",
      output: "@media (min-width: 100px) { a { display: block; color: red; } }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "display", before: "color" },
        },
      ],
    },
    {
      // 宣言の間にコメントがあるブロックは fix しない (report のみ)
      code: "a { color: red; /* keep me */ display: block; }",
      output: null,
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "display", before: "color" },
        },
      ],
    },
    {
      // 対象宣言より前のコメントは fix を妨げない
      code: "a { /* heading */ color: red; display: block; }",
      output: "a { /* heading */ display: block; color: red; }",
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "display", before: "color" },
        },
      ],
    },
    {
      // 宣言の間にネスト規則が挟まる場合は fix しない (report のみ)
      code: "a { color: red; & span { top: 0; } display: block; }",
      output: null,
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "display", before: "color" },
        },
      ],
    },
  ],
});

// カスタム primary オプション (文字列 / グループ / flexible) の網羅テスト
ruleTester.run("properties-order (custom primary)", propertiesOrder, {
  valid: [
    {
      // 文字列の配列
      code: "a { height: 1px; width: 1px; }",
      options: [["height", "width"]],
    },
    {
      // グループオブジェクトの配列
      code: "a { top: 0; left: 0; width: 1px; }",
      options: [[{ properties: ["top", "left"] }, { properties: ["width"] }]],
    },
    {
      // 文字列とグループの混在
      code: "a { top: 0; width: 1px; height: 1px; }",
      options: [["top", { properties: ["width", "height"] }]],
    },
    {
      // flexible グループ内は任意順
      code: "a { height: 1px; width: 1px; color: red; }",
      options: [[{ order: "flexible", properties: ["width", "height"] }, "color"]],
    },
    {
      // flexible グループ内の逆順も valid
      code: "a { width: 1px; height: 1px; color: red; }",
      options: [[{ order: "flexible", properties: ["width", "height"] }, "color"]],
    },
  ],
  invalid: [
    {
      // 文字列の配列で違反
      code: "a { width: 1px; height: 1px; }",
      output: "a { height: 1px; width: 1px; }",
      options: [["height", "width"]],
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "height", before: "width" },
        },
      ],
    },
    {
      // グループ跨ぎの違反
      code: "a { width: 1px; top: 0; }",
      output: "a { top: 0; width: 1px; }",
      options: [[{ properties: ["top", "left"] }, { properties: ["width"] }]],
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "top", before: "width" },
        },
      ],
    },
    {
      // flexible グループ外との違反 (グループ内順序は維持される)
      code: "a { color: red; height: 1px; width: 1px; }",
      output: "a { height: 1px; width: 1px; color: red; }",
      options: [[{ order: "flexible", properties: ["width", "height"] }, "color"]],
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "height", before: "color" },
        },
        {
          messageId: "expectedOrder",
          data: { property: "width", before: "color" },
        },
      ],
    },
  ],
});

// unspecified オプション 4 モードの網羅テスト
ruleTester.run("properties-order (unspecified)", propertiesOrder, {
  valid: [
    {
      // ignore (既定): 未指定はどこでも valid
      code: "a { unknown-a: 1; display: block; unknown-b: 2; color: red; }",
      options: [["display", "color"], { unspecified: "ignore" }],
    },
    {
      // top: 未指定が先頭なら valid
      code: "a { unknown-prop: 1; display: block; color: red; }",
      options: [["display", "color"], { unspecified: "top" }],
    },
    {
      // bottom: 未指定が末尾なら valid
      code: "a { display: block; color: red; unknown-prop: 1; }",
      options: [["display", "color"], { unspecified: "bottom" }],
    },
    {
      // bottomAlphabetical: 未指定が末尾でアルファベット順なら valid
      code: "a { display: block; aaa-prop: 1; bbb-prop: 2; }",
      options: [["display"], { unspecified: "bottomAlphabetical" }],
    },
  ],
  invalid: [
    {
      // top: 指定プロパティの後に未指定が来ると違反
      code: "a { display: block; unknown-prop: 1; color: red; }",
      output: "a { unknown-prop: 1; display: block; color: red; }",
      options: [["display", "color"], { unspecified: "top" }],
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "unknown-prop", before: "display" },
        },
      ],
    },
    {
      // bottom: 未指定の後に指定プロパティが来ると違反
      code: "a { display: block; unknown-prop: 1; color: red; }",
      output: "a { display: block; color: red; unknown-prop: 1; }",
      options: [["display", "color"], { unspecified: "bottom" }],
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "color", before: "unknown-prop" },
        },
      ],
    },
    {
      // bottomAlphabetical: 未指定同士のアルファベット順違反
      code: "a { display: block; bbb-prop: 2; aaa-prop: 1; }",
      output: "a { display: block; aaa-prop: 1; bbb-prop: 2; }",
      options: [["display"], { unspecified: "bottomAlphabetical" }],
      errors: [
        {
          messageId: "expectedOrder",
          data: { property: "aaa-prop", before: "bbb-prop" },
        },
      ],
    },
  ],
});
