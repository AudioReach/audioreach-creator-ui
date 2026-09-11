/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useRef} from 'react';

import {Search} from 'lucide-react';

import {TextInput} from '@qualcomm-ui/react/text-input';

/**
 * Normalizes QUI typing and Clear actions into one controlled search callback.
 * Electron can deliver those paths through different events, so values dedupe.
 */
/** Controlled search input that reports typing and QUI clear-button changes. */
interface ArcSearchBarProps {
  /** Receives each distinct rendered search value. */
  onSearchChange: (value: string) => void;
  placeholder?: string;
  searchTerm: string;
}

/** Provides a stable controlled bridge over QUI's input and Clear behavior. */
export default function ArcSearchBar({
  onSearchChange,
  placeholder,
  searchTerm,
}: ArcSearchBarProps) {
  const lastReportedSearchTerm = useRef(searchTerm);

  useEffect(() => {
    lastReportedSearchTerm.current = searchTerm;
  }, [searchTerm]);

  const reportSearchChange = (value: string): void => {
    // QUI may emit both callbacks for one change; notify state consumers once.
    if (lastReportedSearchTerm.current === value) {
      return;
    }
    lastReportedSearchTerm.current = value;
    onSearchChange(value);
  };

  return (
    <TextInput
      aria-label={placeholder || 'Search'}
      className="w-full border-transparent bg-transparent text-base placeholder-gray-400 focus:outline-none"
      inputProps={{
        // QUI can emit only a native input event immediately after Clear.
        onInput: (event) => reportSearchChange(event.currentTarget.value),
      }}
      onValueChange={reportSearchChange}
      placeholder={placeholder}
      startIcon={Search}
      value={searchTerm}
    />
  );
}
