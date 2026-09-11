# Subgraph Key Configurator: Requirements

## 1. Context

The Subgraph Key Configurator allows users to view and manage the KV vectors
associated with subgraphs.

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

| Term                          | Definition                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------- |
| KV pair                       | One graph key and its assigned value.                                        |
| KV vector                     | One complete combination of one or more KV pairs.                            |
| KV vector list                | The list of KV vectors associated with the selected subgraph.                |
| Selected vector               | A KV vector selected for a particular subgraph.                              |
| Unselected vector             | A KV vector available for, but not selected for, a particular subgraph.      |
| EC                            | Indicates whether a KV vector is used exclusively by EC usecases.            |
| Session-added vector          | A KV vector added during the active edit session.                            |
| Add KV Vector Editor          | A textbox control with suggestions for constructing a KV vector to add.      |
| Add KV Vector Selection Panel | An expandable key/value selection panel for constructing a KV vector to add. |
| Key Value mode                | Displays both keys and values.                                               |
| Value Only mode               | Displays only values.                                                        |

## 3. Functional Requirements

### 3.1 Store population and lifecycle

- **FR-SGKV-01:** The application shall maintain the KV vectors for each
  subgraph in project-scoped UI state.
- **FR-SGKV-02:** When the selected usecase changes or a subgraph is added to
  the graph from the subgraph list, the application shall retrieve the
  applicable KV data from the backend and create or refresh the corresponding
  store entries. When a subgraph is selected, the application shall refresh
  its vectors' selected and EC classification without requiring the user to
  open the Key Configurator.
  If the supporting usecase data is unavailable, it shall retain the current
  classification and show a warning.

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
- **FR-SGKV-10:** The KV vector list shall reuse the existing `Display Options`
  → `Usecase Name` preference to choose its display format without changing
  stored vector data: `Key Value(s)` shall select Key Value mode, while `Alias`
  or `Value(s)` shall select Value Only mode. This affects rendering only, not stored vector data.

### 3.5 Search and filters

- **FR-SGKV-11:** The KV vector list shall provide case-insensitive search.
- **FR-SGKV-12:** The KV vector list shall provide independent `Selected` and
  `Unselected` filters. A vector shall be shown when its matching selection
  state is enabled.
- **FR-SGKV-13:** `Selected` and `Unselected` may be enabled simultaneously;
  when they are, selected vectors shall appear before unselected vectors while
  preserving relative order within each group. When neither is enabled, no
  vectors shall be shown.
- **FR-SGKV-14:** The KV vector list shall provide independent `Regular` and
  `EC` type filters based on each vector's store-backed EC classification. A
  vector shall be shown when its matching type is enabled. `Regular` and `EC`
  may be enabled simultaneously; when neither is enabled, no vectors shall be
  shown.

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

#### Add section lifecycle

- **FR-SGKV-21:** Available keys, values, and suggestions shall come from the
  graph-key definitions applicable to the active project or platform.
- **FR-SGKV-22:** When the user opens the Add KV Vector section, it shall
  present a fresh candidate: empty Editor text, no selected keys or values, no
  suggestions, and no validation state.

#### Add KV Vector Selection Panel

- **FR-SGKV-23:** The Selection Panel shall show available graph keys in a
  compact expandable list. Expanding a key shall show its values, and the
  panel shall support expanding or collapsing all available keys.
- **FR-SGKV-24:** The Selection Panel shall automatically show a key's checkbox
  as checked when the candidate contains a selected value for that key;
  otherwise it shall be unchecked. A user cannot select a key by checking an
  unchecked checkbox. Clearing a checked checkbox shall remove that key's
  selected value from the candidate.
- **FR-SGKV-25:** Selecting a value shall select its key. A selected key shall
  have exactly one selected value, and a key shall have at most one selected
  value.
- **FR-SGKV-26:** The Selection Panel shall support sorting keys and values by
  identifier or name through the Key ID and Key Name headers. Sorting shall not
  change the candidate.

#### Add KV Vector Editor

- **FR-SGKV-27:** The Editor shall be the only control for searching available
  graph keys and values while constructing a candidate.
- **FR-SGKV-28:** The Editor shall support two completed-candidate formats:
  Key Value syntax `[Key:Value][Key:Value]` and Value Only syntax
  `Value1+Value2`. The active display mode selects the valid completed format.
  While constructing an incomplete candidate, key or value fragments may be
  typed in either mode and resolved through complete key/value-pair suggestions.
- **FR-SGKV-29:** The Editor's text format shall independently follow the
  active display mode: Key Value mode uses Key Value syntax and Value Only mode
  uses Value Only syntax. Changing display mode shall reformat valid
  Editor text without changing the candidate.
- **FR-SGKV-30:** The Editor shall accept and normalize incidental spaces,
  tabs, and line breaks around syntax delimiters and between complete entries.
  Whitespace occurring inside an unresolved key or value name shall remain part
  of that name and shall not be silently removed.
- **FR-SGKV-31:** A candidate shall not contain the same key more than once,
  regardless of casing.
- **FR-SGKV-32:** Key and value matching shall be case-insensitive. Every
  accepted Key Value pair shall resolve to one available key and a value of
  that key. Unknown, ambiguous, or misspelled Key Value names shall not be
  automatically replaced.
- **FR-SGKV-33:** Value Only tokens shall map to different keys. Spaces around
  tokens and `+` shall be ignored. If the same value exists under more than one
  key, the Editor shall choose one result, keep Add available, and show a
  warning. The warning shall direct the user to Key Value mode or the Selection
  Panel to check or change the keys. Empty tokens, brackets, unknown values,
  reused keys, or a candidate that cannot use different keys shall be rejected.
- **FR-SGKV-34:** If an available key or value name contains `+`, Value Only
  input shall be unavailable and the Editor shall require Key Value syntax.
- **FR-SGKV-35:** Valid Editor input shall be normalized to canonical text in
  the active display format. Formatting corrections shall not alter resolved
  key/value identity.
- **FR-SGKV-36:** After one or more resolved Value Only tokens, optionally
  following completed Key Value pairs, a trailing `+` shall retain the resolved
  prefix and permit continued Value Only input. An unbracketed `Key:Value`
  token shall be rejected as malformed input.

##### Editor suggestions and keyboard behavior

- **FR-SGKV-37:** Suggestions shall be derived from the token at the Editor
  caret. Formatting line breaks shall be tolerated. Suggestions shall not be
  shown when the complete Editor input is valid without an automatic-resolution
  warning or an invalid preceding expression prevents resolving the active
  token.
- **FR-SGKV-38:** In either display mode, the Editor shall provide suggestions
  matching available key or value names. Each suggestion shall represent one
  complete unused key/value pair, displaying the value with its key. Selecting
  a suggestion shall add that exact pair to the candidate and display the
  candidate in the active display format. A Value Only suggestion shall retain
  its selected key/value identity while its value text is unchanged.

  Example in Key Value mode:

  ```text
  Search: PCM_ULL
  Suggestion: PCM_ULL_Record    Key: StreamTX
  Result: [DeviceTX:A2B_Mic] [StreamTX:PCM_ULL_Record]
  ```

- **FR-SGKV-39:** In Value Only mode, suggestions shall remain closed until the
  user enters a non-whitespace search term.
- **FR-SGKV-40:** Suggestions shall be case-insensitive, sorted, capped at
  50 results, and shall not be selected automatically. Equal-value suggestions
  shall use the same stable key order as Value Only matching.
- **FR-SGKV-41:** Up and Down shall navigate an open suggestion list without
  wrapping. Enter shall commit only an explicitly selected suggestion; without
  one, it shall close the suggestion list without changing Editor text.
- **FR-SGKV-42:** After the user selects a Value Only suggestion at the end of
  a Value Only candidate, the Editor shall append `+` so the user can search
  for the next value.
- **FR-SGKV-43:** Escape, Tab, or loss of Editor focus shall close suggestions.
  Escape shall consume the key; Tab shall retain normal focus traversal.

#### Synchronization between Add controls

- **FR-SGKV-44:** The Add KV Vector section shall contain the Add KV Vector
  Editor and Add KV Vector Selection Panel. Both shall construct the same
  candidate KV vector and remain synchronized.
- **FR-SGKV-45:** When Selection Panel choices generate a KV vector in the
  Editor, its key/value pairs shall retain the order in which the user selected
  them. A successfully added vector shall be stored in graph-key definition
  order.
- **FR-SGKV-46:** Empty or whitespace-only Editor input shall be a valid empty
  candidate and shall clear the Selection Panel's candidate selections.
- **FR-SGKV-47:** Valid Editor input shall resolve all pairs before atomically
  updating the Selection Panel's candidate selections.
- **FR-SGKV-48:** Incomplete Editor input shall remain visible with neutral
  guidance. Invalid input shall remain visible with error feedback. Both shall
  clear the candidate and Selection Panel selection and make Add unavailable.
  Feedback shall quote the offending key, value, or text fragment and provide
  its relevant key context; it shall not identify the problem only by a pair or
  value number.

##### Synchronization examples

- Selecting `DeviceTX = A2B_Mic` and `StreamTX = PCM_ULL_Record` in the Add KV
  Vector Selection Panel updates the editor to
  `[DeviceTX:A2B_Mic] [StreamTX:PCM_ULL_Record]` in Key Value mode or
  `A2B_Mic+PCM_ULL_Record` in Value Only mode.
- Entering a valid vector in the Add KV Vector Editor selects the corresponding
  keys and values in the Add KV Vector Selection Panel.

#### Add operation

- **FR-SGKV-49:** The Add KV Vector section shall show its Add action row for
  a complete candidate and shall not provide an Apply action. It may provide a
  local Cancel action that clears and hides the candidate without changing
  stored vectors. For a duplicate candidate, the Add button shall be disabled
  and the row shall explain that the KV vector already exists.
- **FR-SGKV-50:** Add shall be available only when the candidate has one or
  more complete KV pairs, every selected key has a selected value, and the
  candidate does not duplicate a stored vector of the selected subgraph.
- **FR-SGKV-51:** A successful Add shall update the selected subgraph's store
  entry, mark the vector session-added and selected, refresh the vector list,
  and clear the local candidate.
- **FR-SGKV-52:** A rejected Add shall leave the local candidate unchanged and
  shall not update the subgraph's stored vectors.

### 3.8 Copy

- **FR-SGKV-53:** Each displayed KV vector row shall provide a Copy button in
  both read-only and edit modes.
- **FR-SGKV-54:** Copy shall format the complete vector according to the active
  list display mode: `[Key:Value][Key:Value]` in Key Value mode and
  `Value1+Value2` in Value Only mode.

### 3.9 Supplemental interaction and layout behavior

- **FR-SGKV-55:** The initial vector-list filter state shall use empty search
  text, `Selected` filter mode, and enabled `Regular` type. The same browsing
  state shall be retained when the user switches selected subgraphs or enters
  or exits Edit mode, and shall reset when the project session closes.
- **FR-SGKV-56:** Search shall split `+`-separated input into trimmed,
  non-empty terms. Every term shall match case-insensitively against a
  vector's complete Key Value representation, regardless of its active display
  mode.
- **FR-SGKV-57:** The vector list shall retain a complete canonical collection
  and derive its displayed rows by applying search, selection, and EC filters.
  Filtering shall not mutate the canonical collection.
- **FR-SGKV-58:** A selected subgraph with no stored vectors shall show the
  empty state. A non-empty canonical collection with no filter matches shall
  be represented as no matching vectors, not as no stored vectors.
- **FR-SGKV-59:** EC vectors shall be visually distinguishable from non-EC
  vectors without changing their selection state or EC classification.
- **FR-SGKV-60:** The Add KV Vector Editor and Selection Panel shall be
  available only when graph-key definitions are ready. If definitions cannot be
  loaded or no graph-key definitions are available, opening a new Add candidate
  shall not alter the stored vectors or the current candidate. It shall show a
  message that no key and value definitions are available.
- **FR-SGKV-61:** Selecting a value in the Selection Panel shall select its
  owning key when necessary. The selected key's values shall use mutually
  exclusive selection.
- **FR-SGKV-62:** A failed Add shall keep the Add controls open with their
  candidate unchanged. A successful Add shall clear the candidate and close
  the Add controls.
- **FR-SGKV-63:** The Add Editor shall wrap and grow vertically. The vector
  list, Selection Panel, suggestion popup, key list, and value lists shall use
  vertical scrolling when bounded. Normal interaction shall not require
  horizontal scrolling.
- **FR-SGKV-64:** Clipboard failures shall not change KV-vector or candidate
  state.

### 3.10 Selection and EC derivation

- **FR-SGKV-65:** After applicable graph and usecase data is refreshed, the
  application shall recalculate the selection and EC classification of the
  selected subgraph's stored KV vectors. While that classification request is
  in progress, the application shall show a neutral status instead of treating
  the current vectors as Selected or Unselected.
- **FR-SGKV-66:** For each usecase-owned subgraph, a KV vector shall be selected
  when its complete set of KV pairs is a subset of at least one selected
  usecase containing that subgraph; otherwise, it shall be unselected.
  Subgraphs added from the subgraph list during the active edit session shall
  be excluded from automatic selection.
- **FR-SGKV-67:** EC classification shall use all applicable usecases, not only
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
