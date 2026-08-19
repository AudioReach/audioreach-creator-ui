/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Info, TriangleAlert, X} from 'lucide-react';

import {Icon} from '@qualcomm-ui/react/icon';

import {SeverityType} from '../model/validation-result.types';

/**
 * Returns the appropriate icon component based on severity level
 */
export const getSeverityIcon = (severity: string) => {
  switch (severity as SeverityType) {
    case SeverityType.Critical:
      return (
        <Icon
          className="text-icon-support-danger"
          icon={TriangleAlert}
          size="xs"
        />
      );
    case SeverityType.Error:
      return (
        <Icon
          className="text-icon-support-danger"
          icon={X}
          size="xs"
        />
      );
    case SeverityType.Warning:
      return (
        <Icon
          className="text-icon-support-warning"
          icon={TriangleAlert}
          size="xs"
        />
      );
    default:
      return (
        <Icon
          className="text-icon-neutral-secondary"
          icon={Info}
          size="xs"
        />
      );
  }
};
