import { format as prettierFormat, resolveConfig as prettierResolveConfig } from 'prettier'
import output from './OutputFunctions'

import { PathFunctions } from './PathFunctions'

export class PrettifyFunctions {
  pathFunctions: PathFunctions = new PathFunctions()

  constructor() {}

  async prettify(configText: string, parser: 'json' | 'json-stringify' | 'yaml'): Promise<string> {
    if (parser === 'json') {
      parser = 'json-stringify'
    }
    try {
      let options = await prettierResolveConfig(this.pathFunctions.getConfigFolderAbsolutePath())
      if (!options) {
        options = {}
      }
      // override some options to make it compliant with the JSON API parser
      options = { ...options, singleQuote: false, quoteProps: 'preserve', trailingComma: 'none' }
      output.debug('prettierOptions =  ', options)
      return prettierFormat(configText, { ...options, parser })
    } catch (err) {
      return configText
    }
  }

  async prettifyJson(jsonText: string): Promise<string> {
    return this.prettify(jsonText, 'json')
  }

  async prettifyYaml(yamlText: string): Promise<string> {
    return this.prettify(yamlText, 'yaml')
  }
}
