import { promises as fsPromises } from 'fs'
import path from 'path'
import output from './OutputFunctions'

import {
  AbsolutePath,
  RelativePath,
  ListOfFileNames,
  VSCodeSettingsType,
} from './SharedTypesAndVars'
import { PathFunctions } from './PathFunctions'
import { PrettifyFunctions } from './PrettifyFunctions'

export class VSCodeSettingsFunctions {
  absoluteVSCodeSettingsPath: AbsolutePath = ''
  relativeVSCodeSettingsPath: RelativePath = '.vscode/settings.json'
  excludeKeyName: string = 'files.exclude'
  pathFunctions: PathFunctions = new PathFunctions()
  prettifyFunctions: PrettifyFunctions = new PrettifyFunctions()
  vsCodeSettings: VSCodeSettingsType = {}

  constructor() {
    this.absoluteVSCodeSettingsPath = this.getVSCodeSettingsPath()
  }

  private getVSCodeSettingsPath(): AbsolutePath {
    return this.pathFunctions.getAbsolutePathFromRoot(this.relativeVSCodeSettingsPath)
  }

  private getVSCodeFolderPath(): AbsolutePath {
    return path.dirname(this.getVSCodeSettingsPath())
  }

  private async loadVSCodeSettings(): Promise<void> {
    await this.pathFunctions.folderExistsOrCreate(this.getVSCodeFolderPath())
    try {
      if (await this.pathFunctions.fileExists(this.absoluteVSCodeSettingsPath)) {
        this.vsCodeSettings = JSON.parse(
          await fsPromises.readFile(this.absoluteVSCodeSettingsPath, {
            encoding: 'utf8',
          })
        )
      } else {
        this.vsCodeSettings = {}
      }
    } catch (err) {
      output.error(err)
      return err
    }
  }

  private async saveVSCodeSettings(): Promise<void> {
    const prettySettings = await this.prettifyFunctions.prettifyJson(
      JSON.stringify(this.vsCodeSettings)
    )
    return fsPromises.writeFile(this.absoluteVSCodeSettingsPath, prettySettings)
  }

  private addFilesToExcludeSettings(filenames: ListOfFileNames): void {
    if (!this.vsCodeSettings[this.excludeKeyName]) {
      this.vsCodeSettings[this.excludeKeyName] = {}
    }
    for (let filename of filenames) {
      this.vsCodeSettings[this.excludeKeyName]['./' + filename] = true
    }
  }

  async addFilesToExcludeToVSCode(filenames: ListOfFileNames): Promise<void> {
    await this.loadVSCodeSettings()
    this.addFilesToExcludeSettings(filenames)
    return this.saveVSCodeSettings()
  }
}
