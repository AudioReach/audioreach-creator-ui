/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Converts parser outcomes into user-facing feedback for the Add Editor.
 * Formatting is normalized silently; only incomplete or invalid input reaches
 * this structured diagnostic contract.
 */
/** Structured parser feedback consumed by the Add KV Vector Editor. */
export type KvVectorEditorDiagnostic =
  | {code: 'definitions-unavailable'; severity: 'error'}
  | {code: 'incomplete-pair'; fragment: string; severity: 'hint'}
  | {code: 'value-suggestion-pending'; severity: 'hint'}
  | {code: 'missing-key'; fragment: string; severity: 'error'}
  | {code: 'missing-brackets'; fragment: string; severity: 'error'}
  | {
      code: 'missing-value';
      fragment: string;
      keyName: string;
      severity: 'error';
    }
  | {code: 'missing-separator'; fragment: string; severity: 'error'}
  | {code: 'extra-separator'; fragment: string; severity: 'error'}
  | {code: 'malformed-entry'; fragment: string; severity: 'error'}
  | {code: 'unknown-key'; keyName: string; severity: 'error'}
  | {code: 'ambiguous-key'; keyName: string; severity: 'error'}
  | {
      code: 'unknown-value';
      keyName: string;
      severity: 'error';
      valueName: string;
    }
  | {
      code: 'ambiguous-value';
      keyName: string;
      severity: 'error';
      valueName: string;
    }
  | {code: 'duplicate-key'; keyName: string; severity: 'error'}
  | {code: 'empty-value-token'; fragment: string; severity: 'error'}
  | {code: 'unknown-value-token'; severity: 'error'; valueName: string}
  | {
      code: 'value-only-auto-resolved';
      resolutions: Array<{
        candidateKeyNames: string[];
        resolvedKeyNames: string[];
        valueName: string;
      }>;
      severity: 'warning';
    }
  | {
      candidateKeyNames: string[];
      code: 'value-only-no-distinct-key-assignment';
      severity: 'error';
      valueNames: string[];
    }
  | {
      code: 'used-key-conflict';
      keyName: string;
      severity: 'error';
      valueName: string;
    }
  | {code: 'value-only-unavailable'; severity: 'error'};

/** Converts parser diagnostics into precise user-facing guidance. */
export function getKvVectorEditorDiagnosticMessage(
  diagnostic: KvVectorEditorDiagnostic,
): string {
  switch (diagnostic.code) {
    case 'definitions-unavailable':
      return 'Key/value definitions are unavailable for this project.';
    case 'incomplete-pair':
      return diagnostic.fragment.includes(':')
        ? `Complete "${diagnostic.fragment}" with ].`
        : `Complete "${diagnostic.fragment}" as [Key:Value].`;
    case 'value-suggestion-pending':
      return 'Select a matching value from the suggestions.';
    case 'missing-key':
      return `"${diagnostic.fragment}" is missing a key.`;
    case 'missing-brackets':
      return `"${diagnostic.fragment}" must use [Key:Value] format.`;
    case 'missing-value':
      return `"${diagnostic.fragment}" is missing a value.`;
    case 'missing-separator':
      return `"${diagnostic.fragment}" must use [Key:Value] format.`;
    case 'extra-separator':
      return `"${diagnostic.fragment}" contains more than one : symbol.`;
    case 'malformed-entry':
      return `"${diagnostic.fragment}" is not a valid [Key:Value] entry.`;
    case 'unknown-key':
      return `Key "${diagnostic.keyName}" was not found.`;
    case 'ambiguous-key':
      return `Key "${diagnostic.keyName}" matches multiple definitions.`;
    case 'unknown-value':
      return `Value "${diagnostic.valueName}" is not available for key "${diagnostic.keyName}".`;
    case 'ambiguous-value':
      return `Value "${diagnostic.valueName}" matches multiple values for key "${diagnostic.keyName}".`;
    case 'duplicate-key':
      return `Key "${diagnostic.keyName}" is already used in this KV vector.`;
    case 'empty-value-token':
      return `"${diagnostic.fragment}" contains an empty value between + symbols.`;
    case 'unknown-value-token':
      return `Value "${diagnostic.valueName}" was not found for any key.`;
    case 'value-only-auto-resolved':
      return 'Values are shared by multiple keys. Matching keys were selected automatically by key ID. Use Key Value mode to choose keys explicitly, or verify the Selection Panel.';
    case 'value-only-no-distinct-key-assignment': {
      const uniqueValueNames = [...new Set(diagnostic.valueNames)];
      return uniqueValueNames.length === 1
        ? `Value "${uniqueValueNames[0]}" appears ${diagnostic.valueNames.length} times but only ${diagnostic.candidateKeyNames.length} distinct keys match: ${diagnostic.candidateKeyNames.join(', ')}. Use [Key:Value] format or revise the Selection Panel.`
        : `The values ${uniqueValueNames.map((valueName) => `"${valueName}"`).join(', ')} cannot be assigned to distinct keys. Use [Key:Value] format or revise the Selection Panel.`;
    }
    case 'used-key-conflict':
      return `Value "${diagnostic.valueName}" belongs to key "${diagnostic.keyName}", which is already used.`;
    case 'value-only-unavailable':
      return 'Use [Key:Value] format because + occurs in a definition name.';
  }
}
