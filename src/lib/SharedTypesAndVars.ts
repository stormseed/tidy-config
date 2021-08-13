interface genericObject {
  [x: string]: genericObject | genericObject[] | any
}

export type AbsolutePath = string
export type RelativePath = string
export type FileName = string
export type ListOfFileNames = FileName[]

export type PackageObjectType = genericObject
export type VSCodeSettingsType = genericObject
export type TimestampType = number
export type PackageObjectVariationType = 'json' | 'readable' | 'equal' | 'both'
export type HashType = string

export type InitOptionsType = {
  configFolderName: FileName
  files: ListOfFileNames
  postInstall: boolean
  hideInVSCode: boolean
}

export const PACKAGE_JSON_CONFIG_NAME: string = 'tidyConfig'
