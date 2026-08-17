/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect} from 'react';

import {logger} from '~shared/lib/logger';
import {useProjectStoreShallow} from '~shared/store';

export const PropertiesPanel: React.FC = () => {
  // Not mounted anywhere yet — read for when this panel is built out, so it
  // stays wired to the same source every other panel already reads.
  const isEditable = useProjectStoreShallow((s) => s.editModeState === 'edit');

  useEffect(() => {
    logger.debug(`[PropertiesPanel] editable state: ${isEditable}`, {
      component: 'PropertiesPanel',
    });
  }, [isEditable]);

  return (
    <div className="p-4 text-sm text-gray-500">
      Properties Panel — Placeholder
    </div>
  );
};
