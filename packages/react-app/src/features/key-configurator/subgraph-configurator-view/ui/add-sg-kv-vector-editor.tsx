/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useId} from 'react';

import {Tooltip} from '@qualcomm-ui/react/tooltip';

import {
  KvVectorEditor,
  type KvVectorEditorSuggestion as KvVectorEditorSuggestionItem,
} from '../../ui/kv-vector-editor';
import type {KvVectorEditorSuggestion} from '../lib/add-kv-vector-editor';
import {
  getKvVectorEditorDiagnosticMessage,
  type KvVectorEditorDiagnostic,
} from '../lib/kv-vector-editor-diagnostic';

/**
 * Adapts SGKV parser and suggestion data to the reusable editor control.
 * It owns no candidate state: the parent owns text and suggestion commits.
 */
/** SGKV adapter between domain parsing/suggestions and the generic editor UI. */
export interface AddSgKvVectorEditorProps {
  diagnostic: KvVectorEditorDiagnostic | null;
  onCaretPositionChange?: (caretPosition: number) => void;
  onSuggestionCommit: (suggestion: KvVectorEditorSuggestion) => void;
  onTextChange: (text: string) => void;
  suggestions: KvVectorEditorSuggestion[];
  text: string;
}

/** Renders Add-candidate text, suggestions, and parser feedback together. */
export function AddSgKvVectorEditor({
  diagnostic,
  onCaretPositionChange,
  onSuggestionCommit,
  onTextChange,
  suggestions,
  text,
}: AddSgKvVectorEditorProps) {
  const diagnosticId = useId();
  const editorSuggestions: KvVectorEditorSuggestionItem<KvVectorEditorSuggestion>[] =
    suggestions.map((suggestion) => ({
      id: `${suggestion.keySystemId}:${suggestion.valueSystemId ?? ''}`,
      primaryText: suggestion.valueLabel,
      // Values can repeat under different keys, so keep the owning key visible.
      secondaryText: `Key: ${suggestion.keyLabel}`,
      value: suggestion,
    }));

  return (
    <div className="flex flex-col gap-1">
      <Tooltip
        trigger={
          <span className="block">
            <KvVectorEditor
              ariaDescribedBy={diagnostic ? diagnosticId : undefined}
              ariaLabel="Add KV Vector Editor"
              clearable
              onCaretPositionChange={onCaretPositionChange}
              onSuggestionCommit={onSuggestionCommit}
              onTextChange={onTextChange}
              placeholder="Search keys or values to build a KV vector"
              suggestions={editorSuggestions}
              text={text}
            />
          </span>
        }
      >
        Search keys or values, then select suggestions to build a KV vector.
      </Tooltip>
      {diagnostic && (
        <div
          className={`text-xs ${
            diagnostic.severity === 'error'
              ? 'text-support-danger'
              : diagnostic.severity === 'warning'
                ? 'text-icon-support-warning'
                : 'text-neutral-secondary'
          }`}
          id={diagnosticId}
          role={diagnostic.severity === 'error' ? 'alert' : 'status'}
        >
          {getKvVectorEditorDiagnosticMessage(diagnostic)}
        </div>
      )}
    </div>
  );
}
