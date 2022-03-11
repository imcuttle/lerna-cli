'use strict'

const path = require('path')
const packlist = require('npm-packlist')
const log = require('npmlog')
const { getPacked } = require('@lerna/get-packed')
const { Package } = require('@lerna/package')
const { runLifecycle } = require('@lerna/run-lifecycle')
const tempDir = require('temp-dir')
const uuid = require('uuid')
const { packPkg } = require('./pack-pkg')

const tempfile = (filePath) => path.join(tempDir, uuid.v4(), filePath || '')

module.exports.packDirectory = packDirectory

/**
 * @typedef {object} PackConfig
 * @property {typeof log} [log]
 * @property {string} [lernaCommand] If "publish", run "prepublishOnly" lifecycle
 * @property {boolean} [ignorePrepublish]
 */

/**
 * Pack a directory suitable for publishing, writing tarball to a tempfile.
 * @param {Package|string} _pkg Package instance or path to manifest
 * @param {string} dir to pack
 * @param {PackConfig} options
 */
function packDirectory(_pkg, dir, options) {
  const pkg = Package.lazy(_pkg, dir)
  const opts = {
    log,
    ...options
  }

  opts.log.verbose('pack-directory', path.relative('.', pkg.contents))

  let chain = Promise.resolve()

  if (opts.ignorePrepublish !== true) {
    chain = chain.then(() => runLifecycle(pkg, 'prepublish', opts))
  }

  chain = chain.then(() => runLifecycle(pkg, 'prepare', opts))

  if (opts.lernaCommand === 'publish') {
    chain = chain.then(() => pkg.refresh())
    chain = chain.then(() => runLifecycle(pkg, 'prepublishOnly', opts))
    chain = chain.then(() => pkg.refresh())
  }

  chain = chain.then(() => runLifecycle(pkg, 'prepack', opts))
  chain = chain.then(() => pkg.refresh())
  chain = chain.then(() => packlist({ path: pkg.contents }))
  chain = chain.then(async (files) => {
    // 支持 pnpm workspace dep spec
    const filepath = tempfile(getTarballName(pkg))
    await packPkg({
      destFile: filepath,
      filesMap: files.reduce((acc, p) => {
        acc[`package/${p}`] = path.join(pkg.location, p)
        return acc
      }, {}),
      embedReadme: true,
      projectDir: pkg.location
    })
    return filepath
  })
  chain = chain.then((tarFilePath) =>
    getPacked(pkg, tarFilePath).then((packed) =>
      Promise.resolve()
        .then(() => runLifecycle(pkg, 'postpack', opts))
        .then(() => packed)
    )
  )

  return chain
}

function getTarballName(pkg) {
  const name =
    pkg.name[0] === '@'
      ? // scoped packages get special treatment
        pkg.name.substr(1).replace(/\//g, '-')
      : pkg.name

  return `${name}-${pkg.version}.tgz`
}
