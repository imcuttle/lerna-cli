/**
 * lerna cli with custom command extensions
 * @author imcuttle
 */
const nps = require('path')
const resolveModules = modules => {
  return modules.reduce((acc, p) => {
    acc[p] = nps.dirname(require.resolve(p + '/package.json'))
    return acc;
  }, {})
}
require('module-path-hook/register')({
  // See webpack resolve: https://webpack.docschina.org/configuration/resolve/
  alias: resolveModules(['@lerna/package', '@lerna/pack-directory', '@lerna/project', '@lerna/conventional-commits']),
});

require('./patches/pnpm-workspace-deps')()
require('./patches/pnpm-workspace')()
require('./patches/nested-packages')()
require('./patches/fix-conventional-commit')()
require('./patches/after-lerna-version-update-lockfile')()

const cli = require('@lerna/cli')
const resolveGlobal = require('resolve-global');

const { Project: LernaProject } = require('@lerna/project')

const addCmd = require('@lerna/add/command')
const bootstrapCmd = require('@lerna/bootstrap/command')
const changedCmd = require('@lerna/changed/command')
const cleanCmd = require('@lerna/clean/command')
const createCmd = require('@lerna/create/command')
const diffCmd = require('@lerna/diff/command')
const execCmd = require('@lerna/exec/command')
const importCmd = require('@lerna/import/command')
const infoCmd = require('@lerna/info/command')
const initCmd = require('@lerna/init/command')
const linkCmd = require('@lerna/link/command')
const listCmd = require('@lerna/list/command')
const publishCmd = require('@lerna/publish/command')
const runCmd = require('@lerna/run/command')
const versionCmd = require('@lerna/version/command')

const pkg = require('../package.json')

module.exports = main

function main(argv) {
  const context = {
    lernaVersion: pkg.version
  }

  const cwd = process.cwd()
  const lernaProject = new LernaProject(cwd)
  const { extendCommands: commands = [] } = (lernaProject && lernaProject.config) || {}

  let cliInstance = cli()
    .command(addCmd)
    .command(bootstrapCmd)
    .command(changedCmd)
    .command(cleanCmd)
    .command(createCmd)
    .command(diffCmd)
    .command(execCmd)
    .command(importCmd)
    .command(infoCmd)
    .command(initCmd)
    .command(linkCmd)
    .command(listCmd)
    .command(publishCmd)
    .command(runCmd)
    .command(versionCmd)

  commands.forEach((cmd) => {
    // relative path
    if (cmd.startsWith('.')) {
      cmd = nps.join(lernaProject.rootPath, cmd)
    }
    if (!cmd.endsWith('/command')) {
      cmd = nps.join(cmd, 'command')
    }

    let cmdConfig;
    try {
      cmdConfig = require(cmd)
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        cmdConfig = require(resolveGlobal(cmd))
      } else {
        throw err
      }
    }

    if (Array.isArray(cmdConfig)) {
      cmdConfig.forEach((eachCmdConfig) => {
        cliInstance = cliInstance.command(eachCmdConfig)
      })
    } else {
      cliInstance = cliInstance.command(cmdConfig)
    }
  })

  return cliInstance.parse(argv, context)
}
