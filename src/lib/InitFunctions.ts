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
import { ConfigFunctions } from './ConfigFunctions'

export type HydrateStatusReportType = {
  ready: ListOfFileNames
  conflicted: ListOfFileNames
  missing: ListOfFileNames
}

export class InitFunctions {
  pathFunctions: PathFunctions = new PathFunctions()
  packageFileFunctions: PackageFileFunctions = new PackageFileFunctions()
  vsCodeFunctions: VSCodeSettingsFunctions = new VSCodeSettingsFunctions()
  configFunctions: ConfigFunctions = new ConfigFunctions()
  postInstallScriptCommand = 'clean-config --sync --force=json'

  constructor() {
    this.pathFunctions.setProjectRootPath(process.cwd())
  }

  async getListOfFiles(
    path: AbsolutePath,
    options: { includeSymlinks?: boolean; symlinksOnly?: boolean } = {}
  ): Promise<ListOfFileNames> {
    let resultFileList: ListOfFileNames = []
    const fileList = await fsPromises.readdir(path, { withFileTypes: true })
    fileList.forEach((fileObj) => {
      if (options.includeSymlinks || options.symlinksOnly) {
        if (fileObj.isSymbolicLink() && !ignoredRootFiles.includes(fileObj.name)) {
          resultFileList.push(fileObj.name as FileName)
        }
      } else if (
        !options.symlinksOnly &&
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

  getListOfLinksInRoot(): Promise<ListOfFileNames> {
    return this.getListOfFiles(this.pathFunctions.getAbsolutePathFromRoot(''), {
      symlinksOnly: true,
    })
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
    if (packageObj[PACKAGE_JSON_CONFIG_NAME]) {
      // do we already have a configuration defined in package.json?
      if (
        packageObj[PACKAGE_JSON_CONFIG_NAME].configName &&
        packageObj[PACKAGE_JSON_CONFIG_NAME].files &&
        packageObj[PACKAGE_JSON_CONFIG_NAME].files.length > 0
      ) {
        // there are already root files defined
        const hydrateStatus = await this.checkHydrateStatus(
          packageObj[PACKAGE_JSON_CONFIG_NAME].files
        )
        if (
          hydrateStatus.missing.length === 0 &&
          hydrateStatus.conflicted.length === 0 &&
          hydrateStatus.ready.length > 0
        ) {
          this.configFunctions.moveListOfFiles(hydrateStatus.ready, { hydrate: true })
        }
      }
    } else {
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

  async doHydrate(): Promise<void> {
    // set up config folder

    // load up package.json
    let packageObj = await this.packageFileFunctions.loadPackageJson()
    if (!packageObj[PACKAGE_JSON_CONFIG_NAME]) {
      Promise.reject('Tidy configuration not found in package.json.')
    }
    this.pathFunctions.setConfigFolderRelativePath(packageObj[PACKAGE_JSON_CONFIG_NAME].configName)

    if (
      packageObj[PACKAGE_JSON_CONFIG_NAME].configName &&
      packageObj[PACKAGE_JSON_CONFIG_NAME].files &&
      packageObj[PACKAGE_JSON_CONFIG_NAME].files.length > 0
    ) {
      // there are already root files defined
      const hydrateStatus = await this.checkHydrateStatus(packageObj)
      if (
        hydrateStatus.missing.length === 0 &&
        hydrateStatus.conflicted.length === 0 &&
        hydrateStatus.ready.length > 0
      ) {
        this.configFunctions.moveListOfFiles(hydrateStatus.ready, { hydrate: true })
      } else {
        if (hydrateStatus.missing.length > 0) {
          output.error(
            'The following files are listed in the tidy configuration in package.json but are not found in the configuration folder:'
          )
          output.error(hydrateStatus.missing.join(', '))
        }
        if (hydrateStatus.conflicted.length > 0) {
          output.error(
            'The following files are listed in the tidy configuration in package.json but already exist in the project root folder:'
          )
          output.error(hydrateStatus.conflicted.join(', '))
        }
        Promise.reject('There are issues with symlinking configuration files')
      }
    }

    // try to sync package.json
    if (packageObj[PACKAGE_JSON_CONFIG_NAME].configName) {
    }
  }

  async checkHydrateStatus(packageObj: PackageObjectType): Promise<HydrateStatusReportType> {
    const fileList = packageObj[PACKAGE_JSON_CONFIG_NAME].files as ListOfFileNames
    let filesInConfigDir = await this.getListOfFiles(
      this.pathFunctions.getAbsolutePathFromRoot(packageObj[PACKAGE_JSON_CONFIG_NAME].configName)
    )
    let linksInRootDir = await this.getListOfLinksInRoot()
    let report = { ready: [], conflicted: [], missing: [] } as HydrateStatusReportType
    fileList.forEach((fileName) => {
      const inConfig = filesInConfigDir.includes(fileName)
      const inRoot = linksInRootDir.includes(fileName)
      if (inConfig && inRoot) {
        report.conflicted.push(fileName)
      } else if (inConfig && !inRoot) {
        report.ready.push(fileName)
      } else if (!inConfig) {
        report.missing.push(fileName)
      }
    })
    return report
  }
}
