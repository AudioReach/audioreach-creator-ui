/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseCategory, UsecaseItem} from '~entities/usecases';

// Boolean AST for a parsed search expression (+ = AND, | = OR, () = grouping).
type SearchExpressionNode =
  | {type: 'term'; value: string}
  | {left: SearchExpressionNode; right: SearchExpressionNode; type: 'and'}
  | {left: SearchExpressionNode; right: SearchExpressionNode; type: 'or'};

function tokenizeSearchExpression(input: string): string[] {
  const tokens: string[] = [];
  let current = '';

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) {
      tokens.push(trimmed);
    }
    current = '';
  };

  for (const char of input) {
    if (char === '(' || char === ')' || char === '+' || char === '|') {
      flush();
      tokens.push(char);
    } else {
      current += char;
    }
  }
  flush();

  return tokens;
}

// Grammar (+ binds tighter than |): orExpr := andExpr ('|' andExpr)*
// andExpr := primary ('+' primary)*; primary := '(' orExpr ')' | TERM
// Malformed input degrades gracefully: trailing operators are stripped,
// unclosed parens just stop consuming, empty input yields null (no filter).
function parseSearchExpression(tokens: string[]): SearchExpressionNode | null {
  const trimmedTokens = [...tokens];
  while (
    trimmedTokens.length > 0 &&
    (trimmedTokens[trimmedTokens.length - 1] === '+' ||
      trimmedTokens[trimmedTokens.length - 1] === '|')
  ) {
    trimmedTokens.pop();
  }

  if (trimmedTokens.length === 0) {
    return null;
  }

  let pos = 0;

  const peek = (): string | undefined => trimmedTokens[pos];
  const consume = (): string | undefined => trimmedTokens[pos++];

  const parsePrimary = (): SearchExpressionNode | null => {
    const token = peek();
    if (token === undefined) {
      return null;
    }

    if (token === '(') {
      consume();
      const inner = parseOr();
      if (peek() === ')') {
        consume();
      }
      return inner;
    }

    if (token === '+' || token === '|' || token === ')') {
      // Unexpected operator in primary position — skip it defensively.
      consume();
      return parsePrimary();
    }

    consume();
    return {type: 'term', value: token};
  };

  const parseAnd = (): SearchExpressionNode | null => {
    let left = parsePrimary();
    while (left !== null && peek() === '+') {
      consume();
      const right = parsePrimary();
      if (right === null) {
        break;
      }
      left = {left, right, type: 'and'};
    }
    return left;
  };

  const parseOr = (): SearchExpressionNode | null => {
    let left = parseAnd();
    while (left !== null && peek() === '|') {
      consume();
      const right = parseAnd();
      if (right === null) {
        break;
      }
      left = {left, right, type: 'or'};
    }
    return left;
  };

  return parseOr();
}

// Case-insensitive substring match against the item's name, or key/value names.
function matchesUsecaseItem(item: UsecaseItem, term: string): boolean {
  const target = term.trim().toLowerCase();
  if (!target) {
    return false;
  }
  if (item.name.toLowerCase().includes(target)) {
    return true;
  }
  return item.keyValuePairs.some(
    (kv) =>
      kv.key.name.toLowerCase().includes(target) ||
      kv.value.name.toLowerCase().includes(target),
  );
}

function evaluateSearchExpression(
  node: SearchExpressionNode,
  item: UsecaseItem,
): boolean {
  switch (node.type) {
    case 'term':
      return matchesUsecaseItem(item, node.value);
    case 'and':
      return (
        evaluateSearchExpression(node.left, item) &&
        evaluateSearchExpression(node.right, item)
      );
    case 'or':
      return (
        evaluateSearchExpression(node.left, item) ||
        evaluateSearchExpression(node.right, item)
      );
    default:
      return false;
  }
}

function filterUsecaseItemsByExpression(
  items: UsecaseItem[],
  expression: SearchExpressionNode,
): UsecaseItem[] {
  const result: UsecaseItem[] = [];

  for (const item of items) {
    if (item.children?.length) {
      const filteredChildren = filterUsecaseItemsByExpression(
        item.children,
        expression,
      );
      if (filteredChildren.length === item.children.length) {
        result.push(item);
      } else if (filteredChildren.length > 0) {
        result.push({...item, children: filteredChildren});
      }
      continue;
    }

    if (evaluateSearchExpression(expression, item)) {
      result.push(item);
    }
  }

  return result;
}

/**
 * Filters an already-loaded usecase category tree
 */
export function filterUsecasesLocally(
  categories: UsecaseCategory[],
  searchTerm: string,
): UsecaseCategory[] {
  const tokens = tokenizeSearchExpression(searchTerm);
  const expression = parseSearchExpression(tokens);

  if (expression === null) {
    return categories;
  }

  return categories
    .map((category) => ({
      ...category,
      items: filterUsecaseItemsByExpression(category.items, expression),
    }))
    .filter((category) => category.items.length > 0);
}
