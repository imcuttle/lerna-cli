exports.command = 'custom <...dir>'

exports.describe = 'custom cmd'

exports.builder = (yargs) =>
  yargs.positional('dir', { describe: 'The path to an external git repository that contains an npm package' }).options({
    flatten: {
      group: 'Command Options:',
      describe: 'Import each merge commit as a single change the merge introduced',
      type: 'boolean'
    },
    dest: {
      group: 'Command Options:',
      describe: 'Import destination directory for the external git repository',
      type: 'string'
    },
    'preserve-commit': {
      group: 'Command Options:',
      describe: 'Preserve original committer in addition to original author',
      type: 'boolean'
    },
    y: {
      group: 'Command Options:',
      describe: 'Skip all confirmation prompts',
      alias: 'yes',
      type: 'boolean'
    }
  })

exports.handler = function handler(argv) {
  process.stdout.write(JSON.stringify(argv))
}
