const nps = require('path')
const fs = require('fs')
const readYaml = require('read-yaml-file')
const writeYaml = require('write-yaml-file')
const { gitAdd } = require('@lerna/version/lib/git-add')

const fixPnpmLockFile = async (filename, updatesVersions) => {
  const lockData = await readYaml(filename)
  // console.log('lockData', lockData.importers)

  if (lockData && lockData.importers) {
    for (const [_subPath, lockItem] of Object.entries(lockData.importers)) {
      if (lockItem.dependencies && lockItem.specifiers) {
        for (const [name, spec] of Object.entries(lockItem.dependencies)) {
          const nextVersion = updatesVersions.get(name)
          if (nextVersion) {
            if (spec.startsWith('link:') && lockItem.specifiers[name]) {
              const output = lockItem.specifiers[name].match(/^([\D]*)\d/)
              if (output) {
                lockItem.specifiers[name] = output[1] + nextVersion
              } else {
                lockItem.specifiers[name] = nextVersion
              }
            }
          }
        }
      }
    }
  }

  await writeYaml(filename, lockData)
}

module.exports = function patch() {
  const { VersionCommand } = require('@lerna/version')

  const rawUpdatePackageVersions = VersionCommand.prototype.updatePackageVersions
  VersionCommand.prototype.updatePackageVersions = function updatePackageVersions(...args) {
    let chain = rawUpdatePackageVersions.apply(this, args)

    chain = chain
      .then(() => {
        const lockPaths = [nps.join(this.project.rootPath, 'pnpm-lock.yaml')]

        this.packagesToVersion.forEach((pkg) => {
          // subPathVersions.set(nps.posix.relative(pkg.rootPath, pkg.location), this.updatesVersions.get(pkg.name))
          lockPaths.push(nps.join(pkg.location, 'pnpm-lock.yaml'))
        })

        return Promise.all(
          lockPaths.map(async (filename) => {
            if (fs.existsSync(filename) && fs.statSync(filename).isFile()) {
              await fixPnpmLockFile(filename, this.updatesVersions)
              return filename
            }
          })
        )
      })
      .then((filenames) => {
        filenames = filenames.filter(Boolean)
        if (filenames.length && this.commitAndTag) {
          chain = chain.then(() => gitAdd(Array.from(filenames), this.gitOpts, this.execOpts))
        }
      })

    return chain
  }

  return () => {
    VersionCommand.prototype.updatePackageVersions = rawUpdatePackageVersions
  }
}
