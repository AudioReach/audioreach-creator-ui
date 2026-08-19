/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useRef, useState} from 'react';

import {ProgressRing} from '@qualcomm-ui/react/progress-ring';

interface ViewSwitchOverlayProps {
  active: boolean;
  switchingTo: 'legacy' | 'modern' | null;
}

const DURATION_MS = 700;

export function ViewSwitchOverlay({
  active,
  switchingTo,
}: ViewSwitchOverlayProps) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      startRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const step = (timestamp: number) => {
      if (!startRef.current) {
        startRef.current = timestamp;
      }
      const elapsed = timestamp - startRef.current;
      const pct = Math.min(100, Math.round((elapsed / DURATION_MS) * 100));
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [active]);

  if (!active) {
    return null;
  }

  const label =
    switchingTo === 'legacy'
      ? 'Switching to Legacy view…'
      : 'Switching to Modern view…';

  return (
    <div className="bg-overlay absolute inset-0 z-50 flex flex-col items-center justify-center gap-4">
      <ProgressRing size="xl" value={progress} />
      <span className="text-neutral-secondary text-sm">{label}</span>
    </div>
  );
}
