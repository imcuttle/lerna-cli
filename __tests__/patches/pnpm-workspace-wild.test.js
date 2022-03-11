/**
 * @file main
 * @author imcuttle
 * @date 2018/4/4
 */
const { fixture } = require('../helper')
const fs = require('fs')
const isCI = require('is-ci')

jest.mock('@lerna/version/lib/git-add', () => {
  return {
    gitAdd: jest.fn(() => {})
  }
})

jest.mock('@lerna/version/lib/git-push', () => {
  return {
    gitPush: jest.fn(() => {})
  }
})

jest.mock('@lerna/version/lib/git-commit', () => {
  return {
    gitCommit: jest.fn(() => {})
  }
})

jest.mock('@lerna/version/lib/git-tag', () => {
  return {
    gitTag: jest.fn(() => {})
  }
})

jest.mock('@lerna/version/lib/git-tag', () => {
  return {
    gitTag: jest.fn(() => {})
  }
})

// const { npmPublish } = require("@lerna/npm-publish");
jest.mock('@lerna/npm-publish', () => {
  return {
    npmPublish: jest.fn(() => {})
  }
})

describe('lerna patches: pnpm-workspace-wild', function () {
  let unpatchs = []
  const cwd = process.cwd()
  beforeEach(() => {
    fs.writeFileSync(
      fixture('pnpm-workspace-wild/package.json'),
      JSON.stringify(
        {
          name: 'pnpm-workspace-wild',
          private: true,
          version: '1.0.0'
        },
        null,
        2
      )
    )
    fs.writeFileSync(
      fixture('pnpm-workspace-wild/lerna.json'),
      JSON.stringify(
        {
          command: {},
          packages: ['packages/*'],
          version: '1.0.0'
        },
        null,
        2
      )
    )

    fs.writeFileSync(
      fixture('pnpm-workspace-wild/packages/normal-a/package.json'),
      JSON.stringify(
        {
          name: 'normal-a',
          version: '1.0.0',
          dependencies: {
            'normal-c': 'workspace:*'
          }
        },
        null,
        2
      )
    )

    fs.writeFileSync(
      fixture('pnpm-workspace-wild/packages/normal-c/package.json'),
      JSON.stringify(
        {
          name: 'normal-c',
          version: '1.0.0'
        },
        null,
        2
      )
    )

    unpatchs = [
      require('./../../src/patches/pnpm-workspace-deps')(),
      require('./../../src/patches/pnpm-workspace')(),
      require('./../../src/patches/nested-packages')(),
      require('./../../src/patches/fix-conventional-commit')(),
      require('./../../src/patches/after-lerna-version-update-lockfile')()
    ]
    process.chdir(fixture('pnpm-workspace-wild'))
  })
  afterEach(() => {
    unpatchs.forEach((fn) => fn())
    process.chdir(cwd)
  })
  if (isCI) {
    return
  }
  it('spec', async function () {
    const factory = require('@lerna/publish')
    const publishCmd = factory({
      forcePublish: true,
      bump: '1.0.1',
      yes: true
    })

    await publishCmd.runner

    const { npmPublish } = require('@lerna/npm-publish')
    const [pkg] = npmPublish.mock.calls[1]
    console.log(pkg, pkg.packed)
  })
})
