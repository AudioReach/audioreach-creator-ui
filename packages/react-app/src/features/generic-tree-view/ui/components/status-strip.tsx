/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

interface StatusStripProps {
  dirtyCount: number;
  paramCount: number;
  setCount: number;
  totalParamCount?: number;
}

export function StatusStrip({
  dirtyCount,
  paramCount,
  setCount,
  totalParamCount,
}: StatusStripProps) {
  const countLabel =
    totalParamCount !== undefined && totalParamCount !== paramCount
      ? `${paramCount} of ${totalParamCount} params`
      : `${paramCount} params`;

  return (
    <div className="text-neutral-secondary bg-neutral-01 flex shrink-0 items-center gap-2.5 border-t px-4 py-1.5 text-xs">
      <span>{countLabel}</span>
      {dirtyCount > 0 && (
        <>
          <span className="opacity-35">·</span>
          <span className="text-icon-support-warning">{dirtyCount} dirty</span>
        </>
      )}
      {setCount > 0 && (
        <>
          <span className="opacity-35">·</span>
          <span className="text-support-success">{setCount} set</span>
        </>
      )}
    </div>
  );
}
