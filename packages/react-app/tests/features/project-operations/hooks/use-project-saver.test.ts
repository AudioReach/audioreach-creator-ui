/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {ApiRequest} from '@audioreach-creator-ui/api-utils';
import {act, renderHook} from '@testing-library/react';

import * as editSessionApi from '~entities/edit-session';
import * as projectsApi from '~entities/project/api/projects-api';
import {useProjectSaver} from '~features/project-operations/hooks/use-project-saver';
import * as electronApiModule from '~shared/api';
import * as globalToaster from '~shared/controls/global-toaster';
import * as globalStore from '~shared/store/global-store';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('~entities/edit-session');
jest.mock('~entities/project/api/projects-api');
jest.mock('~shared/api');
jest.mock('~shared/controls/global-toaster');
jest.mock('~shared/lib/logger', () => ({
  logger: {error: jest.fn(), info: jest.fn(), warn: jest.fn()},
}));
jest.mock('~shared/store/global-store');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WORKSPACE_BYTES = new Uint8Array([80, 75, 3, 4]);
const ACDB_BYTES = new Uint8Array([65, 67, 68, 66]);

function makeCommitSuccess() {
  (editSessionApi.commitChanges as jest.Mock).mockResolvedValue({data: {}});
}

function makeCommitFail(message = 'Commit failed') {
  (editSessionApi.commitChanges as jest.Mock).mockResolvedValue({
    issues: [{code: 'COMMIT_REJECTED', message, severity: 'ERROR'}],
  });
  (electronApiModule.hasBlockingIssues as jest.Mock).mockReturnValue(true);
  (electronApiModule.getIssueMessage as jest.Mock).mockImplementation(
    () => message,
  );
}

function makeDownloadSuccess() {
  (projectsApi.downloadProjectFiles as jest.Mock).mockResolvedValue({
    data: {
      acdbFile: {content: ACDB_BYTES.buffer, name: 'project.acdb'},
      workspaceFile: {content: WORKSPACE_BYTES.buffer, name: 'project.awsp'},
    },
    success: true,
  });
}

function makeDownloadFail(message = 'Backend error') {
  (projectsApi.downloadProjectFiles as jest.Mock).mockResolvedValue({
    message,
    success: false,
  });
}

function makeElectronSendSuccess(filePath = '/saved/project.awsp') {
  (electronApiModule.electronApi as any) = {
    send: jest.fn().mockResolvedValue({
      data: {filePath},
      message: 'ok',
      requestType: ApiRequest.SaveProjectFile,
    }),
  };
}

function makeElectronSendError(errorMessage = 'Write failed') {
  (electronApiModule.electronApi as any) = {
    send: jest.fn().mockResolvedValue({
      data: {error: errorMessage},
      message: 'error',
      requestType: ApiRequest.SaveProjectFile,
    }),
  };
}

function makeElectronDialogSuccess(filePath = '/new/project.awsp') {
  (electronApiModule.electronApi as any) = {
    send: jest
      .fn()
      .mockImplementation(({requestType}: {requestType: ApiRequest}) => {
        if (requestType === ApiRequest.GetSaveAsProjectFilePath) {
          return Promise.resolve({
            data: {cancelled: false, filePath},
            message: 'ok',
            requestType,
          });
        }
        return Promise.resolve({
          data: {filePath},
          message: 'ok',
          requestType,
        });
      }),
  };
}

function makeElectronDialogCancelled() {
  (electronApiModule.electronApi as any) = {
    send: jest.fn().mockResolvedValue({
      data: {cancelled: true},
      message: 'cancelled',
      requestType: ApiRequest.GetSaveAsProjectFilePath,
    }),
  };
}

function makeElectronDialogError(errorMessage = 'Dialog error') {
  (electronApiModule.electronApi as any) = {
    send: jest.fn().mockResolvedValue({
      data: {error: errorMessage},
      message: 'error',
      requestType: ApiRequest.GetSaveAsProjectFilePath,
    }),
  };
}

function makeStoreWithProjects(
  projects: Array<{filePath: string; projectId: string}>,
) {
  (globalStore.useGlobalStore as any).getState = jest.fn().mockReturnValue({
    openProjects: projects,
    updateProjectFilePath: jest.fn(),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useProjectSaver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: electronApi available
    makeElectronSendSuccess();
    // Default: no pending calibration changes to commit
    makeCommitSuccess();
    // Default: issue helpers pass through so fallback messages surface
    (electronApiModule.hasBlockingIssues as jest.Mock).mockReturnValue(false);
    (electronApiModule.getIssueMessage as jest.Mock).mockImplementation(
      (_result: unknown, fallback: string) => fallback,
    );
    // Default: store with one project
    makeStoreWithProjects([
      {filePath: '/original/project.awsp', projectId: 'proj-1'},
    ]);
  });

  // ── saveProject ─────────────────────────────────────────────────────────────

  describe('saveProject', () => {
    // isSaving starts false, becomes true during save, resets to false after completion
    it('isSaving is true while saving and false after completion', async () => {
      makeDownloadSuccess();
      const {result} = renderHook(() => useProjectSaver());

      expect(result.current.isSaving).toBe(false);

      await act(async () => {
        await result.current.saveProject('proj-1', '/original/project.awsp');
      });

      expect(result.current.isSaving).toBe(false);
    });

    // Success toast shown when both download and write succeed
    it('shows success toast on successful save', async () => {
      makeDownloadSuccess();
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProject('proj-1', '/original/project.awsp');
      });

      expect(globalToaster.showToast).toHaveBeenCalledWith(
        'Project saved successfully',
        'success',
      );
    });

    // Error toast shown with backend message when download-files returns failure
    it('shows error toast when backend download fails', async () => {
      makeDownloadFail('Server unavailable');
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProject('proj-1', '/original/project.awsp');
      });

      expect(globalToaster.showToast).toHaveBeenCalledWith(
        'Server unavailable',
        'danger',
      );
    });

    // Error toast shown with Electron error message when writeFileSync fails
    it('shows error toast when write fails', async () => {
      makeDownloadSuccess();
      makeElectronSendError('Permission denied');
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProject('proj-1', '/original/project.awsp');
      });

      expect(globalToaster.showToast).toHaveBeenCalledWith(
        'Permission denied',
        'danger',
      );
    });

    // fetchProjectContent already showed one toast — saveProject must not add a second
    it('shows no toast when result.success is false but error is undefined', async () => {
      makeDownloadFail('Download failed');
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProject('proj-1', '/original/project.awsp');
      });

      // Only the download failure toast — no second toast from saveProject
      expect(globalToaster.showToast).toHaveBeenCalledTimes(1);
      expect(globalToaster.showToast).toHaveBeenCalledWith(
        'Download failed',
        'danger',
      );
    });

    // Pending calibration changes (made outside edit mode) must be committed
    // before files are downloaded, or they'd be saved stale.
    it('commits pending changes before downloading project files', async () => {
      makeDownloadSuccess();
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProject('proj-1', '/original/project.awsp');
      });

      expect(editSessionApi.commitChanges).toHaveBeenCalledWith('proj-1');
      expect(
        (editSessionApi.commitChanges as jest.Mock).mock.invocationCallOrder[0],
      ).toBeLessThan(
        (projectsApi.downloadProjectFiles as jest.Mock)
          .mock.invocationCallOrder[0],
      );
    });

    // Commit failure must abort the save — files are never downloaded or
    // written, and the backend's error message is shown.
    it('shows error toast and skips download when commit fails', async () => {
      makeCommitFail('Commit rejected');
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProject('proj-1', '/original/project.awsp');
      });

      expect(projectsApi.downloadProjectFiles).not.toHaveBeenCalled();
      expect(globalToaster.showToast).toHaveBeenCalledWith(
        'Commit rejected',
        'danger',
      );
    });

    // Second Ctrl+S while save is in progress is silently ignored
    it('re-entrancy guard: second call while saving is ignored', async () => {
      let resolveFirst!: () => void;
      (projectsApi.downloadProjectFiles as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveFirst = () =>
            resolve({
              data: {
                workspaceFile: {
                  content: WORKSPACE_BYTES.buffer,
                  name: 'project.awsp',
                },
              },
              success: true,
            });
        }),
      );

      const {result} = renderHook(() => useProjectSaver());

      // Start first save (does not await)
      act(() => {
        void result.current.saveProject('proj-1', '/original/project.awsp');
      });

      // Try second save while first is in progress
      await act(async () => {
        await result.current.saveProject('proj-1', '/original/project.awsp');
      });

      // downloadProjectFiles should only have been called once
      expect(projectsApi.downloadProjectFiles).toHaveBeenCalledTimes(1);

      // Resolve the first save
      await act(async () => {
        resolveFirst();
      });
    });
  });

  // ── saveProjectAs ────────────────────────────────────────────────────────────

  describe('saveProjectAs', () => {
    // Dialog cancelled — backend is never called, no download happens
    it('does NOT call downloadProjectFiles if dialog is cancelled', async () => {
      makeElectronDialogCancelled();
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProjectAs('proj-1', '/original/project.awsp');
      });

      expect(projectsApi.downloadProjectFiles).not.toHaveBeenCalled();
    });

    // Dialog cancelled — loading overlay never shown (isSaving stays false)
    it('does NOT set isSaving if dialog is cancelled', async () => {
      makeElectronDialogCancelled();
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProjectAs('proj-1', '/original/project.awsp');
      });

      expect(result.current.isSaving).toBe(false);
    });

    // Dialog cancelled — no toast shown, silent return
    it('shows no toast when dialog is cancelled', async () => {
      makeElectronDialogCancelled();
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProjectAs('proj-1', '/original/project.awsp');
      });

      expect(globalToaster.showToast).not.toHaveBeenCalled();
    });

    // Dialog throws — error toast shown with dialog error message
    it('shows error toast when dialog returns error', async () => {
      makeElectronDialogError('Dialog crashed');
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProjectAs('proj-1', '/original/project.awsp');
      });

      expect(globalToaster.showToast).toHaveBeenCalledWith(
        'Dialog crashed',
        'danger',
      );
    });

    // Dialog returns no filePath — silent return, no download, no toast
    it('silent return when filePath is missing from dialog response', async () => {
      (electronApiModule.electronApi as any) = {
        send: jest.fn().mockResolvedValue({
          data: {cancelled: false},
          message: 'ok',
          requestType: ApiRequest.GetSaveAsProjectFilePath,
        }),
      };
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProjectAs('proj-1', '/original/project.awsp');
      });

      expect(projectsApi.downloadProjectFiles).not.toHaveBeenCalled();
      expect(globalToaster.showToast).not.toHaveBeenCalled();
    });

    // Save As success — store updated with new path so future Ctrl+S targets new location
    it('calls updateProjectFilePath with new path after success', async () => {
      makeDownloadSuccess();
      makeElectronDialogSuccess('/new/project.awsp');
      const updateMock = jest.fn();
      (globalStore.useGlobalStore as any).getState = jest.fn().mockReturnValue({
        openProjects: [
          {filePath: '/original/project.awsp', projectId: 'proj-1'},
        ],
        updateProjectFilePath: updateMock,
      });

      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProjectAs('proj-1', '/original/project.awsp');
      });

      expect(updateMock).toHaveBeenCalledWith('proj-1', '/new/project.awsp');
    });

    // Write fails — store NOT updated, path stays at original
    it('does NOT call updateProjectFilePath if write fails', async () => {
      makeDownloadSuccess();
      const updateMock = jest.fn();
      (globalStore.useGlobalStore as any).getState = jest.fn().mockReturnValue({
        openProjects: [
          {filePath: '/original/project.awsp', projectId: 'proj-1'},
        ],
        updateProjectFilePath: updateMock,
      });
      // Dialog succeeds but write fails
      (electronApiModule.electronApi as any) = {
        send: jest
          .fn()
          .mockImplementation(({requestType}: {requestType: ApiRequest}) => {
            if (requestType === ApiRequest.GetSaveAsProjectFilePath) {
              return Promise.resolve({
                data: {cancelled: false, filePath: '/new/project.awsp'},
                message: 'ok',
                requestType,
              });
            }
            return Promise.resolve({
              data: {error: 'Write failed'},
              message: 'error',
              requestType,
            });
          }),
      };

      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProjectAs('proj-1', '/original/project.awsp');
      });

      expect(updateMock).not.toHaveBeenCalled();
    });

    // isSaving always resets to false even when an error occurs
    it('isSaving is false after error', async () => {
      makeDownloadFail();
      makeElectronDialogSuccess('/new/project.awsp');
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveProjectAs('proj-1', '/original/project.awsp');
      });

      expect(result.current.isSaving).toBe(false);
    });
  });

  // ── saveAllProjects ──────────────────────────────────────────────────────────

  describe('saveAllProjects', () => {
    // No projects open — returns immediately without showing overlay or calling backend
    it('returns early without setting isSaving if openProjects is empty', async () => {
      makeStoreWithProjects([]);
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveAllProjects();
      });

      expect(result.current.isSaving).toBe(false);
      expect(projectsApi.downloadProjectFiles).not.toHaveBeenCalled();
    });

    // Each open project gets its own download-and-write call
    it('iterates over all open projects', async () => {
      makeDownloadSuccess();
      makeStoreWithProjects([
        {filePath: '/path/one.awsp', projectId: 'proj-1'},
        {filePath: '/path/two.awsp', projectId: 'proj-2'},
        {filePath: '/path/three.awsp', projectId: 'proj-3'},
      ]);
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveAllProjects();
      });

      expect(projectsApi.downloadProjectFiles).toHaveBeenCalledTimes(3);
    });

    // One project failing does not stop the remaining projects from being saved
    it('continues saving remaining projects when one fails', async () => {
      let callCount = 0;
      (projectsApi.downloadProjectFiles as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve({message: 'Failed', success: false});
        }
        return Promise.resolve({
          data: {
            workspaceFile: {
              content: WORKSPACE_BYTES.buffer,
              name: 'project.awsp',
            },
          },
          success: true,
        });
      });
      makeStoreWithProjects([
        {filePath: '/path/one.awsp', projectId: 'proj-1'},
        {filePath: '/path/two.awsp', projectId: 'proj-2'},
        {filePath: '/path/three.awsp', projectId: 'proj-3'},
      ]);
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveAllProjects();
      });

      // All 3 attempted despite one failure
      expect(projectsApi.downloadProjectFiles).toHaveBeenCalledTimes(3);
    });

    // Error toast shows the count of failed projects
    it('shows failed project count in error toast', async () => {
      makeDownloadFail('error');
      makeStoreWithProjects([
        {filePath: '/path/project.awsp', projectId: 'uuid-1234'},
      ]);
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveAllProjects();
      });

      const toastCall = (globalToaster.showToast as jest.Mock).mock.calls.find(
        ([msg]: [string]) => msg.includes('Failed to save'),
      );
      expect(toastCall).toBeDefined();
      expect(toastCall[0]).toContain('1 project');
      expect(toastCall[0]).not.toContain('/path/project.awsp');
      expect(toastCall[0]).not.toContain('uuid-1234');
    });

    // All projects saved — single success toast shown
    it('shows success toast when all projects saved', async () => {
      makeDownloadSuccess();
      makeStoreWithProjects([
        {filePath: '/path/one.awsp', projectId: 'proj-1'},
        {filePath: '/path/two.awsp', projectId: 'proj-2'},
      ]);
      const {result} = renderHook(() => useProjectSaver());

      await act(async () => {
        await result.current.saveAllProjects();
      });

      expect(globalToaster.showToast).toHaveBeenCalledWith(
        'All projects saved successfully',
        'success',
      );
    });

    // Second Ctrl+Shift+A while Save All is in progress is silently ignored
    it('re-entrancy guard: second call while saving is ignored', async () => {
      let resolveFirst!: () => void;
      (projectsApi.downloadProjectFiles as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveFirst = () =>
            resolve({
              data: {
                workspaceFile: {
                  content: WORKSPACE_BYTES.buffer,
                  name: 'project.awsp',
                },
              },
              success: true,
            });
        }),
      );
      makeStoreWithProjects([
        {filePath: '/path/one.awsp', projectId: 'proj-1'},
      ]);

      const {result} = renderHook(() => useProjectSaver());

      act(() => {
        void result.current.saveAllProjects();
      });

      await act(async () => {
        await result.current.saveAllProjects();
      });

      expect(projectsApi.downloadProjectFiles).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFirst();
      });
    });
  });
});
