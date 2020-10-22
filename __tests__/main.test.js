/**
 * @file main
 * @author imcuttle
 * @date 2018/4/4
 */
const { execSync } = require('child_process')

const { version } = require('../package.json')
const { example } = require('./helper')
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

describe('lernaCli', function () {
  it('should command custom', function () {
    expect({ command: 'lerna custom foo', cwd: example('spec') }).toExecOutput(
      JSON.stringify({
        _: ['custom'],
        lernaVersion: version,
        $0: ''
      })
    )
  })
})
