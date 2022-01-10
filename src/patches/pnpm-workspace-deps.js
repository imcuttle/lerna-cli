const nps = require('path')
const fs = require('fs')
const cloneDeep = require('lodash.clonedeep')

function modifyDependencies(deps, dir) {
  if (!deps) {
    return
  }
  for (const [name, version] of Object.entries(deps)) {
    deps[name] = makePublishDependency(name, version, dir)
  }
}

const tryReadPkg = (projectDir) => {
  try {
    return JSON.parse(fs.readFileSync(nps.join(projectDir, 'package.json'), 'utf-8'))
  } catch (e) {
    return null
  }
}

// Copied from @pnpm/exportable-manifest
function makePublishDependency(depName, depSpec, dir) {
  if (!depSpec.startsWith('workspace:')) {
    return depSpec
  }
  // Dependencies with bare "*", "^" and "~" versions
  const versionAliasSpecParts = /^workspace:([^@]+@)?([\^~*])$/.exec(depSpec)
  if (versionAliasSpecParts != null) {
    const manifest = tryReadPkg(nps.join(dir, 'node_modules', depName))
    if (manifest == null || !manifest.version) {
      throw new Error(
        `Cannot resolve workspace protocol of dependency "${depName}" ` +
          'because this dependency is not installed. Try running "pnpm install".'
      )
    }
    const semverRangeToken = versionAliasSpecParts[2] !== '*' ? versionAliasSpecParts[2] : ''
    if (depName !== manifest.name) {
      return `npm:${manifest.name}@${semverRangeToken}${manifest.version}`
    }
    return `${semverRangeToken}${manifest.version}`
  }
  if (depSpec.startsWith('workspace:./') || depSpec.startsWith('workspace:../')) {
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

function patch() {
  const { Package } = require('@lerna/package')
  class PatchedPackage extends Package {
    constructor(pkg, cwd, ...rest) {
      pkg = cloneDeep(pkg)
      for (const depsField of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
        modifyDependencies(pkg[depsField], cwd)
      }

      super(pkg, cwd, ...rest)
    }
  }

  require('@lerna/package').Package = PatchedPackage
  return function unpatch() {
    require('@lerna/package').Package = Package
  }
}

module.exports = patch
