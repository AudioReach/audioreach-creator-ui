/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseDto} from '~entities/usecases';
import type {
  ControlLinkWithUsecasesDto,
  DataLinkWithUsecasesDto,
  SpfModuleDto,
} from '~entities/usecases/model/usecase-component.dto';
import {
  ConvertNumberToHexString,
  ConvertNumberToMinimalHexString,
  ConvertStringToNumber,
} from '~shared/utils/converter-utils';

import type {ConnectionRow} from '../model/port-connections-info.types';

/**
 * Backend responses have been observed sending duplicate usecase entries
 * (same systemId) within a single link's usecases array. Returns the
 * input array unchanged when it has no duplicates, to avoid an
 * unnecessary allocation on the common case.
 */
function dedupeUsecasesBySystemId(usecases: UsecaseDto[]): UsecaseDto[] {
  const bySystemId = new Map(usecases.map((u) => [u.systemId, u]));
  return bySystemId.size === usecases.length
    ? usecases
    : [...bySystemId.values()];
}

/**
 * Formats a fallback systemId for display: hex-converts it when it happens
 * to be numeric (matching the batched-lookup-hit formatting), otherwise
 * returns it unchanged.
 */
function formatFallbackId(systemId: string): string {
  const normalizedSystemId = String(systemId);
  const asNumber = ConvertStringToNumber(normalizedSystemId);
  if (asNumber === null) {
    return normalizedSystemId;
  }
  return ConvertNumberToHexString(asNumber) ?? normalizedSystemId;
}

function resolveOtherModuleSystemId(
  link: {destinationSystemId: string; sourceSystemId: string},
  selfModuleSystemId: string,
): string {
  const sourceId = String(link.sourceSystemId);
  return sourceId === selfModuleSystemId
    ? String(link.destinationSystemId)
    : sourceId;
}

function resolveOtherPortSystemId(
  link: {
    destinationPortSystemId: string;
    destinationSystemId: string;
    sourcePortSystemId: string;
    sourceSystemId: string;
  },
  selfModuleSystemId: string,
): string {
  return String(link.sourceSystemId) === selfModuleSystemId
    ? String(link.destinationPortSystemId)
    : String(link.sourcePortSystemId);
}

/**
 * Only a matched port's own `id` is a valid display value — the port's
 * systemId is an internal key, never shown to the user. When no port
 * matches (module lookup miss, or the port is absent from the module's
 * dataPorts/controlPorts), display "—", matching the subgraph column.
 */
function findOtherPortId(
  module: SpfModuleDto | undefined,
  otherPortSystemId: string,
): string {
  const port = [
    ...(module?.dataPorts ?? []),
    ...(module?.controlPorts ?? []),
  ].find((p) => String(p.systemId) === otherPortSystemId);
  const id = port?.naturalId;
  return id !== undefined
    ? (ConvertNumberToMinimalHexString(Number(id)) ?? String(id))
    : '—';
}

export function buildConnectionRows(
  dtos: Array<DataLinkWithUsecasesDto | ControlLinkWithUsecasesDto>,
  modules: SpfModuleDto[],
  selfModuleSystemId: string,
): ConnectionRow[] {
  const moduleBySystemId = new Map(modules.map((m) => [String(m.systemId), m]));
  return dtos.map(({link, usecases}, index) => {
    const otherModuleSystemId = resolveOtherModuleSystemId(
      link,
      selfModuleSystemId,
    );
    const otherPortSystemId = resolveOtherPortSystemId(
      link,
      selfModuleSystemId,
    );
    const otherModule = moduleBySystemId.get(otherModuleSystemId);
    return {
      isInterUsecase: link.isInterUsecase,
      moduleName: otherModule
        ? otherModule.alias || otherModule.name
        : otherModuleSystemId,
      moduleNaturalId: otherModule
        ? (ConvertNumberToHexString(otherModule.naturalId) ??
          String(otherModule.naturalId))
        : formatFallbackId(otherModuleSystemId),
      otherModuleSystemId,
      otherPortId: findOtherPortId(otherModule, otherPortSystemId),
      subgraphSystemId: otherModule?.subgraphSystemId ?? '',
      systemId: `${String(link.systemId)}-${index}`,
      usecases: dedupeUsecasesBySystemId(usecases),
    };
  });
}
