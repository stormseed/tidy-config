#!/usr/bin/env node

import prompts, { Choice } from 'prompts'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'

import { ConfigFunctions } from '../lib/ConfigFunctions'
import { PackageFileFunctions } from '../lib/PackageFileFunctions'
import { VSCodeSettingsFunctions } from '../lib/VSCodeSettingsFunctions'
import { InitFunctions } from '../lib/InitFunctions'
import output from '../lib/OutputFunctions'
import { InitOptionsType } from '../lib/SharedTypesAndVars'

const parser = yargs(hideBin(process.argv))
  .usage('Usage: $0 [options]')
  .option('init', {
    alias: 'i',
    type: 'boolean',
    description: 'Sets up some initial settings in your package.json file',
  })
  .option('hydrate', {
    alias: 'h',
    type: 'boolean',
    description:
      'Attempts to populate package.json and the root folder with settings and files that are located in a configuration folder for the first time.',
  })
  .option('move', {
    alias: 'm',
    type: 'boolean',
    description:
      'Move any files listed in package.json in the setting tidyConfig.files setting from the project root folder into your configuration folder, leaving behind a symlink.',
  })
  .option('restore', {
    alias: 'r',
    type: 'boolean',
    description: 'Restore any configuration files that were moved from the root folder',
  })
  .option('vscode', {
    alias: 'v',
    type: 'boolean',
    description:
      'Update the workspace settings for Visual Studio Code to ignore any symlinked files that now reside in the configuration folder.',
  })
  .option('sync', {
    alias: 's',
    type: 'boolean',
    description:
      'Sync the settings between the root package.json and the package.yaml file located in the configuration folder',
  })
  .option('force', {
    alias: 'f',
    choices: ['json', 'yaml'],
    description:
      'When performing a package.json sync, force wither the root package.json file or the package.yaml in the configuration folder to be considered the master',
  })
  .option('debug', {
    type: 'boolean',
    description: 'Show tool debugging messages',
  })
  .option('quiet', {
    type: 'boolean',
    description: 'Hide output - good for automated usage',
  })
  .help()

const run = async () => {
  const argv = await parser.argv
  const configFunctions = new ConfigFunctions()
  const packageFileFunctions = new PackageFileFunctions()
  const vsCodeSettingsFunctions = new VSCodeSettingsFunctions()
  const initFunctions = new InitFunctions()

  if (argv.debug) {
    output.setVerbosity(output.DEBUG)
  }
  if (argv.quiet) {
    output.setVerbosity(output.SILENT)
  }
  if (argv.sync) {
    let result = 'both'
    if (argv.force && argv.force === 'json') {
      // result = 'json'
      await packageFileFunctions.doSync('json')
    } else if (argv.force && argv.force === 'yaml') {
      // result = 'readable'
      await packageFileFunctions.doSync('readable')
    } else {
      result = await packageFileFunctions.determineMasterFile()
      await packageFileFunctions.doSync()
    }
  } else if (argv.restore) {
    console.log('Restoring...')
    await configFunctions.fullRestoreFilesFromConfigFolder()
    // TODO: remove items from VSCode if needed
  } else if (argv.move) {
    await configFunctions.fullMoveFilesToConfigFolder()
    if (argv.vscode) {
      await vsCodeSettingsFunctions.addFilesToExcludeToVSCode(
        await packageFileFunctions.getListOfFilesFromPackage()
      )
    }
    // TODO: add items to VSCode if needed
  } else if (argv.hydrate) {
    await initFunctions.doHydrate()
  } else if (argv.init) {
    const realInvalidPathChars = new RegExp(/[<>:"\/\\|?*\x00-\x1F]/)
    const rawListOfRootFiles = await initFunctions.getListOfFilesInRoot()
    const rootFileChoices = [] as Choice[]
    rawListOfRootFiles.forEach((file) => {
      rootFileChoices.push({ title: file, value: file, selected: false })
    })
    const response = (await prompts([
      {
        type: 'text',
        name: 'configFolderName',
        message: 'What do you want to name your configuration folder?',
        initial: 'config',
        validate: (inputValue) => !realInvalidPathChars.test(inputValue),
      },
      {
        type: 'multiselect',
        name: 'files',
        choices: rootFileChoices,
        message: 'Choose which files to move into the configuration folder',
      },
      {
        type: 'confirm',
        name: 'postInstall',
        message:
          'Install a "postinstall" script to automatically update your package.yaml with changes from package.json after a yarn/npm install?',
        initial: true,
      },
      {
        type: 'confirm',
        name: 'hideInVSCode',
        message: 'Hide configuration files moved out of the root folder in Visual Studio Code?',
        initial: false,
      },
    ])) as InitOptionsType
    console.log(response)
    await initFunctions.doInit(response)
  }
}

run()
