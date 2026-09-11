# Subgraph Key Configurator: Requirements

## 1. Context

The Subgraph Key Configurator allows users to view and manage the KV vectors
associated with graph subgraphs.

- The application maintains the KV vectors for each subgraph in the UI store.
- The configurator displays and updates the KV vectors held in that store.
- Add, delete, and selection changes update the store immediately.
- Graph Designer Apply persists the store state.

### Key Configurator host expectation

When multiple supported items are selected, the Key Configurator is expected to
show one item-specific configuration section for each selected item. These
sections are stacked and independently collapsible. The Subgraph Key
Configurator is displayed inside the section for each selected subgraph.

## 2. Terminology

| Term | Definition |
| --- | --- |
| KV pair | One graph key and its assigned value. |
| KV vector | One complete combination of one or more KV pairs. |
| KV vector list | The list of KV vectors associated with the selected subgraph. |
| Selected vector | A KV vector selected for a particular subgraph. |
| Unselected vector | A KV vector available for, but not selected for, a particular subgraph. |
| EC | Indicates whether a KV vector is used exclusively by EC usecases. |
| Session-added vector | A KV vector added during the active edit session. |
| Add KV Vector Editor | A textbox control with suggestions for constructing a KV vector to add. |
| Add KV Vector Selection Panel | An expandable key/value selection panel for constructing a KV vector to add. |
| Key Value mode | Displays both keys and values in the KV vector list. |
| Value Only mode | Displays only values in the KV vector list. |

## 3. Functional Requirements

### 3.1 Store population and lifecycle

- **FR-SGKV-01:** The application shall maintain the KV vectors for each
  subgraph in project-scoped UI state.
- **FR-SGKV-02:** When the selected usecase changes or a subgraph is added to
  the graph from the subgraph list, the application shall retrieve the
  applicable KV data from the backend and create or refresh the corresponding
  store entries.

### 3.2 Selection and panel visibility

- **FR-SGKV-03:** When a subgraph is selected in Graph Designer, the Key
  Configurator shall display the Subgraph KV Vector UI for that subgraph.

### 3.3 Vector display

- **FR-SGKV-04:** The KV vector list shall render every KV vector associated
  with the selected subgraph as one row containing all of its KV pairs.
- **FR-SGKV-05:** When the selected subgraph has no vectors, the view shall show
  an explicit empty state.
- **FR-SGKV-06:** The displayed list shall update immediately when the selected
  subgraph's store entry changes.

### 3.4 Display modes

- **FR-SGKV-07:** The KV vector list shall support Key Value mode and Value
  Only mode.
- **FR-SGKV-08:** Key Value mode shall display every pair in the format
  `[Key1:Value1][Key2:Value2]`.
- **FR-SGKV-09:** Value Only mode shall hide keys and display values in the
  format `Value1+Value2+Value3`.
- **FR-SGKV-10:** The KV vector list shall follow the `Usecase Name` preference
  under `Display Options` without changing stored vector data: `Key Value(s)`
  shall select Key Value mode, while `Alias` or `Value(s)` shall select Value
  Only mode.

### 3.5 Search and filters

- **FR-SGKV-11:** The KV vector list shall provide case-insensitive search.
- **FR-SGKV-12:** The KV vector list shall provide `Selected`, `Unselected`, and
  `All` filters. Each filter shall show selected vectors, unselected vectors, or
  both, respectively.
- **FR-SGKV-13:** In `All` mode, selected vectors shall appear before
  unselected vectors while preserving their relative order within each group.
- **FR-SGKV-14:** The KV vector list shall provide a mutually exclusive
  two-state EC filter based on each vector's store-backed EC classification:
  enabled shall show only EC vectors, while disabled shall show only non-EC
  vectors.

### 3.6 Read-only and edit modes

- **FR-SGKV-15:** The Subgraph Key Configurator shall be editable only while
  Graph Designer is in Edit mode; otherwise, it shall be read-only.
- **FR-SGKV-16:** In read-only mode, users shall be able to view, search,
  filter, scroll, and copy vectors, but shall not be able to add new KV vectors
  or modify KV vector selections.
- **FR-SGKV-17:** In edit mode, users shall be able to change a KV vector's
  selection state. The change shall immediately update only the selected
  subgraph's store entry.
- **FR-SGKV-18:** In edit mode, users shall be able to add one complete vector
  using the Add KV Vector Editor and Add KV Vector Selection Panel. A successful
  add shall immediately update the selected subgraph's store entry, mark the
  vector as session-added and selected, and update the displayed list.
- **FR-SGKV-19:** In edit mode, a Delete button shall be shown only for vectors
  identified by the store as session-added.
- **FR-SGKV-20:** Clicking Delete shall display a confirmation dialog.
  Confirming shall remove the vector from the selected subgraph's store entry
  and displayed list; dismissing the dialog shall make no change.

### 3.7 Add KV Vector controls

- **FR-SGKV-21:** The Add KV Vector section shall contain the Add KV Vector
  Editor and Add KV Vector Selection Panel. Both shall construct the same KV
  vector being added and remain synchronized.
- **FR-SGKV-22:** The Add KV Vector Selection Panel shall show the available
  graph keys, allow each key to expand and show its values, and allow the user
  to construct one KV vector by selecting one or more keys and one value for
  each selected key.
- **FR-SGKV-23:** The Add KV Vector Editor shall allow the user to type, view
  matching graph keys and values, and select matches to construct a KV vector.
- **FR-SGKV-24:** Available keys, values, and suggestions shall come from the
  graph-key definitions applicable to the active project or platform.
- **FR-SGKV-25:** Changes made in either the Add KV Vector Selection Panel or
  Add KV Vector Editor shall update the other. Editor text shall use the active
  display format, and only valid editor changes shall update panel selections.
- **FR-SGKV-26:** Changing the display mode shall update the Add KV Vector
  Editor's text representation without changing the KV vector being added.
- **FR-SGKV-27:** The Add KV Vector section shall provide an Add button, but no
  Apply or Cancel buttons. Add shall be available only when the candidate
  contains at least one complete KV pair and does not duplicate a stored vector
  of the selected subgraph.

#### Synchronization examples

- Selecting `DeviceTX = A2B_Mic` and `StreamTX = PCM_ULL_Record` in the Add KV
  Vector Selection Panel updates the editor to
  `[DeviceTX:A2B_Mic][StreamTX:PCM_ULL_Record]` in Key Value mode or
  `A2B_Mic+PCM_ULL_Record` in Value Only mode.
- Entering a valid vector in the Add KV Vector Editor selects the corresponding
  keys and values in the Add KV Vector Selection Panel.

### 3.8 Copy

- **FR-SGKV-28:** Each displayed KV vector row shall provide a Copy button in
  both read-only and edit modes.
- **FR-SGKV-29:** Copy shall format the complete vector according to the active
  list display mode: `[Key:Value][Key:Value]` in Key Value mode and
  `Value1+Value2` in Value Only mode.

## 4. Out of Scope

- Direct backend writes for individual KV-vector selection, add, or delete
  actions.
- Graph Designer Apply and Discard behavior.
- Graph and subgraph removal behavior.
- KV-vector generation, routing calculation, and EC classification calculation.
- Module CKV/TKV, subsystem keys, and other non-subgraph configurators.
- Key Configurator host selection and collapsible-section orchestration.
