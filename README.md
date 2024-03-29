# lerna-cli

[![Build status](https://img.shields.io/travis/imcuttle/lerna-cli/master.svg?style=flat-square)](https://travis-ci.org/imcuttle/lerna-cli)
[![Test coverage](https://img.shields.io/codecov/c/github/imcuttle/lerna-cli.svg?style=flat-square)](https://codecov.io/github/imcuttle/lerna-cli?branch=master)
[![NPM version](https://img.shields.io/npm/v/lerna-cli.svg?style=flat-square)](https://www.npmjs.com/package/lerna-cli)
[![NPM Downloads](https://img.shields.io/npm/dm/lerna-cli.svg?style=flat-square&maxAge=43200)](https://www.npmjs.com/package/lerna-cli)
[![Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org)

> lerna cli with custom command extensions, forked with official [lerna](https://www.npmjs.com/package/lerna)

See https://github.com/lerna/lerna/issues/2742

## Features (VS Official lerna)

- Use local `lerna` even in global command. see [import-local](https://www.npmjs.com/package/import-local)
- Custom command
- Nested `lerna.json` in packages
  ```text
  packages/
    foo/
      projects/
        bar/
      lerna.json
  lerna.json
  ```
- Respect pnpm-workspace.yaml
  1. overwriting `packages`
  2. dependencies' version allows `workspace:version`
  ```text
  packages/
  lerna.json
  pnpm-workspace.yaml
  ```
  In my best practices case: use pnpm as a monorepo manager, use lerna for publishing or some custom commands.

## Installation

```bash
npm install lerna-cli -D

lerna --help
```

## Custom commands

1. `lerna.json`

Add `extendCommands` field, supports local file or npm package

```diff
+ "extendCommands": [
+   "./commands/custom",
+   "lerna-custom-command",
+ ],
```

2. Write myself custom command

- See official command: [@lerna/init](https://github.com/lerna/lerna/tree/master/commands/init), [@lerna/add](https://github.com/lerna/lerna/tree/master/commands/add)

Add `command.js`

```javascript
/**
 * @see https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module
 */
exports.command = 'custom'

exports.describe = 'custom command.'

exports.builder = {
  exact: {
    describe: 'Specify lerna dependency version in package.json without a caret (^)',
    type: 'boolean'
  },
  independent: {
    describe: 'Version packages independently',
    alias: 'i',
    type: 'boolean'
  }
}

exports.handler = function handler(argv) {
  return require('..')(argv)
}
```

3. Run custom command

```bash
lerna custom
```

## Custom preset

1. `lerna.json`

Add `extendCommands` field, supports local file or npm package

```diff
+ "extendCommands": [
+   "lerna-custom-preset-command",
+ ],
```

2. Write myself custom command preset in `command.js` or `command/index.js`

```javascript
module.exports = [
  require('lerna-command-a/command'),
  require('lerna-command-b/command'),
  require('lerna-command-c/command')
]
```

3. Run custom command

```bash
lerna custom-a
lerna custom-b
lerna custom-c
```

## Recommanded Commands

- [lerna-gpm](https://github.com/imcuttle/lerna-gpm) - lerna command for git package manager
- [lerna-command-toc](https://github.com/imcuttle/lerna-command-toc) - lerna command for generate toc of packages in markdown

## Contributing

- Fork it!
- Create your new branch:  
  `git checkout -b feature-new` or `git checkout -b fix-which-bug`
- Start your magic work now
- Make sure npm test passes
- Commit your changes:  
  `git commit -am 'feat: some description (close #123)'` or `git commit -am 'fix: some description (fix #123)'`
- Push to the branch: `git push`
- Submit a pull request :)

## Authors

This library is written and maintained by imcuttle, <a href="mailto:imcuttle@163.com.com">imcuttle@163.com.com</a>.

## License

MIT - [imcuttle](https://github.com/imcuttle) 🐟
