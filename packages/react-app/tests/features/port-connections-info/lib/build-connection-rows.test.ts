/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseDto} from '~entities/usecases';
import type {
  ControlLinkWithUsecasesDto,
  DataLinkWithUsecasesDto,
  DataPortDto,
  SpfModuleDto,
} from '~entities/usecases/model/usecase-component.dto';
import {buildConnectionRows} from '~features/port-connections-info/lib/build-connection-rows';

function makeUsecase(overrides: Partial<UsecaseDto> = {}): UsecaseDto {
  return {
    keyValuePairs: [],
    systemId: 'uc-1',
    usecaseType: 'Regular',
    ...overrides,
  };
}

function makeDataPort(overrides: Partial<DataPortDto> = {}): DataPortDto {
  return {
    name: 'in1',
    naturalId: 20,
    portIoType: 'Input',
    portType: 'Static',
    relatedEndPointLinks: [],
    systemId: 'sys-port-20',
    totalLinksAtPort: 1,
    ...overrides,
  };
}

function makeModule(overrides: Partial<SpfModuleDto> = {}): SpfModuleDto {
  return {
    alias: '',
    containerSystemId: '10',
    controlPorts: [],
    dataPorts: [],
    maxControlPortsSupported: 0,
    maxInputPortsSupported: 0,
    maxOutputPortsSupported: 0,
    moduleDefinitionSystemId: 'definition-200',
    name: 'AudioDecoder',
    naturalId: 200,
    relatedEndPointLinks: [],
    subgraphSystemId: 'sys-sg-1',
    systemId: 'sys-mod-2',
    ...overrides,
  };
}

function makeDataLink(
  overrides: Partial<DataLinkWithUsecasesDto['link']> = {},
  usecases: UsecaseDto[] = [],
): DataLinkWithUsecasesDto {
  return {
    link: {
      destinationPortSystemId: 'sys-port-20',
      destinationSystemId: 'sys-mod-2',
      linkType: 'NORMAL',
      relatedEndPointLinks: [],
      sourcePortSystemId: 'sys-port-10',
      sourceSystemId: 'sys-mod-1',
      systemId: 'link-1',
      ...overrides,
    },
    usecases,
  };
}

function makeControlLink(
  overrides: Partial<ControlLinkWithUsecasesDto['link']> = {},
  usecases: UsecaseDto[] = [],
): ControlLinkWithUsecasesDto {
  return makeDataLink(overrides, usecases);
}

describe('buildConnectionRows', () => {
  describe('self/other resolution', () => {
    it('resolves the other end from destinationSystemId/destinationPortSystemId when sourceSystemId is self', () => {
      const dto = makeDataLink({
        destinationPortSystemId: 'sys-port-20',
        destinationSystemId: 'sys-mod-2',
        sourcePortSystemId: 'sys-port-10',
        sourceSystemId: 'sys-mod-1',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.otherModuleSystemId).toBe('sys-mod-2');
    });

    it('resolves the other end from sourceSystemId/sourcePortSystemId when destinationSystemId is self', () => {
      const dto = makeDataLink({
        destinationPortSystemId: 'sys-port-10',
        destinationSystemId: 'sys-mod-1',
        sourcePortSystemId: 'sys-port-20',
        sourceSystemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.otherModuleSystemId).toBe('sys-mod-2');
    });

    it('resolves identically for a ControlLinkWithUsecasesDto', () => {
      const dto = makeControlLink({
        destinationPortSystemId: 'sys-port-20',
        destinationSystemId: 'sys-mod-2',
        sourcePortSystemId: 'sys-port-10',
        sourceSystemId: 'sys-mod-1',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.otherModuleSystemId).toBe('sys-mod-2');
    });

    it('matches a raw-number sourceSystemId against a numeric-looking self systemId', () => {
      const dto = makeDataLink({
        destinationSystemId: 'sys-mod-2',
        sourceSystemId: 21 as unknown as string,
      });
      const [row] = buildConnectionRows([dto], [], '21');
      expect(row.otherModuleSystemId).toBe('sys-mod-2');
    });
  });

  describe('other-end module present in the batched lookup', () => {
    it('resolves moduleId/moduleName from the matched module, moduleId hex-converted', () => {
      const dto = makeDataLink({sourceSystemId: 'sys-mod-1'});
      const module = makeModule({
        name: 'AudioDecoder',
        naturalId: 100,
        systemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [module], 'sys-mod-1');
      expect(row.moduleNaturalId).toBe('0x00000064');
      expect(row.moduleName).toBe('AudioDecoder');
    });

    it('resolves otherPortId by matching the other port systemId against dataPorts, as minimal-width hex', () => {
      const dto = makeDataLink({
        destinationPortSystemId: 'sys-port-20',
        sourceSystemId: 'sys-mod-1',
      });
      const module = makeModule({
        dataPorts: [makeDataPort({naturalId: 20, systemId: 'sys-port-20'})],
        systemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [module], 'sys-mod-1');
      expect(row.otherPortId).toBe('0x14');
    });

    it('resolves otherPortId by matching against controlPorts when not found in dataPorts', () => {
      const dto = makeDataLink({
        destinationPortSystemId: 'sys-ctrl-5',
        sourceSystemId: 'sys-mod-1',
      });
      const module = makeModule({
        controlPorts: [
          {
            changeInfo: {changeType: 'CREATE'},
            controlPortName: 'ctrl-out',
            intents: [],
            name: 'ctrl-out',
            naturalId: 5,
            portType: 'Static',
            relatedEndPointLinks: [],
            systemId: 'sys-ctrl-5',
            totalLinksAtPort: 1,
          },
        ],
        systemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [module], 'sys-mod-1');
      expect(row.otherPortId).toBe('0x5');
    });

    it('resolves otherPortId as unpadded hex for a small port id (0x1, not 0x00000001)', () => {
      const dto = makeDataLink({
        destinationPortSystemId: 'sys-port-1',
        sourceSystemId: 'sys-mod-1',
      });
      const module = makeModule({
        dataPorts: [makeDataPort({naturalId: 1, systemId: 'sys-port-1'})],
        systemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [module], 'sys-mod-1');
      expect(row.otherPortId).toBe('0x1');
    });

    it('resolves subgraphSystemId from the matched module', () => {
      const dto = makeDataLink({sourceSystemId: 'sys-mod-1'});
      const module = makeModule({
        subgraphSystemId: 'sys-sg-7',
        systemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [module], 'sys-mod-1');
      expect(row.subgraphSystemId).toBe('sys-sg-7');
    });
  });

  describe('other-end module absent (lookup miss)', () => {
    it('falls back to the raw other-end systemId for moduleId/moduleName, and "—" for otherPortId', () => {
      const dto = makeDataLink({
        destinationPortSystemId: 'sys-port-20',
        destinationSystemId: 'sys-mod-2',
        sourceSystemId: 'sys-mod-1',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.moduleNaturalId).toBe('sys-mod-2');
      expect(row.moduleName).toBe('sys-mod-2');
      expect(row.otherPortId).toBe('—');
    });

    it('hex-converts a fallback moduleId that happens to be numeric', () => {
      const dto = makeDataLink({
        destinationPortSystemId: '5',
        destinationSystemId: '21',
        sourceSystemId: 'sys-mod-1',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.moduleNaturalId).toBe('0x00000015');
      expect(row.otherPortId).toBe('—');
      expect(row.moduleName).toBe('21');
    });

    it('leaves subgraphSystemId empty', () => {
      const dto = makeDataLink({sourceSystemId: 'sys-mod-1'});
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.subgraphSystemId).toBe('');
    });

    it('does not crash when the backend sends a raw number instead of a numeric string', () => {
      const dto = makeDataLink({
        destinationPortSystemId: 5 as unknown as string,
        destinationSystemId: 21 as unknown as string,
        sourceSystemId: 'sys-mod-1',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.moduleNaturalId).toBe('0x00000015');
      expect(row.otherPortId).toBe('—');
      expect(row.otherModuleSystemId).toBe('21');
    });
  });

  describe('other-end module present but the specific port is missing from it', () => {
    it('displays "—" for otherPortId when the port systemId has no match in dataPorts/controlPorts', () => {
      const dto = makeDataLink({
        destinationPortSystemId: 'sys-port-missing',
        destinationSystemId: 'sys-mod-2',
        sourceSystemId: 'sys-mod-1',
      });
      const module = makeModule({
        dataPorts: [makeDataPort({naturalId: 1, systemId: 'sys-port-other'})],
        systemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [module], 'sys-mod-1');
      expect(row.otherPortId).toBe('—');
    });
  });

  it('carries linkKind, isInterUsecase, and usecases through unchanged', () => {
    const usecases = [makeUsecase({systemId: 'uc-42'})];
    const dto = makeDataLink(
      {
        linkKind: 'SUBSYSTEM_MODULE',
        linkType: 'INTER_USECASE',
        sourceSystemId: 'sys-mod-1',
        systemId: 'link-99',
      },
      usecases,
    );
    const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
    expect(row.isInterUsecase).toBe(true);
    expect(row.usecases).toBe(usecases);
  });

  it('maps one row per input dto, in order', () => {
    const dtoA = makeDataLink({
      sourceSystemId: 'sys-mod-1',
      systemId: 'link-a',
    });
    const dtoB = makeDataLink({
      sourceSystemId: 'sys-mod-1',
      systemId: 'link-b',
    });
    const rows = buildConnectionRows([dtoA, dtoB], [], 'sys-mod-1');
    expect(rows).toHaveLength(2);
  });

  it('gives every row a unique systemId even when link.systemId repeats', () => {
    // Real backend responses have been observed reusing the same
    // link.systemId across genuinely distinct connections — the row key
    // must not collapse them.
    const dtoA = makeDataLink({
      destinationSystemId: 'sys-mod-1',
      sourceSystemId: 'mod-B',
      systemId: 'link-1',
    });
    const dtoB = makeDataLink({
      destinationSystemId: 'sys-mod-1',
      sourceSystemId: 'mod-C',
      systemId: 'link-1',
    });
    const rows = buildConnectionRows([dtoA, dtoB], [], 'sys-mod-1');
    expect(rows).toHaveLength(2);
    expect(rows[0].systemId).not.toBe(rows[1].systemId);
  });

  it('dedupes usecases within a single link that repeat the same systemId', () => {
    // Real backend responses have been observed sending the same usecase
    // (same systemId) twice within one link's usecases array.
    const usecaseA = makeUsecase({
      systemId: '7',
      usecaseAliasName: 'AAH_LocalSink_Stereo',
    });
    const usecaseADuplicate = makeUsecase({
      systemId: '7',
      usecaseAliasName: 'AAH_LocalSink_Stereo',
    });
    const dto = makeDataLink({sourceSystemId: 'sys-mod-1'}, [
      usecaseA,
      usecaseADuplicate,
    ]);
    const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
    expect(row.usecases).toHaveLength(1);
    expect(row.usecases[0].systemId).toBe('7');
  });

  it('keeps distinct usecases within a single link intact', () => {
    const usecaseA = makeUsecase({systemId: '7'});
    const usecaseB = makeUsecase({systemId: '8'});
    const dto = makeDataLink({sourceSystemId: 'sys-mod-1'}, [
      usecaseA,
      usecaseB,
    ]);
    const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
    expect(row.usecases).toHaveLength(2);
  });
});
