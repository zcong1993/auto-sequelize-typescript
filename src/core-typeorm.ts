import { Sequelize } from 'sequelize'
import * as camelcase from 'camelcase'
import * as _ from 'lodash'
import { Config } from './core'
import { IndentManager } from './im'
import { object2code, wrap, getColumnOptions, writeFile } from './util'

const getLength = (str: string) => {
  const regex = /\((?<l>\d+)\)/
  return str.match(regex)?.groups['l']
}

const getType = (
  type: string
): {
  tsType: string
  columnType?: any
  import?: string
} => {
  const t = type.toUpperCase().split('(')[0]

  if (
    [
      'TINYINT',
      'SMALLINT',
      'MEDIUMINT',
      'INT',
      'BIGINT',
      'DECIMAL',
      'FLOAT',
      'DOUBLE',
      'BIT',
    ].includes(t)
  ) {
    if (type === 'TINYINT(1)') {
      return {
        tsType: 'boolean',
        columnType: getColumType(type),
      }
    }
    return {
      tsType: 'number',
      columnType: getColumType(type),
    }
  }
  if (
    ['CHAR', 'VARCHAR', 'TINYTEXT', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT'].includes(
      t
    )
  ) {
    return {
      tsType: 'string',
      columnType: getColumType(type),
    }
  }
  if (['DATE', 'TIME', 'DATETIME', 'TIMESTAMP'].includes(t)) {
    return {
      tsType: 'Date',
      columnType: getColumType(type),
    }
  }

  if (['BLOB', 'TINYBLOB', 'MEDIUMBLOB', 'LONGBLOB'].includes(t)) {
    return {
      tsType: 'Buffer',
      columnType: getColumType(type),
    }
  }

  if (['JSON', 'JSONB', 'GEOMETRY'].includes(t)) {
    return {
      tsType: 'any',
      columnType: getColumType(type),
    }
  }

  throw new Error(`type ${type} not impl yet`)
}

const getColumType = (t: string): object => {
  const tt = t.toLowerCase()
  const type = wrap(tt.split('(')[0])
  // bool
  if (tt === 'boolean' || tt === 'bit(1)' || tt === 'bit') {
    return { type: 'bool' }
  }
  // int
  if (tt.match(/^(smallint|mediumint|tinyint|int)/)) {
    const length = getLength(tt)
    const res: any = { type }
    if (!!length) {
      res.width = `${length}`.replace(/\(|\)/g, '')
    }
    if (tt.match(/unsigned/i)) {
      res.unsigned = true
    }
    if (tt.match(/zerofill/i)) {
      res.zerofill = true
    }

    return res
  }
  // bigint
  if (tt.match(/^bigint/)) {
    return { type }
  }
  // varchar
  if (tt.match(/^varchar/)) {
    const length = getLength(tt)
    return { type, length }
  }
  // string
  if (tt.match(/^string|varying|nvarchar/)) {
    return { type }
  }
  // char
  if (tt.match(/^char/)) {
    const length = getLength(tt)
    return { type, length }
  }
  // real
  if (tt.match(/^real/)) {
    return { type }
  }
  // text
  if (tt.match(/text|ntext$/)) {
    return { type }
  }
  // time
  if (tt === 'date') {
    return { type }
  }
  if (tt.match(/^(date|timestamp)/)) {
    return { type }
  }

  if (tt.match(/^(time)/)) {
    return { type }
  }
  // number
  if (tt.match(/^(float|float4)/)) {
    return { type }
  }
  if (tt.match(/^decimal/)) {
    return { type }
  }
  if (tt.match(/^(float8|double precision|numeric)/)) {
    return { type }
  }
  // uuid
  if (tt.match(/^uuid|uniqueidentifier/)) {
    return { type }
  }
  // jsonb
  if (tt.match(/^jsonb/)) {
    return { type }
  }
  // json
  if (tt.match(/^json/)) {
    return { type }
  }
  // geo
  if (tt.match(/^geometry/)) {
    return { type }
  }

  // blob
  if (tt.match(/blob$/)) {
    // const lengthType = tt.replace(/blob$/, '')
    // return lengthType ? { type, length: lengthType } : { type }
    return { type }
  }
}

const transformColOptions = (opts: any) => {
  const res: any = {}
  const mapping: Record<string, string> = {
    allowNull: 'nullable',
    primaryKey: 'primary',
    defaultValue: 'default',
    autoIncrement: 'autoIncrement',
    comment: 'comment',
    type: 'type',
    length: 'length',
    nullable: 'nullable',
    primary: 'primary',
    default: 'default',
    width: 'width',
    name: 'name',
  }
  Object.keys(opts).forEach((k) => {
    if (mapping[k]) {
      res[mapping[k]] = opts[k]
    } else {
      console.log(`un impl options: ${k}`)
    }
  })
  return res
}

const generateText = (
  schema: any,
  tableName: string,
  withColumnType: boolean = true
) => {
  const importSet = new Set<string>(['Entity', 'Column'])
  let res: string = ''
  const im = new IndentManager()
  let indent = im.getIndent()

  const modelClassName = camelcase(tableName, { pascalCase: true })

  res += `@Entity({ name: '${tableName}' })\n`
  res += `export class ${modelClassName} {\n`

  indent = im.go()
  let index = 0
  const length = Object.keys(schema).length
  for (const key of Object.keys(schema)) {
    const k = camelcase(key)
    const column = schema[key]
    const tt = getType(column.type)
    let colOpt = getColumnOptions(column)
    const required = !column.allowNull || !!colOpt?.defaultValue

    let colStr: string

    colOpt = {
      name: `'${key}'`,
      ...colOpt,
    }

    if (withColumnType) {
      if (tt.import) {
        importSet.add(tt.import)
      }

      if (tt.columnType) {
        if (colOpt) {
          colOpt = {
            ...transformColOptions(colOpt),
            ...tt.columnType,
          }
        } else {
          colOpt = {
            ...tt.columnType,
          }
        }
      }
    }

    if (colOpt) {
      colOpt = transformColOptions(colOpt)
      if (
        colOpt.default &&
        [
          'current_timestamp',
          'current_date',
          'current_time',
          'localtime',
          'localtimestamp',
        ].includes(colOpt.default.toLowerCase())
      ) {
        colOpt.default = `() => '${colOpt.default.toUpperCase()}'`
      } else if (colOpt.default && tt.tsType !== 'number') {
        colOpt.default = wrap(colOpt.default)
      }

      if (colOpt.comment) {
        colOpt.comment = wrap(colOpt.comment)
      }

      let decoratorName = 'Column'

      // handle PrimaryGeneratedColumn
      if (colOpt.autoIncrement) {
        colOpt = _.omit(colOpt, [
          'autoIncrement',
          'nullable',
          'primary',
          'length',
          'width',
        ])
        decoratorName = 'PrimaryGeneratedColumn'
        importSet.add('PrimaryGeneratedColumn')
      }

      colStr = `${indent}@${decoratorName}(${object2code(colOpt, im)})\n`
    } else {
      colStr = `${indent}@Column()\n`
    }

    res += colStr
    res += `${indent}${k}${required ? '' : '?'}: ${tt.tsType}\n`
    if (index !== length - 1) {
      res += '\n'
    }
    index += 1
  }

  indent = im.back()
  res += `${indent}}\n`

  const importStr = `import { ${[...importSet].join(', ')} } from 'typeorm'\n\n`

  res = importStr + res

  return res
}

export const autoTypeorm = async (sequelize: Sequelize, config: Config) => {
  const tables: string[] = await sequelize.getQueryInterface().showAllTables()
  let tbs = tables
  if (config.tables) {
    tbs = tbs.filter((t) => config.tables.includes(t))
  }
  if (config.exclude) {
    tbs = tbs.filter((t) => !config.exclude.includes(t))
  }

  const res: Record<string, string> = {}

  for (const t of tbs) {
    console.log(`generate model for table: ${t}`)
    const schema = await sequelize.getQueryInterface().describeTable(t)
    const content = generateText(schema, t, config.withColumnType)
    if (config.test) {
      res[`${config.out}/${camelcase(t)}.ts`] = content
    } else {
      writeFile(`${config.out}/${camelcase(t)}.ts`, content)
    }
  }

  if (config.test) {
    return res
  }

  await sequelize.close()
}
