/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Key as SubsystemKey} from '~shared/types/key-configurator-config.types';

export type {SubsystemKey};

// Sample data based on the reference HTML - id as integers
export const AVAILABLE_KEYS: SubsystemKey[] = [
  {id: 2701131776, name: 'StreamRx'}, // 0xA1000000
  {id: 2969567232, name: 'StreamTx'}, // 0xB1000000
  {id: 2734686208, name: 'DeviceTx'}, // 0xA3000000
  {id: 2717908992, name: 'DeviceRx'}, // 0xA2000000
  {id: 3003121664, name: 'VSID'}, // 0xB3000000
  {id: 3036676096, name: 'BtFormat'}, // 0xB5000000
  {id: 2868903936, name: 'Instance'}, // 0xAB000000
  {id: 3019898880, name: 'BtProfile'}, // 0xB4000000
];

// Sample configured keys data
export const SAMPLE_CONFIGURED_KEYS: SubsystemKey[] = [
  {id: 2701131776, name: 'StreamRx'},
  {id: 3003121664, name: 'VSID'},
  {id: 2868903936, name: 'Instance'},
];
