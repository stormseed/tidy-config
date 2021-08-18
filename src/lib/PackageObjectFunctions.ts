import objectHash from 'object-hash'
import output from './OutputFunctions'

import {
  PackageObjectType,
  TimestampType,
  PackageObjectVariationType,
  HashType,
  PACKAGE_JSON_CONFIG_NAME,
} from './SharedTypesAndVars'

export class PackageObjectFunctions {
  packageJsonTimestampName: string = 'timestamp'
  packageJsonHashName: string = 'hash'
  jsonPackageObject: PackageObjectType = {}
  readablePackageObject: PackageObjectType = {}
  jsonPackageObjectIsSet: boolean = false
  readablePackageObjectIsSet: boolean = false
  currentTimestamp: TimestampType = 0

  constructor() {}

  setJsonPackageObject(packageObject: PackageObjectType): PackageObjectFunctions {
    this.jsonPackageObject = packageObject
    this.jsonPackageObjectIsSet = true
    return this
  }

  setReadablePackageObject(packageObject: PackageObjectType): PackageObjectFunctions {
    this.readablePackageObject = packageObject
    this.readablePackageObjectIsSet = true
    return this
  }

  getJsonPackageObject(): PackageObjectType {
    return this.jsonPackageObject
  }

  getReadablePackageObject(): PackageObjectType {
    return this.readablePackageObject
  }

  addTimestampToPackageObject(
    packageObject: PackageObjectType,
    timestamp?: TimestampType
  ): PackageObjectType {
    if (!timestamp || timestamp === 0) {
      timestamp = this.getCurrentTimestamp()
    }
    packageObject[PACKAGE_JSON_CONFIG_NAME][this.packageJsonTimestampName] = timestamp
    return packageObject
  }

  addHashToPackageObject(packageObject: PackageObjectType, hash?: HashType): PackageObjectType {
    if (!hash) {
      hash = this.generatePackageObjectHash(packageObject)
    }
    packageObject[PACKAGE_JSON_CONFIG_NAME][this.packageJsonHashName] = hash
    return packageObject
  }

  generatePackageObjectHash(packageObject: PackageObjectType): HashType {
    return objectHash(this.getCleanPackageObject(packageObject))
  }

  getSavedPackageObjectTimestamp(packageObject: PackageObjectType): TimestampType {
    if (packageObject?.[PACKAGE_JSON_CONFIG_NAME]?.[this.packageJsonTimestampName]) {
      return packageObject[PACKAGE_JSON_CONFIG_NAME][this.packageJsonTimestampName]
    } else {
      return 0
    }
  }

  getSavedPackageObjectHash(packageObject: PackageObjectType): HashType {
    if (packageObject?.[PACKAGE_JSON_CONFIG_NAME]?.[this.packageJsonHashName]) {
      return packageObject[PACKAGE_JSON_CONFIG_NAME][this.packageJsonHashName]
    } else {
      return ''
    }
  }

  getOrGeneratePackageObjectHash(packageObject: PackageObjectType): HashType {
    const savedHash = this.getSavedPackageObjectHash(packageObject)
    if (savedHash.length > 0) {
      return savedHash
    } else {
      return this.generatePackageObjectHash(packageObject)
    }
  }

  removeHashFromPackageObject(packageObject: PackageObjectType): PackageObjectType {
    if (packageObject[PACKAGE_JSON_CONFIG_NAME]?.[this.packageJsonHashName]) {
      delete packageObject[PACKAGE_JSON_CONFIG_NAME][this.packageJsonHashName]
    }
    return packageObject
  }

  removeTimestampFromPackageObject(packageObject: PackageObjectType): PackageObjectType {
    if (packageObject[PACKAGE_JSON_CONFIG_NAME]?.[this.packageJsonTimestampName]) {
      delete packageObject[PACKAGE_JSON_CONFIG_NAME][this.packageJsonTimestampName]
    }
    return packageObject
  }

  getCleanPackageObject(packageObject: PackageObjectType): PackageObjectType {
    packageObject = this.removeHashFromPackageObject(packageObject)
    packageObject = this.removeTimestampFromPackageObject(packageObject)
    return packageObject
  }

  getCurrentTimestamp(): TimestampType {
    if (this.currentTimestamp === 0) {
      this.currentTimestamp = Math.floor(Date.now() / 1000)
    }
    return this.currentTimestamp
  }

  getNewerPackageObject(): PackageObjectVariationType {
    if (!this.bothPackageObjectsSet()) {
      throw 'Both package objects need to be set'
    }
    const jsonTimestamp = this.getSavedPackageObjectTimestamp(this.jsonPackageObject)
    const readableTimestamp = this.getSavedPackageObjectTimestamp(this.readablePackageObject)
    output.debug('getNewerPackageObject() has ', { jsonTimestamp, readableTimestamp })
    if (jsonTimestamp > readableTimestamp) {
      return 'json'
    } else if (jsonTimestamp < readableTimestamp) {
      return 'readable'
    } else {
      return 'equal'
    }
  }

  bothPackageObjectsSet(): boolean {
    return this.jsonPackageObjectIsSet && this.readablePackageObjectIsSet
  }

  savedHashesAreEqual(): boolean {
    if (!this.bothPackageObjectsSet()) {
      throw 'Both package objects need to be set'
    }
    return (
      this.getSavedPackageObjectHash(this.readablePackageObject) ===
      this.getSavedPackageObjectHash(this.jsonPackageObject)
    )
  }

  generatedHashesAreEqual(): boolean {
    if (!this.bothPackageObjectsSet()) {
      throw 'Both package objects need to be set'
    }
    return (
      this.generatePackageObjectHash(this.readablePackageObject) ===
      this.generatePackageObjectHash(this.jsonPackageObject)
    )
  }

  savedHashIsCorrect(packageObject: PackageObjectType): boolean {
    const savedHash = this.getSavedPackageObjectHash(packageObject)
    const newHash = this.generatePackageObjectHash(packageObject)
    return savedHash === newHash
  }

  jsonHashIsCorrect(): boolean {
    return this.savedHashIsCorrect(this.jsonPackageObject)
  }

  readableHashIsCorrect(): boolean {
    return this.savedHashIsCorrect(this.readablePackageObject)
  }
}
