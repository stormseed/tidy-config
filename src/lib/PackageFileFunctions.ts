import * as path from 'path'
import { promises as fsPromises } from 'fs'
import YAML from 'yaml'
import jsYaml from 'js-yaml'
// import { yamlOverwrite } from 'yaml-diff-patch'
import { yamlOverwrite } from './yaml-diff-patch-mod'
import output from './OutputFunctions'

import {
  AbsolutePath,
  RelativePath,
  FileName,
  ListOfFileNames,
  PackageObjectType,
  PackageObjectVariationType,
  PACKAGE_JSON_CONFIG_NAME,
} from './SharedTypesAndVars'
import { PathFunctions } from './PathFunctions'
import { PackageObjectFunctions } from './PackageObjectFunctions'
import { PrettifyFunctions } from './PrettifyFunctions'

export class PackageFileFunctions {
  packageJsonFileName: FileName = 'package.json'
  packageYamlFileName: FileName = 'package.yaml'
  // projectRootPath: AbsolutePath = ''
  // configFolderRelativePath: RelativePath = 'config'
  // PACKAGE_JSON_CONFIG_NAME: string = 'cleanConfig'
  absolutePackageJsonPath: AbsolutePath = ''
  absolutePackageYamlPath: AbsolutePath = ''
  // packageJsonTimestampName: string = 'timestamp'
  // packageJsonHashName: string = 'hash'
  pathFunctions: PathFunctions = new PathFunctions()
  packObjFunc: PackageObjectFunctions = new PackageObjectFunctions()
  prettifyFunctions: PrettifyFunctions = new PrettifyFunctions()

  constructor() {
    this.absolutePackageJsonPath = this.getPackageJsonPath()
  }

  async loadPackageJson(): Promise<PackageObjectType> {
    try {
      const rawFileContent = await fsPromises.readFile(this.getPackageJsonPath(), {
        encoding: 'utf8',
      })
      return JSON.parse(rawFileContent)
    } catch (err) {
      output.error(err)
      return err
    }
  }

  async savePackageJson(packageObject: PackageObjectType): Promise<void> {
    const jsonString = JSON.stringify(packageObject)
    return fsPromises.writeFile(
      this.getPackageJsonPath(),
      await this.prettifyFunctions.prettifyJson(jsonString),
      {
        encoding: 'utf8',
      }
    )
  }

  async getListOfFilesFromPackage(): Promise<ListOfFileNames> {
    const packageJson = await this.loadPackageJson()
    if (packageJson[PACKAGE_JSON_CONFIG_NAME]?.files) {
      return Promise.resolve(packageJson[PACKAGE_JSON_CONFIG_NAME].files)
    }
    return Promise.reject('Config settings not found in package.json')
  }

  async loadPackageYaml(): Promise<YAML.Document> {
    try {
      const rawFileContent = await fsPromises.readFile(this.getPackageYamlPath(), {
        encoding: 'utf8',
      })
      return YAML.parseDocument(rawFileContent)
    } catch (err) {
      output.error(err)
      return err
    }
  }

  async loadPackageYamlAsJson(): Promise<PackageObjectType> {
    const tempObj = await jsYaml.load(await this.loadPackageYamlRaw(), {
      json: true,
      schema: jsYaml.JSON_SCHEMA,
    })
    if (typeof tempObj !== 'object') {
      Promise.reject('Problem loading and parsing YAML file')
    } else {
      return Promise.resolve(tempObj as PackageObjectType)
    }
    return {}
  }

  async loadPackageYamlRaw(): Promise<string> {
    return await fsPromises.readFile(this.getPackageYamlPath(), {
      encoding: 'utf8',
    })
  }

  async savePackageYaml(packageObject: PackageObjectType): Promise<void> {
    const yamlString = YAML.stringify(packageObject)
    return fsPromises.writeFile(this.getPackageYamlPath(), yamlString, {
      encoding: 'utf8',
    })
  }

  async mergePackageJsonToYaml(): Promise<void> {
    let packageObject = await this.loadPackageJson()
    packageObject = this.packObjFunc.addHashToPackageObject(packageObject)
    packageObject = this.packObjFunc.addTimestampToPackageObject(packageObject)

    // check if YAML file exists
    if (!(await this.pathFunctions.fileExists(this.getPackageYamlPath()))) {
      output.debug('YAML file does not exist.')
      await this.createNewYamlFile(this.packObjFunc.getJsonPackageObject())
    }

    const yamlString = await this.loadPackageYamlRaw()
    let newYamlString = yamlOverwrite(yamlString, packageObject)
    newYamlString = await this.prettifyFunctions.prettify(newYamlString, 'yaml')
    await fsPromises.writeFile(this.getPackageYamlPath(), newYamlString, {
      encoding: 'utf8',
    })
    let newJsonString = await this.prettifyFunctions.prettify(JSON.stringify(packageObject), 'json')
    return fsPromises.writeFile(this.getPackageJsonPath(), newJsonString, {
      encoding: 'utf8',
    })
  }

  async overwritePackageJsonFromYaml(): Promise<void> {
    if (!(await this.pathFunctions.fileExists(this.getPackageYamlPath()))) {
      return Promise.reject('YAML file does not exist.')
    }
    let readable = await this.loadPackageYamlAsJson()
    // TODO: checksums
    this.packObjFunc.setReadablePackageObject(await this.loadPackageYamlAsJson())
    if (!this.packObjFunc.readableHashIsCorrect()) {
      // file has changed since last hash calculation so let's update it
      readable = this.packObjFunc.addHashToPackageObject(readable)
      readable = this.packObjFunc.addTimestampToPackageObject(readable)
    }
    return this.savePackageJson(readable)
  }

  getPackageJsonPath(): AbsolutePath {
    return this.pathFunctions.getAbsolutePathFromRoot(this.packageJsonFileName)
  }

  getPackageYamlPath(): AbsolutePath {
    return path.join(this.pathFunctions.getConfigFolderAbsolutePath(), this.packageYamlFileName)
  }

  async createNewYamlFile(jsonToWrite: PackageObjectType = {}): Promise<void> {
    await this.pathFunctions.configFolderExistsOrCreate()
    // create an empty YAML file
    return fsPromises.writeFile(
      this.getPackageYamlPath(),
      jsYaml.dump(jsonToWrite, { schema: jsYaml.JSON_SCHEMA })
    )
  }

  async determineMasterFile(): Promise<PackageObjectVariationType> {
    const jsonPath = this.getPackageJsonPath()
    const readablePath = this.getPackageYamlPath()
    const jsonExists = await this.pathFunctions.fileExists(jsonPath)
    if (!jsonExists) {
      // no package.json file? Yeah, this isn't going to work
      return Promise.reject('No package.json detected')
    }

    this.packObjFunc.setJsonPackageObject(await this.loadPackageJson())

    // const yamlExists = await this.pathFunctions.fileExists(readablePath)
    // if (!yamlExists) {
    if (!(await this.pathFunctions.fileExists(readablePath))) {
      output.debug('YAML file does not exist.')
      await this.createNewYamlFile(this.packObjFunc.getJsonPackageObject())
      return Promise.resolve('json')
    }

    this.packObjFunc.setReadablePackageObject(await this.loadPackageYamlAsJson())
    const timestampWinner = this.packObjFunc.getNewerPackageObject()
    if (timestampWinner !== 'equal') {
      output.debug('Timestamps are equal.')
      return timestampWinner
    }

    // timestamps are equal so check the checksums
    const jsonHashCorrect = this.packObjFunc.jsonHashIsCorrect()
    const readableHashCorrect = this.packObjFunc.readableHashIsCorrect()
    output.debug('Checking if hashes are correct: ', { jsonHashCorrect, readableHashCorrect })
    if (jsonHashCorrect && readableHashCorrect) {
      // the hashes are correct in both files, so assume they don't have changed data in them
      if (this.packObjFunc.savedHashesAreEqual()) {
        return 'equal'
      } else {
        // the hashes are not equal, so we assume that package.json has been altered
        return 'json'
      }
    } else if (!jsonHashCorrect && !readableHashCorrect) {
      return 'both'
    } else if (jsonHashCorrect && !readableHashCorrect) {
      return 'readable'
    } else {
      return 'json'
    }
  }

  async doSync(masterFile?: PackageObjectVariationType): Promise<void> {
    if (!masterFile) {
      masterFile = await this.determineMasterFile()
    }
    switch (masterFile) {
      case 'json': {
        await this.mergePackageJsonToYaml()
        break
      }
      case 'readable': {
        await this.overwritePackageJsonFromYaml()
        break
      }
      case 'equal': {
        output.log('The package files have the same data.')
        break
      }
      case 'both': {
        output.error(
          'Both files have been altered.',
          'A merge likely cannot be done without losing data.',
          'You can override this by using the --force=json or --force=yaml flags when running this command again.'
        )
      }
    }
    return
  }
}
