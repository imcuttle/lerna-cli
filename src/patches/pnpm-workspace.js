const { Project } = require('@lerna/project')
const nps = require('path')
const fs = require('fs')
const readYamlFile = require('read-yaml-file')

function patch() {
  const rawDescriptor = Object.getOwnPropertyDescriptor(Project.prototype, 'packageConfigs')

  const rawGet = rawDescriptor.get
  Object.defineProperty(Project.prototype, 'packageConfigs', {
    configurable: true,
    enumerable: !!rawDescriptor.enumerable,
    get: function () {
      const rootPath = this.rootPath
      const workspacePath = nps.join(rootPath, 'pnpm-workspace.yaml')
      if (fs.existsSync(workspacePath)) {
        const { packages = [] } = readYamlFile.sync(workspacePath) || {}
        return packages || rawGet.apply(this, arguments) || []
      }
      return rawGet.apply(this, arguments) || []
    }
  })

  return function unpatch() {
    Object.defineProperty(Project.prototype, 'packageConfigs', rawDescriptor)
  }
}

module.exports = patch
