import * as path from 'path'
import { promises as fsPromises } from 'fs'
import {
  AbsolutePath,
  RelativePath,
  ListOfFileNames,
  FileName,
  PackageObjectType,
  InitOptionsType,
  PACKAGE_JSON_CONFIG_NAME,
} from './SharedTypesAndVars'
import output from './OutputFunctions'
import { PathFunctions } from './PathFunctions'
import { PackageFileFunctions } from './PackageFileFunctions'

import ignoredRootFiles from './ignoredRootFiles'
import { VSCodeSettingsFunctions } from './VSCodeSettingsFunctions'

export class InitFunctions {
  pathFunctions: PathFunctions = new PathFunctions()
  packageFileFunctions: PackageFileFunctions = new PackageFileFunctions()
  vsCodeFunctions: VSCodeSettingsFunctions = new VSCodeSettingsFunctions()
  postInstallScriptCommand = 'clean-config --sync --force=json'

  constructor() {
    this.pathFunctions.setProjectRootPath(process.cwd())
  }

  async getListOfFiles(path: AbsolutePath): Promise<ListOfFileNames> {
    let resultFileList: ListOfFileNames = []
    const fileList = await fsPromises.readdir(path, { withFileTypes: true })
    fileList.forEach((fileObj) => {
      if (
        fileObj.isFile() &&
        !fileObj.isSymbolicLink() &&
        !ignoredRootFiles.includes(fileObj.name)
      ) {
        resultFileList.push(fileObj.name as FileName)
      }
    })
    return resultFileList
  }

  getListOfFilesInRoot(): Promise<ListOfFileNames> {
    return this.getListOfFiles(this.pathFunctions.getAbsolutePathFromRoot(''))
  }

  private addPostInstallScriptToPackageObj(packageObj: PackageObjectType): PackageObjectType {
    if (!packageObj.scripts) {
      packageObj.scripts = {}
    }
    if (packageObj.scripts.postinstall) {
      output.info(
        'There is already a "postinstall" scripts in package.json - we cannot automatically add a sync script.'
      )
      return packageObj
    }
    packageObj.scripts.postinstall = this.postInstallScriptCommand
    return packageObj
  }

  async addPostInstallScriptToPackageJson(): Promise<void> {
    let packageObj = await this.packageFileFunctions.loadPackageJson()
    packageObj = this.addPostInstallScriptToPackageObj(packageObj)
    return this.packageFileFunctions.savePackageJson(packageObj)
  }

  addFilesToPackageObj(packageObj: PackageObjectType, files: ListOfFileNames): PackageObjectType {
    packageObj[PACKAGE_JSON_CONFIG_NAME].files = files
    return packageObj
  }

  addConfigNameToPackageObj(
    packageObj: PackageObjectType,
    configName: FileName
  ): PackageObjectType {
    packageObj[PACKAGE_JSON_CONFIG_NAME].configName = configName
    return packageObj
  }

  async doInit(initOptions: InitOptionsType): Promise<void> {
    // set up config folder
    this.pathFunctions.setConfigFolderRelativePath(initOptions.configFolderName)
    await this.pathFunctions.configFolderExistsOrCreate()

    // load up package.json
    let packageObj = await this.packageFileFunctions.loadPackageJson()
    if (!packageObj[PACKAGE_JSON_CONFIG_NAME]) {
      packageObj[PACKAGE_JSON_CONFIG_NAME] = {}
    }

    packageObj = this.addConfigNameToPackageObj(packageObj, initOptions.configFolderName)
    packageObj = this.addFilesToPackageObj(packageObj, initOptions.files)

    if (initOptions.postInstall) {
      await this.addPostInstallScriptToPackageJson()
    }

    if (initOptions.hideInVSCode) {
      await this.vsCodeFunctions.addFilesToExcludeToVSCode(initOptions.files)
      packageObj[PACKAGE_JSON_CONFIG_NAME].hideInVSCode = true
    }

    return this.packageFileFunctions.savePackageJson(packageObj)
  }
}
