/**
 * @file main
 * @author imcuttle
 * @date 2018/4/4
 */
const { Project } = require('@lerna/project')
const { fixture } = require('../helper')

const CWD = fixture('nested-packages')

async function getNames(cwd = CWD) {
  const packages = await Project.getPackages(cwd)
  return packages.map((p) => p.name)
}

describe('lerna patches: nested-packages', function () {
  let unpatch
  let project
  beforeEach(() => {
    project = new Project(CWD)
    unpatch = require('../../src/patches/nested-packages')()
  })
  afterEach(() => {
    unpatch()
  })

  it('spec', async function () {
    expect(await getNames()).toMatchInlineSnapshot(`
      Array [
        "nested-a",
        "nested-b",
        "normal-a",
        "inner-a",
        "inner-b",
      ]
    `)
  })

  it('offical spec', async function () {
    unpatch()
    expect(await getNames()).toMatchInlineSnapshot(`
      Array [
        "nested-a",
        "nested-b",
        "normal-a",
      ]
    `)
  })

  it('symbolic link', async function () {
    expect(await getNames(fixture('nested-packages/packages/nested-b'))).toMatchInlineSnapshot(`
      Array [
        "inner-b",
      ]
    `)
  })
})
