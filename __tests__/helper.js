/**
 * @file helper
 */
const { execSync } = require('child_process')
const lernaCliPath = require.resolve('../cli')

expect.extend({
  toExecOutput({ command, cwd }, exceptStdout) {
    command = command.replace(/lerna /g, lernaCliPath + ' ')
    const stdout = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd
    })

    expect(stdout).toBe(exceptStdout)
    if (stdout === exceptStdout) {
      return {
        message: () => `expected ${command} output: ${exceptStdout}`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${command} output: ${exceptStdout}, but ${stdout}`,
        pass: false
      }
    }
  }
})

const nps = require('path')

function fixture() {
  return nps.join.apply(nps, [__dirname, 'fixture'].concat([].slice.call(arguments)))
}

function example() {
  return nps.join.apply(nps, [__dirname, '../example'].concat([].slice.call(arguments)))
}

module.exports = {
  fixture,
  example
}
