/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo} from "react"

import {logger} from "~shared/lib/logger"
import type DeviceInfo from "~shared/types/device-info.types"

interface UseDeviceManagerOptions {
  /** Callback when a device is opened */
  onDeviceOpened?: (device: DeviceInfo) => void
  /** Search term for filtering devices */
  searchTerm?: string
}

interface DeviceManagerHook {
  /** Filtered list of devices based on search term */
  filteredDevices: DeviceInfo[]
  /** Opens a device project */
  openDevice: (device: DeviceInfo) => void
}

// TODO: This device list should come from the backend
// Remove this hardcoded list once we get to connected mode tasks
const DEVICE_LIST: DeviceInfo[] = [
  {
    description: "HS-USB Diagnostic 90DB (COM10)",
    id: "0",
    name: "Device 1",
  },
  {
    description: "127.0.0.1:5558",
    id: "1",
    name: "RaspberryPi 4",
  },
  {
    description: "127.0.0.1:5558",
    id: "2",
    name: "Device 2 TCPIP",
  },
]

/**
 * Hook for managing device operations
 * Handles device list filtering and device opening
 */
export function useDeviceManager({
  onDeviceOpened,
  searchTerm = "",
}: UseDeviceManagerOptions): DeviceManagerHook {
  const filteredDevices = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === "") {
      return DEVICE_LIST
    }

    return DEVICE_LIST.filter((device: DeviceInfo) => {
      return device.name.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [searchTerm])

  const openDevice = (device: DeviceInfo) => {
    logger.verbose(`Selected a device: ${device.name}`, {
      action: "open_device_project",
      component: "useDeviceManager",
    })
    onDeviceOpened?.(device)
  }

  return {
    filteredDevices,
    openDevice,
  }
}
