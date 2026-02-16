/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createRoot} from 'react-dom/client';

import {ThemeProvider} from '~shared/providers/theme-provider';
import {EditorShell} from '~widgets/editor-shell';

import './index.css';

const App = () => {
  // useEffect(() => {
  //   ensureRegistered().catch((error) => {
  //     logger.error(`Failed to register client: ${error}`)
  //   })
  // }, [])

  return (
    <ThemeProvider>
      <EditorShell />
    </ThemeProvider>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
