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
    changeInfo: {changeType: 'CREATE'},
    keyValueCollection: [],
    systemId: 'uc-1',
    usecaseType: 'Regular',
    ...overrides,
  };
}

function makeDataPort(overrides: Partial<DataPortDto> = {}): DataPortDto {
  return {
    changeInfo: {changeType: 'CREATE'},
    id: 20,
    name: 'in1',
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
    changeInfo: {changeType: 'CREATE'},
    containerId: 10,
    controlPorts: [],
    dataPorts: [],
    heapId: 0,
    id: 100,
    maxControlPortsSupported: 0,
    maxInputPortsSupported: 0,
    maxOutputPortsSupported: 0,
    moduleId: 200,
    name: 'AudioDecoder',
    relatedEndPointLinks: [],
    subgraphId: 'sys-sg-1',
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
      connectionType: 'MODULE_MODULE',
      destinationId: 'sys-mod-2',
      destinationPortId: 'sys-port-20',
      isDangling: false,
      relatedEndPointLinks: [],
      sourceId: 'sys-mod-1',
      sourcePortId: 'sys-port-10',
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
    it('resolves the other end from destinationId/destinationPortId when sourceId is self', () => {
      const dto = makeDataLink({
        destinationId: 'sys-mod-2',
        destinationPortId: 'sys-port-20',
        sourceId: 'sys-mod-1',
        sourcePortId: 'sys-port-10',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.otherModuleSystemId).toBe('sys-mod-2');
    });

    it('resolves the other end from sourceId/sourcePortId when destinationId is self', () => {
      const dto = makeDataLink({
        destinationId: 'sys-mod-1',
        destinationPortId: 'sys-port-10',
        sourceId: 'sys-mod-2',
        sourcePortId: 'sys-port-20',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.otherModuleSystemId).toBe('sys-mod-2');
    });

    it('resolves identically for a ControlLinkWithUsecasesDto', () => {
      const dto = makeControlLink({
        destinationId: 'sys-mod-2',
        destinationPortId: 'sys-port-20',
        sourceId: 'sys-mod-1',
        sourcePortId: 'sys-port-10',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.otherModuleSystemId).toBe('sys-mod-2');
    });

    it('matches a raw-number sourceId against a numeric-looking self systemId', () => {
      const dto = makeDataLink({
        destinationId: 'sys-mod-2',
        sourceId: 21 as unknown as string,
      });
      const [row] = buildConnectionRows([dto], [], '21');
      expect(row.otherModuleSystemId).toBe('sys-mod-2');
    });
  });

  describe('other-end module present in the batched lookup', () => {
    it('resolves moduleId/moduleName from the matched module, moduleId hex-converted', () => {
      const dto = makeDataLink({sourceId: 'sys-mod-1'});
      const module = makeModule({
        id: 100,
        name: 'AudioDecoder',
        systemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [module], 'sys-mod-1');
      expect(row.moduleId).toBe('0x00000064');
      expect(row.moduleName).toBe('AudioDecoder');
    });

    it('resolves otherPortId by matching the other port systemId against dataPorts, as minimal-width hex', () => {
      const dto = makeDataLink({
        destinationPortId: 'sys-port-20',
        sourceId: 'sys-mod-1',
      });
      const module = makeModule({
        dataPorts: [makeDataPort({id: 20, systemId: 'sys-port-20'})],
        systemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [module], 'sys-mod-1');
      expect(row.otherPortId).toBe('0x14');
    });

    it('resolves otherPortId by matching against controlPorts when not found in dataPorts', () => {
      const dto = makeDataLink({
        destinationPortId: 'sys-ctrl-5',
        sourceId: 'sys-mod-1',
      });
      const module = makeModule({
        controlPorts: [
          {
            changeInfo: {changeType: 'CREATE'},
            controlPortName: 'ctrl-out',
            id: 5,
            intents: [],
            name: 'ctrl-out',
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
        destinationPortId: 'sys-port-1',
        sourceId: 'sys-mod-1',
      });
      const module = makeModule({
        dataPorts: [makeDataPort({id: 1, systemId: 'sys-port-1'})],
        systemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [module], 'sys-mod-1');
      expect(row.otherPortId).toBe('0x1');
    });

    it('resolves subgraphSystemId from the matched module', () => {
      const dto = makeDataLink({sourceId: 'sys-mod-1'});
      const module = makeModule({
        subgraphId: 'sys-sg-7',
        systemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [module], 'sys-mod-1');
      expect(row.subgraphSystemId).toBe('sys-sg-7');
    });
  });

  describe('other-end module absent (lookup miss)', () => {
    it('falls back to the raw other-end systemId for moduleId/moduleName, and "—" for otherPortId', () => {
      const dto = makeDataLink({
        destinationId: 'sys-mod-2',
        destinationPortId: 'sys-port-20',
        sourceId: 'sys-mod-1',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.moduleId).toBe('sys-mod-2');
      expect(row.moduleName).toBe('sys-mod-2');
      expect(row.otherPortId).toBe('—');
    });

    it('hex-converts a fallback moduleId that happens to be numeric', () => {
      const dto = makeDataLink({
        destinationId: '21',
        destinationPortId: '5',
        sourceId: 'sys-mod-1',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.moduleId).toBe('0x00000015');
      expect(row.otherPortId).toBe('—');
      expect(row.moduleName).toBe('21');
    });

    it('leaves subgraphSystemId empty', () => {
      const dto = makeDataLink({sourceId: 'sys-mod-1'});
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.subgraphSystemId).toBe('');
    });

    it('does not crash when the backend sends a raw number instead of a numeric string', () => {
      const dto = makeDataLink({
        destinationId: 21 as unknown as string,
        destinationPortId: 5 as unknown as string,
        sourceId: 'sys-mod-1',
      });
      const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
      expect(row.moduleId).toBe('0x00000015');
      expect(row.otherPortId).toBe('—');
      expect(row.otherModuleSystemId).toBe('21');
    });
  });

  describe('other-end module present but the specific port is missing from it', () => {
    it('displays "—" for otherPortId when the port systemId has no match in dataPorts/controlPorts', () => {
      const dto = makeDataLink({
        destinationId: 'sys-mod-2',
        destinationPortId: 'sys-port-missing',
        sourceId: 'sys-mod-1',
      });
      const module = makeModule({
        dataPorts: [makeDataPort({id: 1, systemId: 'sys-port-other'})],
        systemId: 'sys-mod-2',
      });
      const [row] = buildConnectionRows([dto], [module], 'sys-mod-1');
      expect(row.otherPortId).toBe('—');
    });
  });

  it('carries connectionType, isDangling, and usecases through unchanged', () => {
    const usecases = [makeUsecase({systemId: 'uc-42'})];
    const dto = makeDataLink(
      {
        connectionType: 'SUBSYSTEM_MODULE',
        isDangling: true,
        sourceId: 'sys-mod-1',
        systemId: 'link-99',
      },
      usecases,
    );
    const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
    expect(row.connectionType).toBe('SUBSYSTEM_MODULE');
    expect(row.isDangling).toBe(true);
    expect(row.usecases).toBe(usecases);
  });

  it('maps one row per input dto, in order', () => {
    const dtoA = makeDataLink({sourceId: 'sys-mod-1', systemId: 'link-a'});
    const dtoB = makeDataLink({sourceId: 'sys-mod-1', systemId: 'link-b'});
    const rows = buildConnectionRows([dtoA, dtoB], [], 'sys-mod-1');
    expect(rows).toHaveLength(2);
  });

  it('gives every row a unique systemId even when link.systemId repeats', () => {
    // Real backend responses have been observed reusing the same
    // link.systemId across genuinely distinct connections — the row key
    // must not collapse them.
    const dtoA = makeDataLink({
      destinationId: 'sys-mod-1',
      sourceId: 'mod-B',
      systemId: 'link-1',
    });
    const dtoB = makeDataLink({
      destinationId: 'sys-mod-1',
      sourceId: 'mod-C',
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
    const dto = makeDataLink({sourceId: 'sys-mod-1'}, [
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
    const dto = makeDataLink({sourceId: 'sys-mod-1'}, [usecaseA, usecaseB]);
    const [row] = buildConnectionRows([dto], [], 'sys-mod-1');
    expect(row.usecases).toHaveLength(2);
  });
});
