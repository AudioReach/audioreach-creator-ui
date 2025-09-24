export type JSONDataMap = {
  [key: string]: any
}

export const graphDesignerLayout = {
  component: "usecase",
  position: {
    area: "center",
    weight: 100,
  },
}

export function GetLayoutDefaultConfigData(): JSONDataMap {
  return {
    arcconfig: {
      layout: {
        graphDesignerView: graphDesignerLayout,
        logView: {
          component: "log",
          position: {
            border: true,
            borderLocation: "bottom",
            borderSize: 150,
            isCollapsed: false,
            isPopOut: false,
          },
        },
        propertiesView: {
          component: "prop",
          position: {
            border: true,
            borderLocation: "right",
            borderSize: 150,
            isCollapsed: false,
            isPopOut: false,
          },
        },
      },
    },
  }
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
