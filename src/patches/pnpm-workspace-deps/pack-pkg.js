const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
const { createGzip } = require('zlib')
const { readProjectManifest } = require('@pnpm/cli-utils')
const exportableManifest = require('@pnpm/exportable-manifest').default
const binify = require('@pnpm/package-bins').default
const tar = require('tar-stream')

async function readReadmeFile(filesMap) {
  const readmePath = Object.keys(filesMap).find((name) => /^package\/readme\.md$/i.test(name))
  const readmeFile = readmePath ? await fs.promises.readFile(filesMap[readmePath], 'utf8') : undefined

  return readmeFile
}

async function packPkg(opts) {
  const { destFile, filesMap, projectDir, embedReadme } = opts
  const { manifest } = await readProjectManifest(projectDir, {})
  const bins = [
    ...(await binify(manifest, projectDir)).map(({ path }) => path),
    ...((manifest.publishConfig && manifest.publishConfig.executableFiles) || []).map((executableFile) =>
      path.join(projectDir, executableFile)
    )
  ]
  const mtime = new Date('1985-10-26T08:15:00.000Z')
  const pack = tar.pack()
  for (const [name, source] of Object.entries(filesMap)) {
    const isExecutable = bins.some((bin) => path.relative(bin, source) === '')
    const mode = isExecutable ? 0o755 : 0o644
    if (/^package\/package\.(json|json5|yaml)/.test(name)) {
      const readmeFile = embedReadme ? await readReadmeFile(filesMap) : undefined
      const publishManifest = await exportableManifest(projectDir, manifest, { readmeFile })
      pack.entry({ mode, mtime, name: 'package/package.json' }, JSON.stringify(publishManifest, null, 2))
      continue
    }
    pack.entry({ mode, mtime, name }, fs.readFileSync(source))
  }
  // fs.promises.ens
  await fsExtra.ensureDir(path.dirname(destFile))
  const tarball = fs.createWriteStream(destFile)
  pack.pipe(createGzip()).pipe(tarball)
  pack.finalize()
  return new Promise((resolve, reject) => {
    tarball.on('close', () => resolve()).on('error', reject)
  })
}

module.exports = {
  packPkg
}
