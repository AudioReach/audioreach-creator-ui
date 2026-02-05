import type {
  IBorderLocation,
  IJsonBorderNode,
  IJsonModel,
  IJsonTabNode,
  IJsonTabSetNode,
} from "flexlayout-react"

export type JSONDataMap = {
  [key: string]: any
}

export const GRAPH_DESIGNER_COMPONENT_NAME = "usecase"

export const graphDesignerLayout = {
  component: GRAPH_DESIGNER_COMPONENT_NAME,
  position: {
    area: "center",
    weight: 100,
  },
}

/**
 * Creates the complete FlexLayout JSON configuration for a project
 * This includes the main tab (GraphDesigner) and border panels
 * @returns Complete IJsonModel ready to use with FlexLayout
 */
export function GetFlexLayoutConfig(): IJsonModel {
  const tabNode: IJsonTabNode = {
    component: GRAPH_DESIGNER_COMPONENT_NAME,
    id: "usecase-main",
    name: "Graph Designer",
    type: "tab",
  }

  const tabSet: IJsonTabSetNode = {
    children: [tabNode],
    enableTabStrip: false,
    type: "tabset",
  }

  const borderBottom: IJsonBorderNode = {
    children: [] as IJsonTabNode[],
    location: "bottom" as IBorderLocation,
    type: "border",
  }

  const borderRight: IJsonBorderNode = {
    children: [] as IJsonTabNode[],
    location: "right" as IBorderLocation,
    type: "border",
  }

  const flexLayoutConfig: IJsonModel = {
    borders: [borderBottom, borderRight],
    global: {},
    layout: {
      children: [tabSet],
      id: "root",
      type: "row",
    },
  }

  return flexLayoutConfig
}

/* returns either a primitive value (like true, 42, "bottom") or
 * an object (like the usecase object) or even undefined if the path doesn't
 * exist. To reflect that this function can return any value found at the path,
 * not just an object we use any
 */
export function getConfigData(
  jsonData: JSONDataMap,
  path: string,
  rootKey?: string,
): any {
  const data = rootKey ? jsonData[rootKey] : jsonData
  return path
    .split(".")
    .reduce(
      (accumulator, currentValue) => accumulator && accumulator[currentValue],
      data,
    )
}

/*
This function will overwrite primitives.
Example:
const jsonData = { arcconfig: { project1: 'data' } };
setConfigData(jsonData, 'project1.modified', true); 
Output:{ arcconfig: { project1: { modified: true } } };
*/
export function setConfigData(
  jsonData: JSONDataMap,
  path: string,
  newValue: any,
  rootKey?: string,
): void {
  let presentData = rootKey ? jsonData[rootKey] : jsonData
  const pathArray = path.split(".")
  pathArray.forEach((currentElement, index) => {
    if (index === pathArray.length - 1) {
      // Set the value at the final path element
      presentData[currentElement] = newValue
    } else {
      // If the next element doesn't exist or is not an object, overwrite with an
      // empty object
      if (
        typeof presentData[currentElement] !== "object" ||
        presentData[currentElement] === null
      ) {
        presentData[currentElement] = {}
      }
      presentData = presentData[currentElement]
    }
  })
}
