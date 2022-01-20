/**
 * @file main
 * @author imcuttle
 * @date 2018/4/4
 */

const { fixture } = require('../helper')
const fs = require('fs')
const cp = require('child_process')
const nps = require('path')
const readYaml = require('read-yaml-file')

const { getPackagesSync } = require('@lerna/project')
const { gitAdd } = require('@lerna/version/lib/git-add')
const { gitCommit } = require('@lerna/version/lib/git-commit')
const { gitPush } = require('@lerna/version/lib/git-push')
const { gitTag } = require('@lerna/version/lib/git-tag')

const pnpmBinPath = nps.resolve(__dirname, '../../node_modules/.bin/pnpm')

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

describe('lerna patches: after-lerna-version-update-lockfile', function () {
  let unpatch
  beforeEach(async () => {
    gitPush.mockClear()
    gitAdd.mockClear()
    gitTag.mockClear()
    gitCommit.mockClear()

    const pkgs = getPackagesSync(fixture('lerna-version'))
    for (const pkg of pkgs) {
      pkg.version = '0.0.0'
      if (pkg.dependencies) {
        pkg.dependencies['normal-c'] = '^0.0.0'
      }
      await pkg.serialize()
    }

    cp.execSync(`echo $PWD && ${pnpmBinPath} i`, { cwd: fixture('lerna-version'), stdio: 'inherit' })
    const lockData = await readYaml(fixture('lerna-version/pnpm-lock.yaml'))
    expect(lockData.importers['packages/normal-a'].specifiers['normal-c']).toBe('^0.0.0')

    unpatch = require('../../src/patches/after-lerna-version-update-lockfile')()
  })
  afterEach(() => {
    unpatch()
  })

  it('spec unpatch', async function () {
    unpatch()
    const factory = require('@lerna/version')
    const versionCmd = factory({
      cwd: fixture('lerna-version'),
      forcePublish: true,
      bump: '1.0.0',
      yes: true
    })
    await versionCmd.runner
    expect(gitAdd.mock.calls.length).toBe(1)
    expect(gitAdd.mock.calls[0][0]).toEqual([
      fixture('lerna-version/packages/normal-c/package.json'),
      fixture('lerna-version/packages/normal-a/package.json'),
      fixture('lerna-version/lerna.json')
    ])
    expect(gitAdd.mock.calls[0][2]).toMatchObject({
      cwd: fixture('lerna-version')
    })
  })

  it('spec patched', async function () {
    const factory = require('@lerna/version')
    const versionCmd = factory({
      cwd: fixture('lerna-version'),
      forcePublish: true,
      bump: '1.0.0',
      yes: true
    })
    await versionCmd.runner

    const lockData = await readYaml(fixture('lerna-version/pnpm-lock.yaml'))
    expect(lockData.importers['packages/normal-a'].specifiers['normal-c']).toBe('^1.0.0')

    expect(gitAdd.mock.calls.length).toBe(2)
    expect(gitAdd.mock.calls[0][0]).toEqual([
      fixture('lerna-version/packages/normal-c/package.json'),
      fixture('lerna-version/packages/normal-a/package.json'),
      fixture('lerna-version/lerna.json')
    ])
    expect(gitAdd.mock.calls[1][0]).toEqual([fixture('lerna-version/pnpm-lock.yaml')])
  })
})
