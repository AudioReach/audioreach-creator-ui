/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useMemo, useRef, useState} from 'react';

import {X} from 'lucide-react';

import {Button} from '@qualcomm-ui/react/button';

import ArcCombobox from './arc-combobox';
import ArcTextInput from './arc-text-input';
import './arc-channel-config-dialog.css';

export interface ArcChannelConfigDialogProperties {
  maxChannelCount?: number;
  onClose: () => void;
  onSave?: (channelConfig: {[key: number]: string}) => void;
  options?: string[];
  selectedChannelValues?: {[key: number]: string};
  validateDuplicates?: boolean;
}

interface ValidationResult {
  duplicates: {[key: string]: number[]};
  isValid: boolean;
  message?: string;
}

const ArcChannelConfigDialog: React.FC<ArcChannelConfigDialogProperties> = ({
  maxChannelCount,
  onClose,
  onSave,
  options = [],
  selectedChannelValues = {},
  validateDuplicates = true,
}) => {
  const popupReference = useRef<HTMLDivElement>(null);

  // Auto-populate logic: if no selected values provided but maxChannelCount exists,
  // set default count to maxChannelCount
  const initialChannelCount =
    Object.keys(selectedChannelValues).length === 0 && maxChannelCount
      ? maxChannelCount
      : Object.keys(selectedChannelValues).length > 0
        ? Math.max(...Object.keys(selectedChannelValues).map(Number))
        : 0;

  // Auto-populate channel values based on index if no selected values provided
  const initialChannelValues = useMemo(() => {
    if (Object.keys(selectedChannelValues).length > 0) {
      return selectedChannelValues;
    }

    if (maxChannelCount && Object.keys(selectedChannelValues).length === 0) {
      const autoValues: {[key: number]: string} = {};
      for (let index = 0; index < maxChannelCount; index++) {
        // Use options array values on index basis, or fallback to dynamic channel
        // naming
        autoValues[index] = options[index] || `channel_${index}`;
      }
      return autoValues;
    }

    return selectedChannelValues;
  }, [selectedChannelValues, maxChannelCount, options]);

  // State for number of channels - initialize with calculated value
  const [channelCount, setChannelCount] = useState<number>(initialChannelCount);

  // State for channel values - initialize with calculated values
  const [channelValues, setChannelValues] = useState<{[key: number]: string}>(
    initialChannelValues,
  );

  // Handle escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Prevent body scrolling when popup is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Track previous channel count to detect changes
  const previousChannelCountReference = useRef<number>(channelCount);

  // Update channel values when count changes
  useEffect(() => {
    // Only proceed if channel count actually changed
    if (previousChannelCountReference.current === channelCount) {
      return;
    }

    setChannelValues((previousChannelValues) => {
      // Create a new object with the current channel count
      const newChannelValues = {...previousChannelValues};

      // Add new channels if needed
      for (let index = 0; index < channelCount; index++) {
        if (!newChannelValues[index]) {
          // Use options array values on index basis, or fallback to dynamic channel
          // naming
          newChannelValues[index] = options[index] || `channel_${index}`;
        }
      }

      // Remove extra channels if count decreased
      for (const key of Object.keys(newChannelValues)) {
        const channelNumber = Number.parseInt(key, 10);
        if (channelNumber >= channelCount) {
          delete newChannelValues[channelNumber];
        }
      }

      return newChannelValues;
    });

    // Update the previous channel count ref
    previousChannelCountReference.current = channelCount;
  }, [channelCount, options]);

  // Handle channel count change
  const handleChannelCountChange = (value: string) => {
    const count = Number.parseInt(value, 10);
    if (
      !isNaN(count) &&
      count >= 0 &&
      (maxChannelCount === undefined || count <= maxChannelCount)
    ) {
      setChannelCount(count);
    }
  };

  // Handle channel value change
  const handleChannelValueChange = (
    channelNumber: number,
    value: string | string[] | null,
  ) => {
    // Handle null value and convert array to string if needed (take first value)
    const stringValue =
      value === null ? '' : Array.isArray(value) ? value[0] || '' : value || '';

    setChannelValues((previous) => ({
      ...previous,
      [channelNumber]: stringValue,
    }));
  };

  // Validate channel values for duplicates
  const validation: ValidationResult = useMemo(() => {
    if (!validateDuplicates) {
      return {
        duplicates: {},
        isValid: true,
      };
    }

    const duplicates: {[key: string]: number[]} = {};
    const valueToChannels: {[key: string]: number[]} = {};

    // Group channels by their values (excluding empty values)
    for (const [channelKey, value] of Object.entries(channelValues)) {
      if (value && value.trim() !== '') {
        const trimmedValue = value.trim();
        if (!valueToChannels[trimmedValue]) {
          valueToChannels[trimmedValue] = [];
        }
        valueToChannels[trimmedValue].push(Number.parseInt(channelKey, 10));
      }
    }

    // Find duplicates
    for (const [value, channels] of Object.entries(valueToChannels)) {
      if (channels.length > 1) {
        duplicates[value] = channels;
      }
    }

    const isValid = Object.keys(duplicates).length === 0;
    const message = isValid
      ? undefined
      : `Duplicate values found: ${Object.keys(duplicates).join(', ')}`;

    return {
      duplicates,
      isValid,
      message,
    };
  }, [channelValues, validateDuplicates]);

  // Check if a channel has a duplicate value
  const isChannelDuplicate = (channelNumber: number): boolean => {
    const channelValue = channelValues[channelNumber];
    if (!channelValue || channelValue.trim() === '') {
      return false;
    }

    const trimmedValue = channelValue.trim();
    return (
      validation.duplicates[trimmedValue]?.includes(channelNumber) || false
    );
  };

  // Handle save button click
  const handleSave = () => {
    if (onSave) {
      onSave(channelValues);
    }
    onClose();
  };

  // Generate extended options for dropdowns
  const extendedOptions = useMemo(() => {
    const allOptions = [...options];

    // Add missing channels up to the current channel count, not maxChannelCount
    if (options.length < channelCount) {
      for (let index = options.length; index < channelCount; index++) {
        allOptions.push(`channel_${index}`);
      }
    }

    return allOptions;
  }, [options, channelCount]);

  // Generate channel inputs
  const renderChannelInputs = () => {
    const inputs = [];

    for (let index = 0; index < channelCount; index++) {
      const displayLabel = `Channel ${index}`;
      const isDuplicate = isChannelDuplicate(index);
      const currentValue = channelValues[index] || '';

      // Create options array with current value included for filtering support
      const optionsWithCurrentValue =
        currentValue && !extendedOptions.includes(currentValue)
          ? [...extendedOptions, currentValue]
          : extendedOptions;

      inputs.push(
        <div key={index} className="channel-config-item">
          <div className="channel-config-row">
            <label className="channel-config-label">{displayLabel}</label>
            <div className="channel-config-input">
              <ArcCombobox
                error={isDuplicate}
                filterable
                fullWidth
                hint={isDuplicate ? 'Duplicate value' : undefined}
                onChange={(value) => handleChannelValueChange(index, value)}
                options={optionsWithCurrentValue}
                placeholder={displayLabel}
                value={currentValue}
              />
            </div>
          </div>
        </div>,
      );
    }

    return inputs;
  };

  return (
    <div className="popup-overlay">
      <div
        ref={popupReference}
        aria-labelledby="arc-popup-title"
        aria-modal="true"
        className="popup-content"
        role="dialog"
      >
        <div className="popup-header">
          <h2 className="popup-title" id="arc-popup-title">
            Channel Configuration
          </h2>
          <Button
            aria-label="Close"
            color="neutral"
            onClick={onClose}
            size="sm"
            variant="ghost"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="popup-body">
          <div className="channel-config-container">
            <div className="channel-config-row">
              <div className="channel-config-label-config">
                Number of channels:
              </div>
              <div className="channel-config-input-wrapper">
                <ArcTextInput
                  max={maxChannelCount}
                  min={0}
                  onChange={handleChannelCountChange}
                  size="sm"
                  type="number"
                  value={channelCount.toString()}
                />
              </div>
            </div>

            {channelCount > 0 && (
              <>
                <div className="channel-config-separator"></div>
                {!validation.isValid && (
                  <div className="channel-config-validation-message">
                    {validation.message}
                  </div>
                )}
                <div className="channel-config-channels">
                  {renderChannelInputs()}
                </div>
              </>
            )}

            {channelCount === 0 && (
              <div className="channel-config-empty-message">
                Please specify the number of channels to configure
              </div>
            )}
          </div>
        </div>

        <div className="popup-footer">
          <div className="popup-footer-buttons">
            <Button color="neutral" onClick={onClose} variant="fill">
              Cancel
            </Button>
            <Button color="primary" onClick={handleSave} variant="fill">
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArcChannelConfigDialog;
