/**
 * Rule to enforce the order of CSS properties within declaration blocks.
 *
 * Ported from stylelint-order's order/properties-order rule:
 * https://github.com/hudochenkov/stylelint-order/tree/master/rules/properties-order
 */
import type { RuleTextEditor } from "@eslint/core";
import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, DeclarationPlain } from "@eslint/css-tree";
import { recessOrderGroups } from "../data/recess-order.ts";
import {
  buildOrderMap,
  compareProperties,
  isCustomProperty,
  resolveOrderKey,
  type PrimaryOption,
  type ResolvedProperty,
  type UnspecifiedOption,
} from "../lib/order.ts";

export type SecondaryOptions = {
  unspecified?: UnspecifiedOption;
};

export type PropertiesOrderRuleDefinition = CSSRuleDefinition<{
  RuleOptions: [PrimaryOption?, SecondaryOptions?];
  MessageIds: "expectedOrder";
}>;

/**
 * The default order map built from stylelint-config-recess-order's groups.
 */
const defaultOrderMap = buildOrderMap(recessOrderGroups.map((properties) => ({ properties })));

/**
 * A declaration node paired with its resolved order key.
 */
type OrderableDeclaration = {
  node: DeclarationPlain;
  property: ResolvedProperty;
};

const propertiesOrder: PropertiesOrderRuleDefinition = {
  meta: {
    type: "suggestion",
    fixable: "code",
    docs: {
      description: "Enforce the order of properties within declaration blocks",
      url: "https://github.com/elecdeer/eslint-plugin-css-order#properties-order",
    },
    messages: {
      expectedOrder: 'Expected "{{property}}" to come before "{{before}}".',
    },
    schema: [
      {
        type: "array",
        items: {
          anyOf: [
            { type: "string" },
            {
              type: "object",
              properties: {
                properties: {
                  type: "array",
                  items: { type: "string" },
                },
                groupName: { type: "string" },
                order: { enum: ["flexible"] },
              },
              required: ["properties"],
              additionalProperties: false,
            },
          ],
        },
      },
      {
        type: "object",
        properties: {
          unspecified: {
            enum: ["ignore", "top", "bottom", "bottomAlphabetical"],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const [primaryOption, secondaryOptions] = context.options;
    const orderMap = primaryOption === undefined ? defaultOrderMap : buildOrderMap(primaryOption);
    const unspecified = secondaryOptions?.unspecified ?? "ignore";
    // stylelint-order compatibility: when fixing, unspecified properties are
    // placed at the bottom unless another placement is configured.
    const unspecifiedForFix = unspecified === "ignore" ? "bottom" : unspecified;
    const { sourceCode } = context;

    /**
     * Checks whether the block can be fixed safely. Comments live outside the
     * AST (in `sourceCode.comments`) and would not move with the declarations,
     * and reordering across nested rules / at-rules could change the cascade,
     * so both cases suppress the fix.
     */
    function isFixable(blockChildren: readonly CssNodePlain[], orderable: OrderableDeclaration[]) {
      const first = orderable[0];
      const last = orderable[orderable.length - 1];
      if (first === undefined || last === undefined) {
        return false;
      }
      const [start] = sourceCode.getRange(first.node);
      const [, end] = sourceCode.getRange(last.node);
      for (const comment of sourceCode.comments ?? []) {
        const commentStart = comment.loc?.start.offset;
        const commentEnd = comment.loc?.end.offset;
        if (commentStart === undefined || commentEnd === undefined) {
          return false;
        }
        if (commentStart < end && commentEnd > start) {
          return false;
        }
      }
      const firstIndex = blockChildren.indexOf(first.node);
      const lastIndex = blockChildren.indexOf(last.node);
      for (let i = firstIndex + 1; i < lastIndex; i += 1) {
        if (blockChildren[i]?.type !== "Declaration") {
          return false;
        }
      }
      return true;
    }

    /**
     * Builds the slot-permutation fixes: each misplaced declaration's range
     * (slot) is replaced with the text of the declaration that should occupy
     * it, so a single pass fully sorts the block while whitespace, semicolons
     * and non-orderable nodes stay in place.
     */
    function* buildFixes(fixer: RuleTextEditor, orderable: OrderableDeclaration[]) {
      const sorted = orderable
        .map((item, index) => ({ item, index }))
        .sort(
          (a, b) =>
            compareProperties(a.item.property, b.item.property, unspecifiedForFix) ||
            a.index - b.index,
        );
      for (const [slot, { item }] of sorted.entries()) {
        const slotItem = orderable[slot];
        if (slotItem !== undefined && slotItem !== item) {
          yield fixer.replaceTextRange(
            sourceCode.getRange(slotItem.node),
            sourceCode.getText(item.node),
          );
        }
      }
    }

    return {
      Block(node) {
        const orderable: OrderableDeclaration[] = [];
        for (const child of node.children) {
          if (child.type !== "Declaration" || isCustomProperty(child.property)) {
            continue;
          }
          orderable.push({
            node: child,
            property: {
              name: child.property,
              key: resolveOrderKey(orderMap, child.property),
            },
          });
        }

        const sequence =
          unspecified === "ignore"
            ? orderable.filter((item) => item.property.key !== null)
            : orderable;

        const fixable = isFixable(node.children, orderable);

        let maxSoFar: OrderableDeclaration | null = null;
        for (const item of sequence) {
          if (
            maxSoFar !== null &&
            compareProperties(item.property, maxSoFar.property, unspecified) < 0
          ) {
            context.report({
              node: item.node,
              messageId: "expectedOrder",
              data: {
                property: item.node.property,
                before: maxSoFar.node.property,
              },
              fix: fixable ? (fixer) => buildFixes(fixer, orderable) : undefined,
            });
          } else {
            maxSoFar = item;
          }
        }
      },
    };
  },
};

export default propertiesOrder;
