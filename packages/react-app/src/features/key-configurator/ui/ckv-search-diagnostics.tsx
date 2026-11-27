/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CkvSearchDiagnostic} from '../module-configurator-view/lib/ckv-search-resolver';

function renderDiagnostic(diagnostic: CkvSearchDiagnostic, key: number) {
  if (diagnostic.code === 'unknown-token') {
    return (
      <div key={key}>
        Value &quot;{diagnostic.token}&quot; was not found for any key.
      </div>
    );
  }
  if (diagnostic.code === 'value-auto-resolved-by-key-id') {
    return (
      <div key={key}>
        {diagnostic.valueName} is ambiguous between{' '}
        {diagnostic.candidateKeyNames.join(', ')}; resolved to the lowest-ID
        key.
      </div>
    );
  }
  return (
    <div key={key}>
      Cannot assign distinct keys to tokens: {diagnostic.tokens.join(', ')}
    </div>
  );
}

export interface CkvSearchDiagnosticsProps {
  diagnostics: CkvSearchDiagnostic[];
}

export function CkvSearchDiagnostics({diagnostics}: CkvSearchDiagnosticsProps) {
  if (diagnostics.length === 0) {
    return null;
  }
  return (
    <div className="text-support-danger text-sm" role="alert">
      {diagnostics.map((diagnostic, index) =>
        renderDiagnostic(diagnostic, index),
      )}
    </div>
  );
}
