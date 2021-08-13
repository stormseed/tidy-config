import { AbsolutePath, FileName, RelativePath } from './SharedTypesAndVars'
import path from 'path'
import { promises as fsPromises } from 'fs'

export class PathFunctions {
  projectRootPath: AbsolutePath = ''
  configFolderRelativePath: RelativePath = 'config'

  constructor() {
    this.setProjectRootPath(process.cwd())
  }

  calculateNewFilePath(
    originalFileNamePath: AbsolutePath,
    targetDirectory: AbsolutePath
  ): AbsolutePath {
    return path.join(targetDirectory, path.basename(originalFileNamePath))
  }

  getRelativePathFromAbsoluteFilePaths(
    originalFile: AbsolutePath,
    targetFile: AbsolutePath
  ): RelativePath {
    return path.relative(path.dirname(originalFile), path.dirname(targetFile))
  }

  async folderExistsOrCreate(folderPath: AbsolutePath): Promise<void> {
    let fileStat
    try {
      fileStat = await fsPromises.stat(folderPath)
      if (!fileStat.isDirectory()) {
        throw new Error()
      }
      return Promise.resolve()
    } catch (e) {
      try {
        await fsPromises.mkdir(folderPath, { recursive: true })
        return Promise.resolve()
      } catch (e) {
        return Promise.reject('Folder does not exist and can not be created')
      }
    }
  }

  async configFolderExistsOrCreate(): Promise<void> {
    return this.folderExistsOrCreate(this.getConfigFolderAbsolutePath())
  }

  setProjectRootPath(folderPath: AbsolutePath) {
    this.projectRootPath = folderPath
  }

  setConfigFolderRelativePath(folderPath: AbsolutePath) {
    this.configFolderRelativePath = folderPath
  }

  getAbsolutePath(pathBase: AbsolutePath, fileOrPath: FileName | RelativePath) {
    return path.join(pathBase, fileOrPath)
  }

  getAbsolutePathFromRoot(fileOrPath: FileName | RelativePath): AbsolutePath {
    return this.getAbsolutePath(this.projectRootPath, fileOrPath)
  }

  getConfigFolderAbsolutePath() {
    return this.getAbsolutePathFromRoot(this.configFolderRelativePath)
  }

  async fileExists(filePath: AbsolutePath): Promise<boolean> {
    try {
      const fileStat = await fsPromises.stat(filePath)
      if (fileStat.isFile()) {
        return Promise.resolve(true)
      }
      return Promise.resolve(false)
    } catch (e) {
      return Promise.resolve(false)
    }
  }

  async folderExists(folderPath: AbsolutePath): Promise<boolean> {
    try {
      const fileStat = await fsPromises.stat(folderPath)
      if (fileStat.isDirectory()) {
        return Promise.resolve(true)
      }
      return Promise.resolve(false)
    } catch (e) {
      return Promise.resolve(false)
    }
  }
}
