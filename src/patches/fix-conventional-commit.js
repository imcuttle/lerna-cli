const cloneDeep = require('lodash.clonedeep')

module.exports = function patch() {
  const { getChangelogConfig } = require('@lerna/conventional-commits/lib/get-changelog-config')

  require('@lerna/conventional-commits/lib/get-changelog-config').getChangelogConfig =
    function patchedGetChangelogConfig(changelogPreset, rootPath) {
      return getChangelogConfig(changelogPreset && cloneDeep(changelogPreset), rootPath)
    }
  return () => {
    require('@lerna/conventional-commits/lib/get-changelog-config').getChangelogConfig = getChangelogConfig
  }
}
