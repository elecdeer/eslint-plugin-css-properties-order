import { describe, expect, test } from "vite-plus/test";
import { recessOrderGroups } from "../src/data/recess-order.ts";
import {
  buildOrderMap,
  compareProperties,
  isCustomProperty,
  resolveOrderKey,
  stripVendorPrefix,
  type ResolvedProperty,
} from "../src/lib/order.ts";

describe("isCustomProperty", () => {
  test("--foo はカスタムプロパティ", () => {
    expect(isCustomProperty("--foo")).toBe(true);
  });

  test("color と -webkit-transform はカスタムプロパティではない", () => {
    expect(isCustomProperty("color")).toBe(false);
    expect(isCustomProperty("-webkit-transform")).toBe(false);
  });
});

describe("stripVendorPrefix", () => {
  test("ベンダープレフィックスを除去する", () => {
    expect(stripVendorPrefix("-webkit-transform")).toBe("transform");
    expect(stripVendorPrefix("-moz-appearance")).toBe("appearance");
    expect(stripVendorPrefix("-ms-flex")).toBe("flex");
  });

  test("プレフィックスがなければそのまま", () => {
    expect(stripVendorPrefix("transform")).toBe("transform");
  });
});

describe("buildOrderMap", () => {
  test("文字列項目は順に採番される", () => {
    const map = buildOrderMap(["display", "width", "color"]);
    expect(map.get("display")).toBe(0);
    expect(map.get("width")).toBe(1);
    expect(map.get("color")).toBe(2);
  });

  test("グループ項目はフラット化して採番される", () => {
    const map = buildOrderMap([{ properties: ["position", "top"] }, { properties: ["display"] }]);
    expect(map.get("position")).toBe(0);
    expect(map.get("top")).toBe(1);
    expect(map.get("display")).toBe(2);
  });

  test("flexible グループは全プロパティ同一 position", () => {
    const map = buildOrderMap([
      "display",
      { order: "flexible", properties: ["width", "height"] },
      "color",
    ]);
    expect(map.get("display")).toBe(0);
    expect(map.get("width")).toBe(1);
    expect(map.get("height")).toBe(1);
    expect(map.get("color")).toBe(2);
  });

  test("プロパティ名は小文字に正規化される", () => {
    const map = buildOrderMap(["Display"]);
    expect(map.get("display")).toBe(0);
  });

  test("recess-order groups から構築できる", () => {
    const map = buildOrderMap(recessOrderGroups.map((properties) => ({ properties })));
    expect(map.get("composes")).toBe(0);
    expect(map.get("position")).toBeLessThan(map.get("display") ?? Number.NaN);
    expect(map.get("display")).toBeLessThan(map.get("color") ?? Number.NaN);
  });
});

describe("resolveOrderKey", () => {
  const map = buildOrderMap(["transform", "-o-appearance", "appearance"]);

  test("完全一致は prefixRank 1", () => {
    expect(resolveOrderKey(map, "transform")).toEqual({ position: 0, prefixRank: 1 });
  });

  test("大文字でも解決できる", () => {
    expect(resolveOrderKey(map, "TRANSFORM")).toEqual({ position: 0, prefixRank: 1 });
  });

  test("プレフィックス付きは非プレフィックス版の position で prefixRank 0", () => {
    expect(resolveOrderKey(map, "-webkit-transform")).toEqual({
      position: 0,
      prefixRank: 0,
    });
  });

  test("明示的に列挙されたプレフィックス付きは完全一致が優先", () => {
    expect(resolveOrderKey(map, "-o-appearance")).toEqual({ position: 1, prefixRank: 1 });
  });

  test("未指定プロパティは null", () => {
    expect(resolveOrderKey(map, "unknown-prop")).toBeNull();
  });
});

describe("compareProperties", () => {
  const map = buildOrderMap(["display", "width", "color"]);

  const resolved = (name: string): ResolvedProperty => ({
    name,
    key: resolveOrderKey(map, name),
  });

  test("position の小さい方が先", () => {
    expect(compareProperties(resolved("display"), resolved("color"), "ignore")).toBeLessThan(0);
    expect(compareProperties(resolved("color"), resolved("display"), "ignore")).toBeGreaterThan(0);
  });

  test("同一プロパティは等価", () => {
    expect(compareProperties(resolved("width"), resolved("width"), "ignore")).toBe(0);
  });

  test("プレフィックス付きは非プレフィックス版より先", () => {
    expect(compareProperties(resolved("-webkit-width"), resolved("width"), "ignore")).toBeLessThan(
      0,
    );
  });

  test("flexible グループ内は等価", () => {
    const flexibleMap = buildOrderMap([{ order: "flexible", properties: ["width", "height"] }]);
    const a: ResolvedProperty = { name: "width", key: resolveOrderKey(flexibleMap, "width") };
    const b: ResolvedProperty = { name: "height", key: resolveOrderKey(flexibleMap, "height") };
    expect(compareProperties(a, b, "ignore")).toBe(0);
  });

  test("unspecified: top では未指定が先", () => {
    expect(compareProperties(resolved("unknown"), resolved("display"), "top")).toBeLessThan(0);
  });

  test("unspecified: bottom では未指定が後", () => {
    expect(compareProperties(resolved("unknown"), resolved("color"), "bottom")).toBeGreaterThan(0);
  });

  test("unspecified: bottom では未指定同士は等価 (元順維持)", () => {
    expect(compareProperties(resolved("zzz"), resolved("aaa"), "bottom")).toBe(0);
  });

  test("unspecified: bottomAlphabetical では未指定同士がアルファベット順", () => {
    expect(compareProperties(resolved("aaa"), resolved("zzz"), "bottomAlphabetical")).toBeLessThan(
      0,
    );
    expect(
      compareProperties(resolved("zzz"), resolved("aaa"), "bottomAlphabetical"),
    ).toBeGreaterThan(0);
  });
});
