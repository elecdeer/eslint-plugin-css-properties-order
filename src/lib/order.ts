/**
 * Pure ordering logic for the properties-order rule.
 *
 * Ported from stylelint-order's order/properties-order rule:
 * https://github.com/hudochenkov/stylelint-order/tree/master/rules/properties-order
 */

/**
 * A group of properties in the expected order.
 */
export type PropertyGroup = {
  properties: readonly string[];
  groupName?: string;
  order?: "flexible";
};

/**
 * The primary option: a list of property names and/or property groups.
 */
export type PrimaryOption = readonly (string | PropertyGroup)[];

/**
 * How properties not listed in the primary option are treated.
 */
export type UnspecifiedOption = "ignore" | "top" | "bottom" | "bottomAlphabetical";

/**
 * The resolved order key of a property.
 *
 * `position` is the index in the flattened primary option. `prefixRank` is 0
 * for vendor-prefixed properties resolved via their unprefixed counterpart
 * (they must come right before it) and 1 otherwise.
 */
export type OrderKey = {
  position: number;
  prefixRank: 0 | 1;
};

/**
 * A property name paired with its resolved order key (null = unspecified).
 */
export type ResolvedProperty = {
  name: string;
  key: OrderKey | null;
};

/**
 * Checks whether a property name is a CSS custom property (`--foo`).
 */
export function isCustomProperty(name: string): boolean {
  return name.startsWith("--");
}

const VENDOR_PREFIX_PATTERN = /^-\w+-/;

/**
 * Removes a vendor prefix (e.g. `-webkit-`) from a property name, if any.
 */
export function stripVendorPrefix(name: string): string {
  return name.replace(VENDOR_PREFIX_PATTERN, "");
}

/**
 * Builds a map from lowercased property name to its position in the
 * flattened primary option. Properties of a `order: "flexible"` group all
 * share the same position, so they compare as equal.
 */
export function buildOrderMap(primary: PrimaryOption): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  let position = 0;
  for (const item of primary) {
    if (typeof item === "string") {
      map.set(item.toLowerCase(), position);
      position += 1;
      continue;
    }
    if (item.order === "flexible") {
      for (const property of item.properties) {
        map.set(property.toLowerCase(), position);
      }
      position += 1;
      continue;
    }
    for (const property of item.properties) {
      map.set(property.toLowerCase(), position);
      position += 1;
    }
  }
  return map;
}

/**
 * Resolves the order key of a property name.
 *
 * An exact (case-insensitive) match in the order map wins. Otherwise, a
 * vendor-prefixed property resolves to the position of its unprefixed
 * counterpart with `prefixRank: 0`, so it sorts right before it. Returns
 * null when the property is not covered by the order map (= unspecified).
 */
export function resolveOrderKey(
  orderMap: ReadonlyMap<string, number>,
  name: string,
): OrderKey | null {
  const lower = name.toLowerCase();
  const exact = orderMap.get(lower);
  if (exact !== undefined) {
    return { position: exact, prefixRank: 1 };
  }
  const unprefixed = stripVendorPrefix(lower);
  if (unprefixed !== lower) {
    const viaUnprefixed = orderMap.get(unprefixed);
    if (viaUnprefixed !== undefined) {
      return { position: viaUnprefixed, prefixRank: 0 };
    }
  }
  return null;
}

/**
 * Compares two resolved properties under the given `unspecified` mode.
 *
 * The "ignore" mode never reaches this comparison during checking (callers
 * filter unspecified properties out first); when fixing, callers pass
 * "bottom" instead, matching stylelint-order's fix behavior.
 */
export function compareProperties(
  a: ResolvedProperty,
  b: ResolvedProperty,
  unspecified: UnspecifiedOption,
): number {
  if (a.key === null && b.key === null) {
    if (unspecified === "bottomAlphabetical") {
      return a.name.toLowerCase() < b.name.toLowerCase()
        ? -1
        : a.name.toLowerCase() > b.name.toLowerCase()
          ? 1
          : 0;
    }
    return 0;
  }
  const positionA = resolvePosition(a.key, unspecified);
  const positionB = resolvePosition(b.key, unspecified);
  if (positionA !== positionB) {
    return positionA - positionB;
  }
  const rankA = a.key?.prefixRank ?? 1;
  const rankB = b.key?.prefixRank ?? 1;
  return rankA - rankB;
}

/**
 * Maps an order key to a sortable position, placing unspecified properties
 * according to the `unspecified` mode.
 */
function resolvePosition(key: OrderKey | null, unspecified: UnspecifiedOption): number {
  if (key !== null) {
    return key.position;
  }
  return unspecified === "top" ? -1 : Number.MAX_SAFE_INTEGER;
}
