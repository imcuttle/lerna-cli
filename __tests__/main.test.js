/**
 * @file main
 * @author imcuttle
 * @date 2018/4/4
 */
const { execSync } = require('child_process')

const { version } = require('../package.json')
const { example } = require('./helper')
const lernaCliPath = require.resolve('../cli')

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
