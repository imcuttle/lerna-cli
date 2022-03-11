const { Package: PatchedPackage } = require('./patched-package')
const { Package } = require('@lerna/package')

function patch() {
  const { Package } = require('@lerna/package')
  const { packDirectory } = require('@lerna/pack-directory')

  require('@lerna/package').Package = PatchedPackage
  require('@lerna/pack-directory').packDirectory = require('./pack-directory').packDirectory
  return function unpatch() {
    require('@lerna/package').Package = Package
    require('@lerna/pack-directory').packDirectory = packDirectory
  }
}

module.exports = patch
