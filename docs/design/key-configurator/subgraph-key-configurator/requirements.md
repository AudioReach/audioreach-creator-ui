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

The Add KV Vector controls construct one local candidate. Constructing or
editing that candidate shall not update the subgraph's stored vectors until the
user selects Add.

#### Add KV Vector Selection Panel

- **FR-SGKV-21:** The Add KV Vector section shall contain the Add KV Vector
  Editor and Add KV Vector Selection Panel. Both shall construct the same
  candidate KV vector and remain synchronized.
- **FR-SGKV-22:** Available keys, values, and suggestions shall come from the
  graph-key definitions applicable to the active project or platform.
- **FR-SGKV-23:** Opening a new Add candidate shall clear its editor text,
  selected keys, selected values, suggestions, and validation state.
- **FR-SGKV-24:** The Selection Panel shall show available graph keys in a
  compact expandable list. Expanding a key shall show its values, and the
  panel shall support expanding or collapsing all currently filtered keys.
- **FR-SGKV-25:** A user shall be able to select one or more keys, including
  selecting or deselecting all currently filtered keys. Deselecting a key
  shall remove its selected value from the candidate.
- **FR-SGKV-26:** A selected key shall have at most one selected value. A key
  without a selected value shall not contribute a KV pair to the candidate.
- **FR-SGKV-27:** The Selection Panel shall support case-insensitive filtering
  of keys and values, and matching values shall reveal their owning key.
- **FR-SGKV-28:** The Selection Panel shall support sorting keys and values by
  identifier or name. Sorting and filtering shall not change the candidate.
- **FR-SGKV-29:** Panel-originated candidate text shall use graph-key
  definition order, rather than the order in which the user selected keys.

#### Add KV Vector Editor parsing and synchronization

- **FR-SGKV-30:** The Editor shall support Key Value syntax
  `[Key:Value][Key:Value]` and Value Only syntax `Value1+Value2`.
- **FR-SGKV-31:** The Editor shall use Key Value syntax in Key Value mode and
  Value Only syntax in Value Only mode. When Value Only syntax is unavailable
  under FR-SGKV-38, the Editor shall use Key Value syntax regardless of display
  mode. Changing display mode shall reformat valid editor text without changing
  the candidate.
- **FR-SGKV-32:** Empty or whitespace-only Editor input shall be a valid empty
  candidate and shall clear the Selection Panel's candidate selections.
- **FR-SGKV-33:** The Editor shall reject multiline input and malformed Key
  Value syntax, including incomplete pairs, empty names, whitespace, square
  brackets, or additional `:` characters inside a name.
- **FR-SGKV-34:** A candidate shall not contain the same key more than once,
  regardless of casing.
- **FR-SGKV-35:** Key and value matching shall be case-insensitive. Every
  accepted Key Value pair shall resolve to one available key and a value of
  that key. If definitions are unavailable, Editor input shall not change the
  candidate.
- **FR-SGKV-36:** The Editor shall support a mixed continuation: complete
  Key Value pairs followed immediately by Value Only tokens. Each Value Only
  token shall resolve only against keys unused by the Key Value prefix.
- **FR-SGKV-37:** Value Only tokens shall resolve to values assigned to
  distinct keys. Empty tokens, whitespace, bracket characters, an unknown
  token, no valid assignment, or more than one valid assignment shall be
  rejected.
- **FR-SGKV-38:** If an available key or value name contains `+`, Value Only
  input shall be unavailable and the Editor shall require Key Value syntax.
- **FR-SGKV-39:** Valid Editor input shall resolve all pairs before atomically
  replacing the Selection Panel's candidate selections.
- **FR-SGKV-40:** Invalid Editor input shall remain visible with validation
  feedback and shall preserve the last valid Selection Panel candidate.
- **FR-SGKV-41:** Valid Editor input shall be normalized to canonical text in
  the active display format.
- **FR-SGKV-42:** A trailing `+` after a valid Value Only prefix shall retain
  the resolved prefix and permit continued Value Only input.

#### Editor suggestions and keyboard behavior

- **FR-SGKV-43:** Suggestions shall be derived from the token at the Editor
  caret and shall not be shown for invalid multiline input or an invalid
  preceding expression.
- **FR-SGKV-44:** In a Key Value key position, suggestions shall contain
  matching unused keys. In a value position, they shall contain matching
  values of the resolved key.
- **FR-SGKV-45:** In Value Only input, suggestions shall contain matching
  values with their owning key as context. Mixed-continuation suggestions
  shall exclude keys used by the Key Value prefix.
- **FR-SGKV-46:** Suggestions shall be case-insensitive, sorted, capped at
  50 results, and shall not be selected automatically.
- **FR-SGKV-47:** Up and Down shall navigate an open suggestion list without
  wrapping. Enter shall commit only an explicitly selected suggestion.
- **FR-SGKV-48:** Committing a suggestion shall replace only its token range
  and preserve or complete required Key Value syntax.
- **FR-SGKV-49:** Committing a Value Only suggestion at the end of Value Only
  input shall append `+` for continued entry.
- **FR-SGKV-50:** Escape, Tab, or loss of Editor focus shall close suggestions.
  Escape shall consume the key; Tab shall retain normal focus traversal.

#### Add operation

- **FR-SGKV-51:** The Add KV Vector section shall provide an Add button, but
  no Apply or Cancel buttons.
- **FR-SGKV-52:** Add shall be available only when the candidate has one or
  more complete KV pairs, every selected key has a selected value, and the
  candidate does not duplicate a stored vector of the selected subgraph.
- **FR-SGKV-53:** A successful Add shall update the selected subgraph's store
  entry, mark the vector session-added and selected, refresh the vector list,
  and clear the local candidate.
- **FR-SGKV-54:** A rejected Add shall leave the local candidate unchanged and
  shall not update the subgraph's stored vectors.

#### Synchronization examples

- Selecting `DeviceTX = A2B_Mic` and `StreamTX = PCM_ULL_Record` in the Add KV
  Vector Selection Panel updates the editor to
  `[DeviceTX:A2B_Mic][StreamTX:PCM_ULL_Record]` in Key Value mode or
  `A2B_Mic+PCM_ULL_Record` in Value Only mode.
- Entering a valid vector in the Add KV Vector Editor selects the corresponding
  keys and values in the Add KV Vector Selection Panel.

### 3.8 Copy

- **FR-SGKV-55:** Each displayed KV vector row shall provide a Copy button in
  both read-only and edit modes.
- **FR-SGKV-56:** Copy shall format the complete vector according to the active
  list display mode: `[Key:Value][Key:Value]` in Key Value mode and
  `Value1+Value2` in Value Only mode.

### 3.9 Supplemental interaction and layout behavior

- **FR-SGKV-57:** The initial vector-list filter state shall use empty search
  text, `Selected` filter mode, and the non-EC filter state. The same browsing
  state shall be retained when the user switches selected subgraphs or enters
  or exits Edit mode, and shall reset when the project session closes.
- **FR-SGKV-58:** Search shall split `+`-separated input into trimmed,
  non-empty terms. Every term shall match case-insensitively against a
  vector's complete Key Value representation, regardless of its active display
  mode.
- **FR-SGKV-59:** The vector list shall retain a complete canonical collection
  and derive its displayed rows by applying search, selection, and EC filters.
  Filtering shall not mutate the canonical collection.
- **FR-SGKV-60:** A selected subgraph with no stored vectors shall show the
  empty state. A non-empty canonical collection with no filter matches shall
  be represented as no matching vectors, not as no stored vectors.
- **FR-SGKV-61:** EC vectors shall be visually distinguishable from non-EC
  vectors without changing their selection state or EC classification.
- **FR-SGKV-62:** The Add KV Vector controls shall be available only when
  graph-key definitions are ready. If definitions cannot be loaded, opening a
  new Add candidate shall not alter the stored vectors or the current
  candidate.
- **FR-SGKV-63:** Selecting a value in the Selection Panel shall select its
  owning key when necessary. The selected key's values shall use mutually
  exclusive selection.
- **FR-SGKV-64:** A failed Add shall keep the Add controls open with their
  candidate unchanged. A successful Add shall clear the candidate and close
  the Add controls.
- **FR-SGKV-65:** The vector list, Add Editor, suggestion popup, key list, and
  value lists shall use vertical scrolling when needed and shall not require
  horizontal scrolling for normal interaction.
- **FR-SGKV-66:** Clipboard failures shall not change KV-vector or candidate
  state.

### 3.10 Selection and EC derivation

- **FR-SGKV-67:** After applicable graph and usecase data is refreshed, the
  application shall recalculate the selection and EC classification of stored
  KV vectors.
- **FR-SGKV-68:** For each usecase-owned subgraph, a KV vector shall be selected
  when its complete set of KV pairs is a subset of at least one selected
  usecase containing that subgraph; otherwise, it shall be unselected.
  Subgraphs added from the subgraph list during the active edit session shall
  be excluded from automatic selection.
- **FR-SGKV-69:** EC classification shall use all applicable usecases, not only
  selected usecases. A KV vector shall be classified as EC only when at least
  one EC usecase contains the complete vector and no matching non-EC usecase
  contains it. A vector with no matching usecase shall be non-EC.

## 4. Out of Scope

- Direct backend writes for individual KV-vector selection, add, or delete
  actions.
- Graph Designer Apply and Discard behavior.
- Graph and subgraph removal behavior.
- KV-vector generation and routing calculation.
- Module CKV/TKV, subsystem keys, and other non-subgraph configurators.
- Key Configurator host selection and collapsible-section orchestration.
