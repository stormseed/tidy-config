import * as path from 'path'
import { promises as fsPromises } from 'fs'
import { AbsolutePath, RelativePath, ListOfFileNames } from './SharedTypesAndVars'
import output from './OutputFunctions'
import { PathFunctions } from './PathFunctions'
import { PackageFileFunctions } from './PackageFileFunctions'

export class ConfigFunctions {
  projectRootPath: AbsolutePath = ''
  configFolderRelativePath: RelativePath = 'config'
  // PACKAGE_JSON_CONFIG_NAME: string = 'cleanConfig'
  pathFunctions: PathFunctions = new PathFunctions()
  packageFileFunctions: PackageFileFunctions = new PackageFileFunctions()

  constructor() {
    this.pathFunctions.setProjectRootPath(process.cwd())
  }

  async moveListOfFiles(
    fileList: ListOfFileNames,
    options?: { restore?: boolean; hydrate?: boolean }
  ) {
    try {
      await this.pathFunctions.configFolderExistsOrCreate()
    } catch (err) {
      return err
    }
    const configAbsolutePath = this.pathFunctions.getConfigFolderAbsolutePath()
    for (let fileName of fileList) {
      let pathToFileInRootDir = this.pathFunctions.getAbsolutePathFromRoot(fileName)
      if (options?.restore) {
        let pathToFileInConfigDir = this.pathFunctions.getAbsolutePath(configAbsolutePath, fileName)
        output.debug({ pathToFileInRootDir, pathToFileInConfigDir })
        if (
          (await this.linkExists(pathToFileInRootDir)) &&
          (await this.fileExistsAndNotALink(pathToFileInConfigDir))
        ) {
          output.info(`Restoring file ${fileName}`)
          await this.restoreFile(pathToFileInConfigDir, this.projectRootPath)
        } else {
          output.debug('restoring file did not pass tests')
          output.debug(
            'this.linkExists(pathToFileInRootDir)',
            await this.linkExists(pathToFileInRootDir)
          )
        }
      } else if (options?.hydrate) {
        let pathToFileInConfigDir = this.pathFunctions.getAbsolutePath(configAbsolutePath, fileName)
        if (
          !(await this.linkExists(pathToFileInRootDir)) &&
          (await this.fileExistsAndNotALink(pathToFileInConfigDir))
        ) {
          output.info(`Creating root symlink for ${pathToFileInConfigDir}`)
          await this.createRelativeSymlink(pathToFileInRootDir, pathToFileInConfigDir)
        }
      } else {
        if (await this.fileExistsAndNotALink(pathToFileInRootDir)) {
          output.info(`Moving file ${fileName}`)
          await this.moveAndLeaveSymlink(pathToFileInRootDir, configAbsolutePath)
        }
      }
    }
  }

  async createRelativeSymlink(
    originalFilePath: AbsolutePath,
    newPath: AbsolutePath
  ): Promise<void> {
    return fsPromises.symlink(
      path.join(
        this.pathFunctions.getRelativePathFromAbsoluteFilePaths(originalFilePath, newPath),
        path.basename(originalFilePath)
      ),
      originalFilePath
    )
  }

  async fileExistsAndNotALink(filePath: AbsolutePath): Promise<boolean> {
    let fileStat
    try {
      fileStat = await fsPromises.stat(filePath)
    } catch (e) {
      return false
    }
    return !fileStat.isSymbolicLink()
  }

  async linkExists(filePath: AbsolutePath): Promise<boolean> {
    let fileStat
    try {
      fileStat = await fsPromises.lstat(filePath)
    } catch (e) {
      return false
    }
    return fileStat.isSymbolicLink()
  }

  async moveAndLeaveSymlink(
    originalFilePath: AbsolutePath,
    targetFolder: AbsolutePath
  ): Promise<void> {
    output.debug('moveAndLeaveSymlink called', {
      originalFilePath,
      targetFolder,
    })
    const newPath = this.calculateNewFilePath(originalFilePath, targetFolder)
    output.debug('New file location = ', newPath)
    await fsPromises.rename(originalFilePath, newPath)
    output.debug('calling symlink with ', {
      path: path.join(
        this.pathFunctions.getRelativePathFromAbsoluteFilePaths(originalFilePath, newPath),
        path.basename(originalFilePath)
      ),
      target: originalFilePath,
    })
    // await fsPromises.symlink(
    //   path.join(
    //     this.pathFunctions.getRelativePathFromAbsoluteFilePaths(originalFilePath, newPath),
    //     path.basename(originalFilePath)
    //   ),
    //   originalFilePath
    // )
    await this.createRelativeSymlink(originalFilePath, newPath)
    return
  }

  async restoreFile(movedFilePath: AbsolutePath, targetFolder: AbsolutePath): Promise<void> {
    const newPath = this.calculateNewFilePath(movedFilePath, targetFolder)
    output.debug('restoreFile newPath: ', newPath)
    await fsPromises.unlink(newPath)
    await fsPromises.rename(movedFilePath, newPath)
    return
  }

  calculateNewFilePath(
    originalFileNamePath: AbsolutePath,
    targetDirectory: AbsolutePath
  ): AbsolutePath {
    return path.join(targetDirectory, path.basename(originalFileNamePath))
  }

  async fullMoveFilesToConfigFolder(): Promise<void> {
    try {
      const listOfPackages = await this.packageFileFunctions.getListOfFilesFromPackage()
      await this.moveListOfFiles(listOfPackages)
    } catch (err) {
      output.error(err)
      return err
    }
  }

  async fullRestoreFilesFromConfigFolder(): Promise<void> {
    try {
      const listOfPackages = await this.packageFileFunctions.getListOfFilesFromPackage()
      await this.moveListOfFiles(listOfPackages, { restore: true })
    } catch (err) {
      output.error(err)
      return err
    }
  }

  async hydrateSymlinksFromConfigFolder(): Promise<void> {
    try {
      const listOfPackages = await this.packageFileFunctions.getListOfFilesFromPackage()
      await this.moveListOfFiles(listOfPackages, { hydrate: true })
    } catch (err) {
      output.error(err)
      return err
    }
  }
}
