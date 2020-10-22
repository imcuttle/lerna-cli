/**
 * @file helper
 */

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
