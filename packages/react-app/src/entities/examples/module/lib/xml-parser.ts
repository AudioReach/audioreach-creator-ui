// Move XML parser to entities layer as it's now part of the mock backend
import {XMLParser} from "fast-xml-parser"

import type {Module, Parameter, Port} from "../model"

const toUppercaseHex = (value: any): any => {
  if (typeof value === "string") {
    if (/^(0x)?[0-9a-f]+$/i.test(value)) {
      return value.replace(/([a-f])/gi, (match) => match.toUpperCase())
    }
  }
  return value
}

const sanitizeDescription = (
  description: string | null | undefined,
): string => {
  if (!description) {
    return ""
  }

  return description
    .replace(/\\n/g, "\n") // Replace escaped newlines with actual newlines
    .replace(/#\[/g, "") // Remove "#[" characters
    .replace(/#\]/g, "") // Remove "#]" characters
}

export const parseModuleXml = (xmlContent: string): Module[] => {
  try {
    const parser = new XMLParser({
      attributeNamePrefix: "",
      ignoreAttributes: false,
      isArray: (name) => {
        // Ensure MODULE is always treated as an array
        if (name === "MODULE") {
          return true
        }
        return false
      },
    })

    const parsed = parser.parse(xmlContent)

    if (!parsed || !parsed.MODULE_DEF) {
      console.error("Invalid XML structure: Missing MODULE_DEF")
      return []
    }

    const moduleDef = parsed.MODULE_DEF

    if (!moduleDef.MODULE_LIST || !moduleDef.MODULE_LIST.MODULE) {
      console.error("Invalid XML structure: Missing MODULE_LIST or MODULE")
      return []
    }

    const moduleList = moduleDef.MODULE_LIST.MODULE

    return moduleList.map(
      (xmlModule: {
        builtin: string
        description: string
        displayName: string
        id: number
        name: string
      }) => ({
        description: sanitizeDescription(xmlModule.description),
        displayName: xmlModule.displayName || xmlModule.name || "",
        id: toUppercaseHex(xmlModule.id) || "",
        inputPorts: parseInputPorts(xmlModule),
        isBuiltin: xmlModule.builtin === "true",
        name: xmlModule.name || "",
        outputPorts: parseOutputPorts(xmlModule),
        parameters: parseParameters(xmlModule),
      }),
    )
  } catch (error) {
    console.error("Error parsing XML:", error)
    return []
  }
}

const parseInputPorts = (xmlModule: any): Port[] => {
  if (!xmlModule.MODULE_INFO?.DATA_PORT_INFO?.INPUT_PORTS?.PORT) {
    return []
  }

  const ports = xmlModule.MODULE_INFO.DATA_PORT_INFO.INPUT_PORTS.PORT
  return (Array.isArray(ports) ? ports : [ports]).map((port) => ({
    id: toUppercaseHex(port.id),
    name: port.name,
    type: "INPUT",
  }))
}

const parseOutputPorts = (xmlModule: any): Port[] => {
  if (!xmlModule.MODULE_INFO?.DATA_PORT_INFO?.OUTPUT_PORTS?.PORT) {
    return []
  }

  const ports = xmlModule.MODULE_INFO.DATA_PORT_INFO.OUTPUT_PORTS.PORT
  return (Array.isArray(ports) ? ports : [ports]).map((port) => ({
    id: toUppercaseHex(port.id),
    name: port.name,
    type: "OUTPUT",
  }))
}

const parseParameters = (xmlModule: any): Parameter[] => {
  if (!xmlModule.PARAMETER_LIST?.PARAMETER) {
    return []
  }

  const parameters = xmlModule.PARAMETER_LIST.PARAMETER

  return (Array.isArray(parameters) ? parameters : [parameters])
    .filter((param) => param.isSubStruct !== "true")
    .map((param) => ({
      defaultValue: param.value || "",
      description: sanitizeDescription(param.description),
      id: toUppercaseHex(param.pid),
      isSubStruct: param.isSubStruct,
      maxSize: param.maxSize,
      name: param.name,
      pid: toUppercaseHex(param.pid),
    }))
}

export const fetchXmlContent = async (url: string): Promise<string> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch XML from ${url}: ${response.statusText}`)
  }
  return response.text()
}
