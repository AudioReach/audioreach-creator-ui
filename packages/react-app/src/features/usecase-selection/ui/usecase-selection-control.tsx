/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useMemo, useRef, useState} from 'react';

import {Search} from 'lucide-react';
import {createPortal} from 'react-dom';

import {ProgressRing} from '@qualcomm-ui/react/progress-ring';
import {TextInput} from '@qualcomm-ui/react/text-input';

import {deleteUsecases} from '~entities/usecases/api/usecases-api';
import type {KeyValueInfo} from '~entities/usecases/model/usecase.dto';
import {showToast} from '~shared/controls/global-toaster';

import type {KeyValue, Usecase, UsecaseCategory} from '../model/types';

import UsecaseListPanel from './usecase-list-panel';

// Utility to format a Usecase's keyValueCollection into a display string
const formatUsecaseDisplay = (usecase: Usecase): string => {
  return usecase.keyValueCollection
    .map((kv: KeyValueInfo) => kv.valueInfo.valueLabel)
    .join(' • ');
};

interface UsecaseSelectionControlProps {
  onSelectedUsecasesChange: (usecases: string[]) => void;
  projectId: string;
  selectedUsecases: string[];
  usecaseData: UsecaseCategory[];
}

const UsecaseSelectionControl: React.FC<UsecaseSelectionControlProps> = ({
  onSelectedUsecasesChange,
  projectId,
  selectedUsecases,
  usecaseData,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    usecaseData.filter((cat) => cat.expanded).map((cat) => cat.name),
  );
  const [localUsecaseData, setLocalUsecaseData] =
    useState<UsecaseCategory[]>(usecaseData);

  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [...prev, categoryName],
    );
  };

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDeleting) {
        return;
      }
      const target = event.target as Element;
      // Ignore dialog portal clicks — prevents dropdown from closing before delete
      // runs
      if (target.closest('[data-scope="dialog"]')) {
        return;
      }
      if (
        containerRef.current &&
        !containerRef.current.contains(target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      // Use capture phase to catch events before they're stopped by child components
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('keydown', handleEscapeKey);
    } else {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isDropdownOpen, isDeleting]);

  const handleSelectUsecase = (
    formattedUsecase: string,
    isSelected: boolean,
  ) => {
    if (isSelected) {
      onSelectedUsecasesChange([...selectedUsecases, formattedUsecase]);
    } else {
      onSelectedUsecasesChange(
        selectedUsecases.filter((uc) => uc !== formattedUsecase),
      );
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allUsecaseStrings = localUsecaseData.flatMap((category) =>
        category.usecases.map((uc: Usecase) => formatUsecaseDisplay(uc)),
      );
      onSelectedUsecasesChange(allUsecaseStrings);
    } else {
      onSelectedUsecasesChange([]);
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    const selectedSet = new Set(selectedUsecases);

    const systemIds = usecaseData
      .flatMap((category) => category.usecases)
      .filter((usecase) => selectedSet.has(formatUsecaseDisplay(usecase)))
      .map((usecase) => usecase.systemId);

    const nextData = usecaseData
      .map((category) => ({
        ...category,
        usecases: category.usecases.filter(
          (usecase) => !selectedSet.has(formatUsecaseDisplay(usecase)),
        ),
      }))
      .filter((category) => category.usecases.length > 0);
    if ((await deleteUsecases(projectId, systemIds)).success) {
      setLocalUsecaseData(nextData);
      onSelectedUsecasesChange([]);
      setIsDropdownOpen(false);
    } else {
      showToast(
        `Failed to delete usecase${systemIds.length > 1 ? 's' : ''}.`,
        'danger',
      );
    }
    setIsDeleting(false);
  };

  // Utility to determine if a usecase is checked based on its current display
  // format. This needs to be consistent with how selectedUsecases are stored.
  const isUsecaseChecked = (usecase: Usecase) => {
    return selectedUsecases.includes(formatUsecaseDisplay(usecase));
  };

  // Filter usecases based on search term
  const filteredUsecaseData = useMemo(
    () =>
      localUsecaseData
        .map((category) => ({
          ...category,
          usecases: category.usecases.filter((usecase: Usecase) => {
            if (!searchTerm) {
              return true;
            }
            const formattedUsecase =
              formatUsecaseDisplay(usecase).toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            return (
              formattedUsecase.includes(searchLower) ||
              usecase.keyValueCollection.some(
                (kv: KeyValue) =>
                  kv.keyInfo.keyLabel.toLowerCase().includes(searchLower) ||
                  kv.valueInfo.valueLabel.toLowerCase().includes(searchLower),
              )
            );
          }),
        }))
        .filter((category) => category.usecases.length > 0),
    [localUsecaseData, searchTerm],
  );

  return (
    <div ref={containerRef} className="relative">
      {isDeleting &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
              backdropFilter: 'blur(2px)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              className="rounded-lg p-8 shadow-xl"
              style={{backgroundColor: 'var(--color-surface-raised)'}}
            >
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <ProgressRing />
                </div>
                <div
                  className="mb-2 text-lg font-semibold"
                  style={{color: 'var(--color-text-neutral-primary)'}}
                >
                  {`Deleting Usecase${selectedUsecases.length > 1 ? 's' : ''}...`}
                </div>
                <div
                  className="text-sm"
                  style={{color: 'var(--color-text-neutral-secondary)'}}
                >
                  Please wait...
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* Search Bar */}
      <div className="relative">
        <TextInput
          aria-label="Search for usecases"
          clearable
          inputProps={{
            onFocus: () => setIsDropdownOpen(true),
          }}
          onValueChange={(value) => setSearchTerm(value)}
          placeholder="Search for usecases..."
          size="md"
          startIcon={Search}
          value={searchTerm}
        />
      </div>

      {/* Dropdown Content */}
      {isDropdownOpen && (
        <div
          className="absolute left-0 right-0 top-full z-10 mt-1 flex max-h-96 rounded-md shadow-lg"
          style={{
            backgroundColor: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border-neutral-02)',
          }}
        >
          <UsecaseListPanel
            expandedCategories={expandedCategories}
            formatUsecaseDisplay={formatUsecaseDisplay}
            handleSelectAll={handleSelectAll}
            handleSelectUsecase={handleSelectUsecase}
            isUsecaseChecked={isUsecaseChecked}
            onClose={() => setIsDropdownOpen(false)}
            onDeleteSelected={handleDeleteSelected}
            selectedUsecases={selectedUsecases}
            toggleCategoryExpansion={toggleCategoryExpansion}
            usecaseData={filteredUsecaseData}
          />
        </div>
      )}
    </div>
  );
};

export default UsecaseSelectionControl;
