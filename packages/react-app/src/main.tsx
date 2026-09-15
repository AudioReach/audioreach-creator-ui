/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createRoot} from 'react-dom/client';

import {ensureRegistered} from '~shared/api';

import './index.css';

async function bootstrap(): Promise<void> {
  await ensureRegistered();

  const [{ThemeProvider}, {EditorShell}] = await Promise.all([
    import('~shared/providers/theme-provider'),
    import('~widgets/editor-shell'),
  ]);

  const App = () => {
    return (
      <ThemeProvider>
        <EditorShell />
      </ThemeProvider>
    );
  };

  createRoot(document.getElementById('root')!).render(<App />);
}

void bootstrap();
