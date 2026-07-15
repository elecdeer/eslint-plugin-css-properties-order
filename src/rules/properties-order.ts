/**
 * Rule to enforce the order of CSS properties within declaration blocks.
 *
 * Ported from stylelint-order's order/properties-order rule:
 * https://github.com/hudochenkov/stylelint-order/tree/master/rules/properties-order
 */
import type { CSSRuleDefinition } from "@eslint/css";
import type { DeclarationPlain } from "@eslint/css-tree";
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

type SecondaryOptions = {
  unspecified?: UnspecifiedOption;
};

type PropertiesOrderRuleDefinition = CSSRuleDefinition<{
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
