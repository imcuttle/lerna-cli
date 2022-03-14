/**
 * @file main
 * @author imcuttle
 * @date 2018/4/4
 */
const { fixture } = require('../helper')
const fs = require('fs')
const cp = require('child_process')
const { tarPackEntry } = require('tar-stream')
const readYaml = require('read-yaml-file')
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

jest.mock('tar-stream', () => {
  const tar = jest.requireActual('tar-stream')
  const tarPackEntry = jest.fn((a, b, cb) => {
    cb && cb(null)
  })
  return {
    ...tar,
    tarPackEntry,
    pack: () => {
      const p = tar.pack()
      p.entry = tarPackEntry
      return p
    }
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

    process.chdir(fixture('pnpm-workspace-wild'))
    cp.execSync(`pnpm i`, { cwd: fixture('pnpm-workspace-wild') })

    unpatchs = [
      require('./../../src/patches/pnpm-workspace-deps')(),
      require('./../../src/patches/pnpm-workspace')(),
      require('./../../src/patches/nested-packages')(),
      require('./../../src/patches/fix-conventional-commit')(),
      require('./../../src/patches/after-lerna-version-update-lockfile')()
    ]
  })
  afterEach(() => {
    unpatchs.forEach((fn) => fn())
    process.chdir(cwd)

    tarPackEntry.mockClear()
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
    const [aArgs, bArgs] = tarPackEntry.mock.calls
    expect(JSON.parse(aArgs[1])).toMatchObject({
      name: 'normal-c',
      version: '1.0.1'
    })
    expect(JSON.parse(bArgs[1])).toMatchObject({
      name: 'normal-a',
      version: '1.0.1',
      dependencies: {
        'normal-c': '1.0.1'
      }
    })

    const normalAPkg = JSON.parse(
      await fs.promises.readFile(fixture('pnpm-workspace-wild/packages/normal-a/package.json'), 'utf-8')
    )
    expect(normalAPkg).toMatchObject({
      name: 'normal-a',
      version: '1.0.1',
      dependencies: {
        'normal-c': 'workspace:*'
      }
    })

    const lockData = await readYaml(fixture('pnpm-workspace-wild/pnpm-lock.yaml'))
    expect(lockData.importers['packages/normal-a']['specifiers']['normal-c']).toBe('workspace:*')
  })
})
