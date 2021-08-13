import chalk from 'chalk'

type verbositySetting = number | 'SILENT' | 'INFO' | 'DEBUG'

class OutputFunctions {
  static verbosity: number = 1
  static SILENT: number = 0
  static INFO: number = 1 // used for "log", "info" and "error"
  static DEBUG: number = 2

  static INFO_STRING_PREFIX: string = ''
  static DEBUG_STRING_PREFIX: string = chalk.bgYellow('DEBUG:')
  static ERROR_STRING_PREFIX: string = chalk.bgRed('!')

  static show(verbosityLevel: number, ...args: any[]) {
    if (OutputFunctions.verbosity >= verbosityLevel) {
      console.log(...args)
    }
  }

  static info(...args: any[]) {
    OutputFunctions.show(OutputFunctions.INFO, this.INFO_STRING_PREFIX, ...args)
  }

  static log(...args: any[]) {
    // this is an alias of "info"
    OutputFunctions.info(...args)
  }

  static error(...args: any[]) {
    OutputFunctions.show(OutputFunctions.INFO, this.ERROR_STRING_PREFIX, ...args)
  }

  static debug(...args: any[]) {
    OutputFunctions.show(OutputFunctions.DEBUG, this.DEBUG_STRING_PREFIX, ...args)
  }

  static setVerbosity(newVerbosity: verbositySetting) {
    if (typeof newVerbosity === 'number') {
      OutputFunctions.verbosity = newVerbosity
    } else {
      switch (newVerbosity) {
        case 'SILENT':
          OutputFunctions.verbosity = OutputFunctions.SILENT
          return
        case 'DEBUG':
          OutputFunctions.verbosity = OutputFunctions.DEBUG
          return
        case 'INFO':
        default:
          OutputFunctions.verbosity = OutputFunctions.INFO
          return
      }
    }
  }
}

export default OutputFunctions
