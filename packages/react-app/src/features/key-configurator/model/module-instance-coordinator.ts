/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {getModuleInstanceTuningConfig} from '~entities/key-configurator/api/module-instance-config-api';
import type {ModuleInstanceTuningConfigDto} from '~entities/key-configurator/model/module-instance-config.dto';
import {getSpfModuleDefinition} from '~entities/module-definitions/api/module-definition-api';
import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions/model/module-definition.dto';
import {logger} from '~shared/lib/logger';

import {
  transformModuleDefinitionToCKVParameters,
  transformModuleDefinitionToTKVParameters,
  transformTuningConfigToConfiguredKeys,
  transformTuningConfigToConfiguredTKVs,
} from '../module-configurator-view/ui/';

import {useCalibrationKeysStore} from './calibration-keys-store';
import {useModuleTagKeysStore} from './module-tag-keys-store';

/**
 * Coordinator for module instance data that fetches both CKV and TKV data in a single API call
 * and distributes the data to the respective stores.
 *
 * Note: This coordinator does not maintain its own cache. The stores (CKV and TKV) are the
 * source of truth for data. The coordinator only fetches from backend when stores don't have data.
 */
class ModuleInstanceCoordinator {
  /**
   * Fetches module instance tuning configuration and distributes to both CKV and TKV stores.
   * Uses Hybrid Strategy: Checks stores first (source of truth), only fetches from backend if needed.
   * @param projectId - Project ID
   * @param moduleId - Module ID
   * @param instanceId - Instance ID
   * @param moduleInstanceSystemId - System ID for the module instance
   */
  async fetchAndDistributeModuleInstanceData(
    projectId: string,
    moduleId: number,
    instanceId: number,
    moduleInstanceSystemId: string,
  ): Promise<{error?: string; success: boolean}> {
    // Check if stores already have data
    const ckvStore = useCalibrationKeysStore.getState();
    const tkvStore = useModuleTagKeysStore.getState();

    const ckvHasData = ckvStore.configuredKeyValuesMap[moduleId]?.some(
      (inst) => inst.instanceId === instanceId,
    );
    const tkvHasData = tkvStore.configuredModuleTags[moduleId]?.some(
      (inst) => inst.instanceId === instanceId,
    );

    // Also check if parameters exist for this module
    const ckvHasParameters = !!ckvStore.moduleParameters[moduleId];
    const tkvHasParameters = !!tkvStore.moduleParameters[moduleId];

    if (ckvHasData && tkvHasData && ckvHasParameters && tkvHasParameters) {
      logger.info(
        `Using existing store data for module ${moduleId}, instance ${instanceId}`,
        {
          action: 'fetch_module_instance_data',
          component: 'ModuleInstanceCoordinator',
          projectId,
        },
      );
      return {success: true};
    }

    // Fetch from backend (stores don't have complete data)
    try {
      logger.info(
        `Fetching from backend for module ${moduleId}, instance ${instanceId}`,
        {
          action: 'fetch_module_instance_data',
          component: 'ModuleInstanceCoordinator',
          projectId,
        },
      );

      // Fetch module definition
      const defResult = await getSpfModuleDefinition(
        projectId,
        moduleInstanceSystemId,
      );

      if (!defResult.success || !defResult.data) {
        const errorMessage =
          defResult.errors?.[0] ||
          defResult.message ||
          'Failed to fetch module definition';
        logger.error(
          `Failed to fetch module definition for module ${moduleId}, systemId ${moduleInstanceSystemId}: ${errorMessage}`,
          {
            action: 'fetch_module_definition',
            component: 'ModuleInstanceCoordinator',
            error: errorMessage,
            projectId,
          },
        );
        return {error: errorMessage, success: false};
      }

      // Fetch tuning configuration
      const result = await getModuleInstanceTuningConfig(
        projectId,
        moduleInstanceSystemId,
      );

      if (!result.success || !result.data) {
        const errorMessage =
          result.errors?.[0] ||
          result.message ||
          'Failed to fetch module instance data';
        logger.error(
          `Failed to fetch module instance data for module ${moduleId}, instance ${instanceId}, systemId ${moduleInstanceSystemId}: ${errorMessage}`,
          {
            action: 'fetch_module_instance_data',
            component: 'ModuleInstanceCoordinator',
            error: errorMessage,
            projectId,
          },
        );
        return {error: errorMessage, success: false};
      }

      // Distribute data to both stores
      this.distributeDataToStores(
        moduleId,
        instanceId,
        result.data,
        defResult.data,
      );
      return {success: true};
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        `Error fetching module instance data for module ${moduleId}, instance ${instanceId}: ${errorMessage}`,
        {
          action: 'fetch_module_instance_data',
          component: 'ModuleInstanceCoordinator',
          error: errorMessage,
          projectId,
        },
      );
      return {error: errorMessage, success: false};
    }
  }

  /**
   * Distributes the fetched data to CKV and TKV stores
   */
  private distributeDataToStores(
    moduleId: number,
    instanceId: number,
    data: ModuleInstanceTuningConfigDto,
    moduleDefinition: SpfModuleDefinitionResponseDto,
  ): void {
    // Initialize stores if not already initialized
    const ckvStore = useCalibrationKeysStore.getState();
    const tkvStore = useModuleTagKeysStore.getState();

    // Transform and set CKV data
    const configuredKeys = transformTuningConfigToConfiguredKeys(data);

    // Transform parameters from module definition if available
    const ckvParameters =
      transformModuleDefinitionToCKVParameters(moduleDefinition);

    ckvStore.setDataFromCoordinator(
      moduleId,
      instanceId,
      configuredKeys,
      ckvParameters,
    );

    // Transform and set TKV data
    const transformedTags = transformTuningConfigToConfiguredTKVs(data);

    // Transform parameters from module definition if available
    const tkvParameters =
      transformModuleDefinitionToTKVParameters(moduleDefinition);

    tkvStore.setDataFromCoordinator(
      moduleId,
      instanceId,
      transformedTags,
      tkvParameters,
    );

    logger.info(
      `Data distributed to stores for module ${moduleId}, instance ${instanceId}${moduleDefinition ? ' with parameters' : ''}`,
      {
        action: 'distribute_to_stores',
        component: 'ModuleInstanceCoordinator',
      },
    );
  }
}

// Export singleton instance
export const moduleInstanceCoordinator = new ModuleInstanceCoordinator();
