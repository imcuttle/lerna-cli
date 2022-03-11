'use strict'

const npa = require('npm-package-arg')
const path = require('path')
const cloneDeep = require('lodash.clonedeep')
const loadJsonFile = require('load-json-file')
const writePkg = require('write-pkg')
const fs = require('fs')
const nps = require('path')

// symbol used to "hide" internal state
const PKG = Symbol('pkg')

function modifyDependencies(deps, dir) {
  if (!deps) {
    return
  }
  for (const [name, version] of Object.entries(deps)) {
    deps[name] = makePublishDependency(name, version, dir)
  }
}

function modifyDependenciesBeforeSerialize(normalizedDeps, rawDeps, dir) {
  if (!normalizedDeps || !rawDeps) {
    return
  }
  for (const [name] of Object.entries(normalizedDeps)) {
    const depSpec = rawDeps[name]
    if (!depSpec || !depSpec.startsWith('workspace:')) {
      continue
    }
    if (isLocalPathSpec(depSpec) || parseWorkspaceVersionAlias(depSpec)) {
      normalizedDeps[name] = depSpec
    }
  }
}

const tryReadPkg = (projectDir) => {
  try {
    return JSON.parse(fs.readFileSync(nps.join(projectDir, 'package.json'), 'utf-8'))
  } catch (e) {
    return null
  }
}

const isLocalPathSpec = (depSpec) => {
  return depSpec.startsWith('workspace:./') || depSpec.startsWith('workspace:../')
}

const parseWorkspaceVersionAlias = (depSpec) => {
  const versionAliasSpecParts = /^workspace:([^@]+@)?([\^~*])$/.exec(depSpec)
  if (versionAliasSpecParts != null) {
    const semverRangeToken = versionAliasSpecParts[2] !== '*' ? versionAliasSpecParts[2] : ''
    return {
      semverRangeToken
    }
  }
}

// Copied from @pnpm/exportable-manifest
function makePublishDependency(depName, depSpec, dir) {
  if (!depSpec.startsWith('workspace:')) {
    return depSpec
  }
  // Dependencies with bare "*", "^" and "~" versions
  const parsed = parseWorkspaceVersionAlias(depSpec)
  if (parsed) {
    const manifest = tryReadPkg(nps.join(dir, 'node_modules', depName))
    if (manifest == null || !manifest.version) {
      throw new Error(
        `Cannot resolve workspace protocol of dependency "${depName}" ` +
          'because this dependency is not installed. Try running "pnpm install".'
      )
    }
    const semverRangeToken = parsed.semverRangeToken
    if (depName !== manifest.name) {
      return `npm:${manifest.name}@${semverRangeToken}${manifest.version}`
    }
    return `${semverRangeToken}${manifest.version}`
  }
  if (isLocalPathSpec(depSpec)) {
    const manifest = tryReadPkg(nps.join(dir, depSpec.substr(10)))
    if (manifest == null || !manifest.name || !manifest.version) {
      throw new Error(
        `Cannot resolve workspace protocol of dependency "${depName}" ` +
          'because this dependency is not installed. Try running "pnpm install".'
      )
    }
    if (manifest.name === depName) return `${manifest.version}`
    return `npm:${manifest.name}@${manifest.version}`
  }
  depSpec = depSpec.substr(10)
  if (depSpec.includes('@')) {
    return `npm:${depSpec}`
  }
  return depSpec
}

const RAW_PKG = Symbol('rawPkg')

const normalizePkg = (pkg, cwd) => {
  for (const depsField of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    modifyDependencies(pkg[depsField], cwd)
  }
}

/* eslint-disable no-underscore-dangle */

// private fields
const _location = Symbol('location')
const _resolved = Symbol('resolved')
const _rootPath = Symbol('rootPath')
const _scripts = Symbol('scripts')
const _contents = Symbol('contents')

/**
 * @param {import("npm-package-arg").Result} result
 */
function binSafeName({ name, scope }) {
  return scope ? name.substring(scope.length + 1) : name
}

// package.json files are not that complicated, so this is intentionally naïve
function shallowCopy(json) {
  return Object.keys(json).reduce((obj, key) => {
    const val = json[key]

    /* istanbul ignore if */
    if (Array.isArray(val)) {
      obj[key] = val.slice()
    } else if (val && typeof val === 'object') {
      obj[key] = Object.assign({}, val)
    } else {
      obj[key] = val
    }

    return obj
  }, {})
}

/**
 * @typedef {object} RawManifest The subset of package.json properties that Lerna uses
 * @property {string} name
 * @property {string} version
 * @property {boolean} [private]
 * @property {Record<string, string>|string} [bin]
 * @property {Record<string, string>} [scripts]
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [devDependencies]
 * @property {Record<string, string>} [optionalDependencies]
 * @property {Record<string, string>} [peerDependencies]
 * @property {Record<'directory' | 'registry' | 'tag', string>} [publishConfig]
 * @property {string[] | { packages: string[] }} [workspaces]
 */

/**
 * Lerna's internal representation of a local package, with
 * many values resolved directly from the original JSON.
 */
class PatchedPackage {
  /**
   * Create a Package instance from parameters, possibly reusing existing instance.
   * @param {string|PatchedPackage|RawManifest} ref A path to a package.json file, Package instance, or JSON object
   * @param {string} [dir] If `ref` is a JSON object, this is the location of the manifest
   * @returns {PatchedPackage}
   */
  static lazy(ref, dir = '.') {
    if (typeof ref === 'string') {
      const location = path.resolve(path.basename(ref) === 'package.json' ? path.dirname(ref) : ref)
      const manifest = loadJsonFile.sync(path.join(location, 'package.json'))

      return new PatchedPackage(manifest, location)
    }

    // don't use instanceof because it fails across nested module boundaries
    if ('__isLernaPackage' in ref) {
      return ref
    }

    // assume ref is a json object
    return new PatchedPackage(ref, dir)
  }

  /**
   * @param {RawManifest} pkg
   * @param {string} location
   * @param {string} [rootPath]
   */
  constructor(pkg, location, rootPath = location) {
    // npa will throw an error if the name is invalid
    const resolved = npa.resolve(pkg.name, `file:${path.relative(rootPath, location)}`, rootPath)
    this[_location] = location
    this[_resolved] = resolved
    this[_rootPath] = rootPath
    this[_scripts] = { ...pkg.scripts }

    this.name = pkg.name
    this.setPkg(pkg)

    // omit raw pkg from default util.inspect() output, but preserve internal mutability
    Object.defineProperty(this, PKG, { enumerable: false, writable: true })
  }

  setPkg(pkg) {
    this[RAW_PKG] = cloneDeep(pkg)

    const normalizedPkg = pkg
    normalizePkg(normalizedPkg, this.location)
    this[PKG] = normalizedPkg
  }

  // readonly getters
  get location() {
    return this[_location]
  }

  get private() {
    return Boolean(this[PKG].private)
  }

  get resolved() {
    return this[_resolved]
  }

  get rootPath() {
    return this[_rootPath]
  }

  get scripts() {
    return this[_scripts]
  }

  get bin() {
    const pkg = this[PKG]
    return typeof pkg.bin === 'string'
      ? {
          [binSafeName(this.resolved)]: pkg.bin
        }
      : Object.assign({}, pkg.bin)
  }

  get binLocation() {
    return path.join(this.location, 'node_modules', '.bin')
  }

  get manifestLocation() {
    return path.join(this.location, 'package.json')
  }

  get nodeModulesLocation() {
    return path.join(this.location, 'node_modules')
  }

  // eslint-disable-next-line class-methods-use-this
  get __isLernaPackage() {
    // safer than instanceof across module boundaries
    return true
  }

  // accessors
  get version() {
    return this[PKG].version
  }

  set version(version) {
    this[PKG].version = version
  }

  get contents() {
    // if modified with setter, use that value
    if (this[_contents]) {
      return this[_contents]
    }

    // if provided by pkg.publishConfig.directory value
    if (this[PKG].publishConfig && this[PKG].publishConfig.directory) {
      return path.join(this.location, this[PKG].publishConfig.directory)
    }

    // default to package root
    return this.location
  }

  set contents(subDirectory) {
    this[_contents] = path.join(this.location, subDirectory)
  }

  // "live" collections
  get dependencies() {
    return this[PKG].dependencies
  }

  get devDependencies() {
    return this[PKG].devDependencies
  }

  get optionalDependencies() {
    return this[PKG].optionalDependencies
  }

  get peerDependencies() {
    return this[PKG].peerDependencies
  }

  /**
   * Map-like retrieval of arbitrary values
   * @template {keyof RawManifest} K
   * @param {K} key field name to retrieve value
   * @returns {RawManifest[K]} value stored under key, if present
   */
  get(key) {
    return this[PKG][key]
  }

  /**
   * Map-like storage of arbitrary values
   * @template {keyof RawManifest} K
   * @param {T} key field name to store value
   * @param {RawManifest[K]} val value to store
   * @returns {PatchedPackage} instance for chaining
   */
  set(key, val) {
    this[PKG][key] = val

    return this
  }

  /**
   * Provide shallow copy for munging elsewhere
   * @returns {Object}
   */
  toJSON() {
    return shallowCopy(this[PKG])
  }

  /**
   * Refresh internal state from disk (e.g., changed by external lifecycles)
   */
  refresh() {
    return loadJsonFile(this.manifestLocation).then((pkg) => {
      this.setPkg(pkg)

      return this
    })
  }

  /**
   * Write manifest changes to disk
   * @returns {Promise} resolves when write finished
   */
  serialize() {
    const normalizedPkg = cloneDeep(this[PKG])
    for (const depsField of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      modifyDependenciesBeforeSerialize(normalizedPkg[depsField], this[RAW_PKG][depsField], this.location)
    }

    return writePkg(this.manifestLocation, normalizedPkg).then(() => this)
  }

  /**
   * Mutate local dependency spec according to type
   * @param {Object} resolved npa metadata
   * @param {String} depVersion semver
   * @param {String} savePrefix npm_config_save_prefix
   */
  updateLocalDependency(resolved, depVersion, savePrefix) {
    const depName = resolved.name

    // first, try runtime dependencies
    let depCollection = this.dependencies

    // try optionalDependencies if that didn't work
    if (!depCollection || !depCollection[depName]) {
      depCollection = this.optionalDependencies
    }

    // fall back to devDependencies
    if (!depCollection || !depCollection[depName]) {
      depCollection = this.devDependencies
    }

    if (resolved.registry || resolved.type === 'directory') {
      // a version (1.2.3) OR range (^1.2.3) OR directory (file:../foo-pkg)
      depCollection[depName] = `${savePrefix}${depVersion}`
    } else if (resolved.gitCommittish) {
      // a git url with matching committish (#v1.2.3 or #1.2.3)
      const [tagPrefix] = /^\D*/.exec(resolved.gitCommittish)

      // update committish
      const { hosted } = resolved // take that, lint!
      hosted.committish = `${tagPrefix}${depVersion}`

      // always serialize the full url (identical to previous resolved.saveSpec)
      depCollection[depName] = hosted.toString({ noGitPlus: false, noCommittish: false })
    } else if (resolved.gitRange) {
      // a git url with matching gitRange (#semver:^1.2.3)
      const { hosted } = resolved // take that, lint!
      hosted.committish = `semver:${savePrefix}${depVersion}`

      // always serialize the full url (identical to previous resolved.saveSpec)
      depCollection[depName] = hosted.toString({ noGitPlus: false, noCommittish: false })
    }
  }
}

module.exports.Package = PatchedPackage
