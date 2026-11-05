/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import {Button} from '@qualcomm-ui/react/button';
import {Dialog} from '@qualcomm-ui/react/dialog';
import {TextArea} from '@qualcomm-ui/react/text-area';
import {TextInput} from '@qualcomm-ui/react/text-input';

import type {ProjectInfo, UpdateProjectRequestDto} from '~entities/project';

interface EditProjectDialogProps {
  onClose: () => void;
  onSave: (
    project: ProjectInfo,
    details: UpdateProjectRequestDto,
  ) => Promise<{message?: string; success: boolean}>;
  project: ProjectInfo | undefined;
}

/** Dialog for editing a project's name and description. */
export function EditProjectDialog({
  onClose,
  onSave,
  project,
}: EditProjectDialogProps) {
  return (
    <Dialog.Root
        closeOnInteractOutside={false}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={project !== undefined}
      placement="center"
    >
      <Dialog.FloatingPortal>
        {/* Keyed so the form state resets for every project that is edited */}
        {project && (
          <EditProjectForm
            key={project.id}
            onCancel={onClose}
            onSave={onSave}
            project={project}
          />
        )}
      </Dialog.FloatingPortal>
    </Dialog.Root>
  );
}

function EditProjectForm({
  onCancel,
  onSave,
  project,
}: {
  onCancel: () => void;
  onSave: EditProjectDialogProps['onSave'];
  project: ProjectInfo;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  const trimmedName = name.trim();
  const isUnchanged =
    trimmedName === project.name && description === project.description;

  async function handleSave() {
    setIsSaving(true);
    setError(undefined);
    const result = await onSave(project, {
      description,
      name: trimmedName,
    });
    setIsSaving(false);
    if (!result.success) {
      setError(result.message ?? 'Failed to update project');
    }
  }

  return (
    <>
      <Dialog.Body>
        <Dialog.Heading>Edit project</Dialog.Heading>
        <div className="mt-3 flex flex-col gap-3">
          <TextInput
            errorText={error}
            label="Project name"
            onValueChange={setName}
            value={name}
          />
          <TextArea
            label="Description"
            onValueChange={setDescription}
            value={description}
          />
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <Button
          disabled={isSaving}
          emphasis="neutral"
          onClick={onCancel}
          size="sm"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={isSaving || trimmedName === '' || isUnchanged}
          emphasis="primary"
          onClick={() => void handleSave()}
          size="sm"
          variant="fill"
        >
          Save
        </Button>
      </Dialog.Footer>
    </>
  );
}
