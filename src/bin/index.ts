#!/usr/bin/env node
import { join } from 'path'
import { existsSync } from 'fs'
import { cac } from 'cac'
import { sync as mkdirp } from 'mkdirp'
import { Sequelize } from 'sequelize'
import { auto, autoTypeorm } from '../'

const normalizePath = (p: string, root: string = process.cwd()): string =>
  join(root, p)

const cli = cac('auto-seq-ts')

cli
  .option('--uri [uri]', 'db connection string')
  .option('--out [out]', 'output folder', {
    default: './models',
  })
  .option(
    '--tables [tables]',
    'tables you want to generate model, example: user,baby'
  )
  .option(
    '--exclude [exclude]',
    `tables you don't want to generate model, example: user,baby`
  )
  .option('--no-column-type', 'if not need column type')
  .option('--typeorm', 'if generate typeorm type')
  .option(
    '--export-default',
    'if use export default instead of export class directly'
  )

cli.version(require('../../package.json')['version'])
cli.help()

const { options } = cli.parse()

if (options.h || options.v) {
  process.exit(0)
}

const required: string[] = ['uri']

for (const f of required) {
  if (!options[f]) {
    console.log(`option --${f} is required!`)
    process.exit(1)
  }
}

if (options.tables) {
  options.tables = options.tables.split(',').map((str: string) => str.trim())
}

if (options.exclude) {
  options.exclude = options.exclude.split(',').map((str: string) => str.trim())
}

options.out = normalizePath(options.out)

if (!existsSync(options.out)) {
  mkdirp(options.out)
}

const seq = new Sequelize(options.uri)

if (options.typeorm) {
  console.log('generate typeorm model')
  autoTypeorm(seq, {
    out: options.out,
    tables: options.tables,
    exclude: options.exclude,
    withColumnType: options.columnType,
    exportDefault: options.exportDefault,
  }).catch((err) => {
    console.log(err)
    process.exit(1)
  })
} else {
  auto(seq, {
    out: options.out,
    tables: options.tables,
    exclude: options.exclude,
    withColumnType: options.columnType,
    exportDefault: options.exportDefault,
  }).catch((err) => {
    console.log(err)
    process.exit(1)
  })
}
