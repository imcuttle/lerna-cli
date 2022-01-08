/**
 * @file main
 * @author imcuttle
 * @date 2018/4/4
 */
const { Project } = require('@lerna/project')
const { fixture } = require('../helper')

const CWD = fixture('pnpm-workspace')

async function getNames(cwd = CWD) {
  const packages = await Project.getPackages(cwd)
  return packages.map((p) => p.name)
}

describe('lerna patches: pnpm-workspace', function () {
  let unpatch
  let project
  beforeEach(() => {
    project = new Project(CWD)
    require('../../src/patches/nested-packages')()
    unpatch = require('../../src/patches/pnpm-workspace')()
  })
  afterEach(() => {
    unpatch()
  })

  it('spec', async function () {
    expect(await getNames()).toMatchInlineSnapshot(`
      Array [
        "normal-a",
        "normal-c",
      ]
    `)

    unpatch()

    expect(await getNames()).toMatchInlineSnapshot(`
      Array [
        "normal-a",
      ]
    `)
  })
})
