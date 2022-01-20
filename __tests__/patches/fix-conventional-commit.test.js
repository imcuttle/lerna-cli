/**
 * @file main
 * @author imcuttle
 * @date 2018/4/4
 */

describe('lerna patches: fix-conventional-commit', function () {
  let unpatch
  beforeEach(() => {
    unpatch = require('../../src/patches/fix-conventional-commit')()
  })
  afterEach(() => {
    unpatch()
  })

  it('spec', async function () {
    unpatch()
    const { getChangelogConfig } = require('@lerna/conventional-commits/lib/get-changelog-config')
    const input = {
      name: 'conventional-changelog-conventionalcommits'
    }
    await getChangelogConfig(input, __dirname)
    expect(input).not.toEqual({
      name: 'conventional-changelog-conventionalcommits'
    })
  })

  it('spec fixed', async function () {
    const input = {
      name: 'conventional-changelog-conventionalcommits'
    }
    const { getChangelogConfig } = require('@lerna/conventional-commits/lib/get-changelog-config')
    await getChangelogConfig(input, __dirname)
    expect(input).toEqual({
      name: 'conventional-changelog-conventionalcommits'
    })
  })
})
