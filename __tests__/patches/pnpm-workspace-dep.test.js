/**
 * @file main
 * @author imcuttle
 * @date 2018/4/4
 */
const nps = require('path')
const childProcess = require('child_process')
const { fixture } = require('../helper')

const CWD = fixture('pnpm-workspace-deps')

const execLerna = (args) => {
  const binPath = nps.join(__dirname, '../../cli.js')
  return childProcess.spawnSync(binPath, args, { encoding: 'utf-8', cwd: CWD })
}

describe('lerna patches: pnpm-workspace-deps', function () {
  describe('cli', () => {
    beforeEach(() => {
      const pnpmPath = nps.join(__dirname, '../../node_modules/.bin/pnpm')
      childProcess.execSync(`${pnpmPath} i`, { cwd: CWD })
    })

    it('spec', async function () {
      const data = execLerna(['list'])
      expect(data.status).toBe(0)
      expect(data.stdout).toMatchInlineSnapshot(`
              "normal-a
              normal-c
              "
          `)
    })
  })

  describe('runtime', () => {
    let unpatch
    beforeEach(() => {
      unpatch = require('../../src/patches/pnpm-workspace-deps')()
    })
    afterEach(() => {
      unpatch()
    })

    it('spec', async function () {
      const { Package } = require('@lerna/package')

      const dir = nps.join(CWD, 'packages/normal-c')
      expect(new Package(require(nps.join(dir, 'package.json')), dir).dependencies).toMatchInlineSnapshot(`
        Object {
          "normal-a": "^1.0.0",
        }
      `)
    })
  })
})
