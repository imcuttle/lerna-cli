const { Project } = require('@lerna/project')
const loadJsonFile = require('load-json-file')
const { posix: nps } = require('path')
const { makeSyncFileFinder } = require('@lerna/project/lib/make-file-finder')

const concatGlobString = (base, glob) => {
  if (glob.startsWith('!')) {
    return `!${nps.join(base, glob.slice(1))}`
  }

  return nps.join(base, glob)
}

const uniqAdd = (array, value) => {
  const index = array.indexOf(value)
  if (index >= 0) {
    return
  }
  array.push(value)
}

const lernaJsonWalk = (rootPath, globs, fn) => {
  // 默认已经剔除软链 / followSymbolicLinks
  makeSyncFileFinder(rootPath, globs)('lerna.json', (lernaJsonPath) => {
    const config = loadJsonFile.sync(lernaJsonPath) || {}
    const project = new Project(nps.dirname(lernaJsonPath))
    fn({ filename: lernaJsonPath, config, project })
  })
}

function patch() {
  const rawDescriptor = Object.getOwnPropertyDescriptor(Project.prototype, 'packageConfigs')

  const rawGet = rawDescriptor.get
  Object.defineProperty(Project.prototype, 'packageConfigs', {
    configurable: true,
    enumerable: !!rawDescriptor.enumerable,
    get: function () {
      const rawGlobs = rawGet.apply(this, arguments) || []
      lernaJsonWalk(this.rootPath, rawGlobs, ({ filename, project }) => {
        const packageConfigs = project && project.packageConfigs
        if (packageConfigs && packageConfigs.length) {
          packageConfigs.forEach((glob) => {
            const relativeName = nps.relative(this.rootPath, nps.dirname(filename))
            uniqAdd(rawGlobs, concatGlobString(relativeName, glob))
          })
        }
      })
      return rawGlobs
    }
  })

  return function unpatch() {
    Object.defineProperty(Project.prototype, 'packageConfigs', rawDescriptor)
  }
}

module.exports = patch
