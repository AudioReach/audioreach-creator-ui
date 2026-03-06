/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Key as SubsystemKey} from '~shared/types/key-configurator-config.types';



// Sample data based on the reference HTML - id as integers
export const AVAILABLE_KEYS: SubsystemKey[] = [
  {id: 2_701_131_776, name: 'StreamRx'}, // 0xA1000000
  {id: 2_969_567_232, name: 'StreamTx'}, // 0xB1000000
  {id: 2_734_686_208, name: 'DeviceTx'}, // 0xA3000000
  {id: 2_717_908_992, name: 'DeviceRx'}, // 0xA2000000
  {id: 3_003_121_664, name: 'VSID'}, // 0xB3000000
  {id: 3_036_676_096, name: 'BtFormat'}, // 0xB5000000
  {id: 2_868_903_936, name: 'Instance'}, // 0xAB000000
  {id: 3_019_898_880, name: 'BtProfile'}, // 0xB4000000
];

// Sample configured keys data
export const SAMPLE_CONFIGURED_KEYS: SubsystemKey[] = [
  {id: 2_701_131_776, name: 'StreamRx'},
  {id: 3_003_121_664, name: 'VSID'},
  {id: 2_868_903_936, name: 'Instance'},
];

export {type Key as SubsystemKey} from '~shared/types/key-configurator-config.types';