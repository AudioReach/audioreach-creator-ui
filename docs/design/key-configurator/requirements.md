## Table of Contents

1. [Feature Overview and Strategic Fit](#1-feature-overview-and-strategic-fit)
2. [Architectural Impacts](#2-architectural-impacts)
3. [Requirements](#3-requirements)
   - [3.1 Subgraph Key Vector](#31-subgraph-key-vector)
     - [3.1.1 Revised Behavior — Multiple Added Key Vectors](#311-revised-behavior--multiple-added-key-vectors-supersedes-rows-2-3-6-7)
     - [3.1.2 On-Demand Keys and Values Fetch](#312-on-demand-keys-and-values-fetch-subgraph-key-vector-add-flow-only)
   - [3.2 Calibration Key Vector](#32-calibration-key-vector)
   - [3.3 Tag Key Vector](#33-tag-key-vector)
   - [3.4 Subsystem Keys](#34-subsystem-keys)

---

## 1. Feature Overview and Strategic Fit

The Key Configurator View is designed to display and manage all available key
values required for system configuration. It allows users to configure
subgraph key vectors, various subsystems, as well as to configure calibration
key vectors and tag key vectors specifically for individual module instances.
This feature simplifies the configuration process and helps users efficiently
set up, modify, and maintain configurations for the subgraphs, subsystems, and
module instances with calibration key vectors and tag key vectors.

## 2. Architectural Impacts

- **Graph Visualization Support** — Backend and frontend must handle detailed
  configuration data for subgraphs, subsystems, and module instances.
- **Scalability** — Architecture must support displaying and managing
  configurations for graph key vectors, and multiple instances of modules and
  subsystems simultaneously, without impacting performance or user experience.

## 3. Requirements

### 3.1 Subgraph Key Vector

| #   | Requirement                                       | Description                                                                                                                                                                                                             |
| --- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Show Subgraph Key Vector UI on Subgraph Selection | As a user, when I select one or more subgraphs, I want the Subgraph Key Vector configuration UI to appear so I can view or edit key vector settings for the selected scope.                                             |
| 2   | Display Existing Configuration in Textbox         | As a user, if a Subgraph Key Vector is already configured, I want to see it in a textbox with edit and delete icons so I can review and manage it.                                                                      |
| 3   | No Configuration Exists                           | As a user, if no configuration exists, I want to see an empty textbox with an Add icon so I know I can create a new configuration.                                                                                      |
| 4   | Hide Available Keys and Search by Default         | As a user, I don't want to see the available keys list or search bar until I decide to add or edit, to keep the UI uncluttered.                                                                                         |
| 5   | Add Flow: Show Available Keys + Search            | As a user, when I click Add, I want to see the available graph keys with a search bar so I can select and configure key-value pairs.                                                                                    |
| 6   | Edit Flow: Pre-populated Selection                | As a user, when I click Edit, I want to see the available keys and their current values pre-selected so I can modify them quickly.                                                                                      |
| 7   | Pre-populated Selection Renders on Top            | As a user, when I click the Edit button, I want the previously selected keys and values to appear in an expanded form and be rendered at the top of the list so I can quickly review and modify them without scrolling. |
| 8   | Apply Configuration                               | As a user, when I click Apply, I want the configuration to be added/updated in the textbox so the summary reflects my latest changes.                                                                                   |
| 9   | Cancel: Discard Changes                           | As a user, when I click Cancel during Add/Edit, I want all changes discarded so the UI returns to the previous state.                                                                                                   |
| 10  | Validation & Error Handling                       | As a user, I want validation and meaningful errors.                                                                                                                                                                     |
| 11  | Usability: Search & Filter                        | As a user, I want a responsive search to filter available keys so I can find keys quickly.                                                                                                                              |
| 12  | Expand All Keys                                   | As a user, when I click the Expand All button, I want all keys and their values to expand so I can view details at once.                                                                                                |
| 13  | Collapse All Keys                                 | As a user, when I click the Collapse All button, I want all keys and values to collapse so I can minimize clutter.                                                                                                      |
| 14  | Select All Checkbox in Header                     | As a user, when I click the Select All checkbox in the header, I want all key checkboxes to be selected and expanded so I can quickly configure all keys at once.                                                       |
| 15  | Select All with Search Filter                     | As a user, when I search for any key or value and then click the Select All checkbox in the header, I want only the filtered keys to be selected so I can apply changes to the visible subset.                          |

#### 3.1.1 Revised Behavior — Multiple Added Key Vectors (supersedes rows 2, 3, 6, 7)

A subgraph's Subgraph Key Vector configuration is not a single editable
config — it is a list of independently-added key-vector entries, each
one or more key-value pairs applied together. This
was confirmed against the legacy reference app (Qualcomm Audio Calibration
Tool, v8.3.13.3): a per-subgraph **"Added Key Vector(s)"** panel lists each
saved entry as a row with its own checkbox (e.g.
`[StreamRX:PCM_Deep_Buffer][Instance:Instance_1]`, `[DeviceRX:BT_Rx]`), and a
"+" button opens the same available-keys picker used by the Add flow (row
#5) to create a new added key vector.

| #   | Requirement                                             | Description                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17  | Added Key Vector(s) List                                | As a user, when a subgraph has one or more saved added key vectors, I want to see each one listed as its own row (e.g. `[StreamRX:PCM_Deep_Buffer][Instance:Instance_1]`) in an "Added Key Vector(s)" panel, with a "+" button in the header to add another.        |
| 18  | Per-Entry Checkbox is Selection-Only                    | As a user, when I check or uncheck an entry in "Added Key Vector(s)", I want that to only mark the entry as selected, without changing whether it's part of the subgraph's active configuration.                                                                    |
| 19  | No Edit or Delete of Existing Added Key Vectors         | As a user, once I've added a key vector, I should not be able to modify or remove it through this flow — I can only add new entries.                                                                                                                                |
| 20  | Add Flow Creates a New Added Key Vector                 | As a user, when I click "+", I want the available-keys panel (search, expand/collapse, per-key value selection) to open so I can check one or more keys, pick a value for each, and click Apply to add the result as a new row in "Added Key Vector(s)".            |
| 21  | Duplicate Added Key Vector Prevented                    | As a user, if I try to add a key vector whose exact set of key-value pairs already exists as a saved entry, I want Apply to reject it so I don't create redundant entries.                                                                                          |
| 22  | Independent Panel per Selected Subgraph                 | As a user, when I select multiple subgraphs at once, I want each selected subgraph to show its own "Added Key Vector(s)" panel with its own Add flow, so I can configure each subgraph's added key vectors independently.                                           |
| 28  | Existing Entry Checked State Reflects Usecase Selection | As a user, I want an existing (already-saved) Added Key Vector row to appear checked when it best matches my currently-selected usecase(s), so the checkbox reflects what's actually active rather than always showing checked.                                     |
| 29  | Apply Blocked Until Existing Entries Are Loaded         | As a user, if I click Apply before the subgraph's existing (backend-persisted) Added Key Vector(s) have finished loading, I want Apply to refuse and tell me why, so a new entry is never added without first being checked against everything that already exists. |

#### 3.1.2 On-Demand Keys and Values Fetch (Subgraph Key Vector Add flow only)

The current implementation loads all available graph keys **and** their
values in a single `initialize(projectId)` call when the subgraph config
store is first initialized (`GraphKey.values: KeyValue[]` fully populated
up front — see §8.3). For the Subgraph Key Vector Add flow specifically,
this changes to a two-step, on-demand fetch: opening the Add panel fetches
only the list of keys (no values); a key's values are fetched only once
that key is checked. This does **not** apply to Calibration Key Vector, Tag
Key Vector, or Subsystem Keys, which keep their existing preloaded-values
behavior.

| #   | Requirement                           | Description                                                                                                                                                                                                      |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 23  | Fetch Keys on Add Panel Open          | As a user, when I click "+" to open the Add panel, I want the list of available keys (name/ID only, no values) to be fetched from the backend so I always see the current set of keys.                           |
| 24  | Fetch a Key's Values on Check         | As a user, when I check a key's checkbox in the Add panel, I want that key's values to be fetched from the backend and displayed so I can pick one.                                                              |
| 25  | Per-Key Loading and Error State       | As a user, while a key's values (or the initial keys list) are loading, I want to see a loading indicator, and if the fetch fails, an inline error, so I understand the panel's state.                           |
| 26  | Search Scoped Per Panel               | As a user, I want to search the main keys list by key name/ID, and separately search within each checked key's values panel by that key's value name/ID, so I can narrow down long lists at each level.          |
| 27  | Select All Fetches Every Key's Values | As a user, when I click the Select All checkbox in the header, I want every visible key to be checked and its values fetched (in parallel) and expanded, so I can quickly review and configure all keys at once. |

### 3.2 Calibration Key Vector

| #   | Requirement                                                        | Description                                                                                                                                                                              |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Show Calibration Key Vector UI on Module Selection                 | As a user, when I select a module instance, I want the Calibration Key Vector configuration UI to appear so I can view or edit calibration settings.                                     |
| 2   | Display Configured Keys                                            | As a user, if a calibration key vector is configured, I want to see it in the Configured Keys section (expanded) along with an Add button and Configure PIDs section with selected PIDs. |
| 3   | Display Zero CKV                                                   | As a user, if nothing is configured, I want to see Zero CKV displayed along with Add button and Configure PIDs section with all PIDs selected.                                           |
| 4   | Hide Available Keys and Search by Default                          | As a user, I don't want to see available calibration keys or search bar until I choose to add or edit, to keep UI clean.                                                                 |
| 5   | Add Flow: Show Available Keys + Search + Expand All + Collapse All | As a user, when I click Add, I want to see available calibration keys with a search bar so I can configure key-value pairs.                                                              |
| 6   | Edit Flow: Pre-populated Selection                                 | As a user, when I click Edit, I want to see available calibration keys with current values pre-selected so I can modify them easily.                                                     |
| 7   | Delete CKV Configuration                                           | As a user, when I click Delete, I want the respective CKV configuration removed so I can start fresh.                                                                                    |
| 8   | Apply: Save to Configured Keys Section                             | As a user, when I click Apply, I want the configuration added/updated and visible in the Configured Keys section.                                                                        |
| 9   | Cancel: Discard Changes                                            | As a user, when I click Cancel during Add/Edit, I want all changes discarded so the UI returns to the previous state.                                                                    |
| 10  | Select All Checkbox                                                | As a user, when I click the Select All checkbox in the header, I want all keys and values checkboxes selected and expanded so I can configure all keys and values at once.               |
| 11  | Select All with Search Filter                                      | As a user, when I search for any key or value and click Select All, I want only filtered keys and values selected so I can apply changes to the visible subset.                          |
| 12  | Expand All Keys                                                    | As a user, when I click Expand All, I want all keys and values expanded so I can view details at once.                                                                                   |
| 13  | Collapse All Keys                                                  | As a user, when I click Collapse All, I want all keys and values collapsed so I can minimize clutter.                                                                                    |

### 3.3 Tag Key Vector

| #   | Requirement                                                        | Description                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Show Tag Key Vector UI on Module Selection                         | As a user, when I select a module instance, I want the Tag Key Vector configuration UI to appear so I can view or edit tag-based configurations.                                                  |
| 2   | Display Configured TKVs                                            | As a user, if any tag key vectors are configured, I want to see them in the Configured TKVs section (expanded) with edit and delete icons for each configuration and an Add button in the header. |
| 3   | Group Configurations by Tag                                        | As a user, I want all key vectors grouped under their corresponding tag so I can manage them easily.                                                                                              |
| 4   | Delete Tag-Level Configurations                                    | As a user, when I click the delete button at the tag level, I want all configurations under that tag removed.                                                                                     |
| 5   | No Configuration Exists                                            | As a user, if nothing is configured, I want to see an empty configuration message along with an Add button so I know I can create a new configuration.                                            |
| 6   | Hide Available Tags and Search by Default                          | As a user, I don't want to see available tags or search bar until I choose to add or edit, to keep UI clean.                                                                                      |
| 7   | Add Flow: Show Available Tags + Search + Expand All + Collapse All | As a user, when I click Add, I want to see available tags with a search bar and PIDs configuration section so I can configure tag-based key-value pairs.                                          |
| 8   | Edit Flow: Pre-populated Selection                                 | As a user, when I click Edit, I want to see available tags with current key-value selections and configured PIDs so I can modify them easily.                                                     |
| 9   | Delete TKV Configuration                                           | As a user, when I click Delete on a specific configuration, I want that configuration removed so I can manage others.                                                                             |
| 10  | Single Tag Configuration                                           | As a user, I want to configure only one tag at a time so I can avoid conflicts.                                                                                                                   |
| 11  | Apply: Save to Configured TKVs Section                             | As a user, when I click Apply, I want the configuration added/updated and visible in the Configured TKVs section.                                                                                 |
| 12  | Select All Values Under a Tag                                      | As a user, when I click the Select All checkbox for a key under a tag, I want all values for that key selected so I can configure them quickly.                                                   |
| 13  | Expand All Keys                                                    | As a user, when I click Expand All, I want all keys and values expanded so I can view details at once.                                                                                            |
| 14  | Collapse All Keys                                                  | As a user, when I click Collapse All, I want all keys and values collapsed so I can minimize clutter.                                                                                             |

### 3.4 Subsystem Keys

| #   | Requirement                               | Description                                                                                                                                                                                           |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Show Subsystem Keys UI on Selection       | As a user, when I select a subsystem, I want the subsystem calibration keys configuration UI to appear so I can view or edit subsystem-specific calibration settings.                                 |
| 2   | Display Configured Keys with Delete       | As a user, if calibration keys are configured, I want to see them in the Configured Keys section (expanded) with delete icons for each configuration, and an Add button in the header.                |
| 3   | No Configuration Exists                   | As a user, if nothing is configured, I want to see an empty panel with an Add button so I know I can create a new configuration.                                                                      |
| 4   | Hide Available Keys and Search by Default | As a user, I don't want to see available calibration keys or search bar until I choose to add or edit, to keep UI clean.                                                                              |
| 5   | Add Flow: Show Available Keys + Search    | As a user, when I click Add, I want to see available calibration keys with a search bar so I can configure key-value pairs.                                                                           |
| 6   | Delete Key Configuration                  | As a user, when I click Delete, I want the respective key configuration removed so I can manage the list easily.                                                                                      |
| 7   | Apply: Save to Configured Keys Section    | As a user, when I click Apply, I want the configuration added/updated and visible in the Configured Keys section. If multiple keys are selected, each should be added as an individual configuration. |
| 8   | Cancel: Discard Changes                   | As a user, when I click Cancel during Add/Edit, I want all changes discarded so the UI returns to the previous state.                                                                                 |
| 9   | Select All Checkbox                       | As a user, when I click the Select All checkbox in the header, I want all key checkboxes selected so I can configure all keys at once.                                                                |
| 10  | Select All with Search Filter             | As a user, when I search for any key and click Select All, I want only filtered keys selected so I can apply changes to the visible subset.                                                           |
| 11  | Sort Keys by ID or Name                   | As a user, when I click the sort icons in the header next to Key ID or Key Name, I want the list of keys to be sorted accordingly so I can quickly organize and find keys.                            |
