import * as fs from 'fs'
import { isNull } from 'util'

import { Sequelize } from 'sequelize'
import * as camelcase from 'camelcase'
import * as _ from 'lodash'

class IndentManager {
  private state: number = 0
  constructor(
    private readonly indentStr: string = ' ',
    private readonly step: number = 2
  ) {}

  go(n: number = 1) {
    this.state += this.step * n
    return this.getIndent()
  }

  back(n: number = 1) {
    this.state -= this.step * n
    if (this.state < 0) {
      throw new Error('state < 0')
    }
    return this.getIndent()
  }

  getIndent() {
    return this.indentStr.repeat(this.state)
  }

  reset() {
    this.state = 0
  }
}

const object2code = (obj: any, im: IndentManager): string => {
  let indent = im.getIndent()
  let str = `{\n`
  indent = im.go()
  Object.keys(obj).forEach(k => {
    let content: string
    switch (typeof obj[k]) {
      case 'object':
        content = isNull(obj[k]) ? 'null' : object2code(obj[k], im)
        break
      default:
        content = obj[k]
    }

    str += `${indent}${k}: ${content},\n`
  })
  indent = im.back()
  str += `${indent}}`
  return str
}

// todo: type mapping
const getType = (
  type: string
): {
  tsType: string
  columnType?: string
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
      'BIT'
    ].includes(t)
  ) {
    if (type === 'TINYINT(1)') {
      return {
        tsType: 'boolean',
        columnType: 'DataType.BOOLEAN',
        import: 'DataType'
      }
    }
    return {
      tsType: 'number',
      columnType: `DataType.${type}`,
      import: 'DataType'
    }
  }
  if (
    ['CHAR', 'VARCHAR', 'TINYTEXT', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT'].includes(
      t
    )
  ) {
    return {
      tsType: 'string',
      columnType: `DataType.${type}`,
      import: 'DataType'
    }
  }
  if (['DATE', 'TIME', 'DATETIME', 'TIMESTAMP'].includes(t)) {
    return {
      tsType: 'Date',
      columnType: `DataType.${type}`,
      import: 'DataType'
    }
  }

  if (['BLOB'].includes(t)) {
    return {
      tsType: 'Buffer'
    }
  }

  throw new Error(`type ${type} not impl yet`)
}

const wrap = (str: string, q: string = "'"): string => `${q}${str}${q}`

const getColumnOptions = (opt: any): any => {
  const picks: string[] = []
  if (opt.allowNull === false) {
    picks.push('allowNull')
  }
  for (const k of Object.keys(opt)) {
    if (!['type', 'allowNull'].includes(k)) {
      const v = opt[k]
      if (!isNull(v) && !!v) {
        picks.push(k)
      }
    }
  }

  const res = _.pick(opt, picks)

  return _.isEmpty(res) ? null : res
}

const generateText = (schema: any, tableName: string) => {
  const importSet = new Set<string>(['Model', 'Column', 'Table'])
  let res: string = ''
  const im = new IndentManager()
  let indent = im.getIndent()

  const modelClassName = camelcase(tableName, { pascalCase: true })

  res += `@Table({ tableName: '${tableName}' })\n`
  res += `export default class ${modelClassName} extends Model<${modelClassName}> {\n`

  indent = im.go()

  for (const key of Object.keys(schema)) {
    const k = camelcase(key)
    const column = schema[key]
    const tt = getType(column.type)
    const colOpt = getColumnOptions(column)
    const required = !column.allowNull

    // if (tt.import) {
    //   importSet.add(tt.import)
    // }

    // if (tt.columnType) {
    //   colOpt.type = tt.columnType
    // }

    let colStr: string

    if (colOpt) {
      if (
        colOpt.defaultValue &&
        [
          'current_timestamp',
          'current_date',
          'current_time',
          'localtime',
          'localtimestamp'
        ].includes(colOpt.defaultValue.toLowerCase())
      ) {
        colOpt.defaultValue = `Sequelize.literal('${colOpt.defaultValue}')`
        importSet.add('Sequelize')
      } else if (colOpt.defaultValue && tt.tsType !== 'number') {
        colOpt.defaultValue = wrap(colOpt.defaultValue)
      }

      if (colOpt.comment) {
        colOpt.comment = wrap(colOpt.comment)
      }

      colStr = `${indent}@Column(${object2code(colOpt, im)})\n`
    } else {
      colStr = `${indent}@Column\n`
    }

    res += colStr
    res += `${indent}${k}${required ? '' : '?'}: ${tt.tsType}\n\n`
  }

  indent = im.back()
  res += `${indent}}\n`

  const importStr = `import { ${[...importSet].join(
    ', '
  )} } from 'sequelize-typescript'\n\n`

  res = importStr + res

  return res
}

const writeFile = (filePath: string, content: string) => {
  return fs.writeFileSync(filePath, content)
}

export const auto = async (sequelize: Sequelize, config: any) => {
  const tables: string[] = await sequelize.getQueryInterface().showAllTables()
  let tbs = tables
  if (config.tables) {
    tbs = tbs.filter(t => config.tables.includes(t))
  }
  if (config.exclude) {
    tbs = tbs.filter(t => !config.exclude.includes(t))
  }
  for (const t of tbs) {
    console.log(`generate model for table: ${t}`)
    const schema = await sequelize.getQueryInterface().describeTable(t)
    const content = generateText(schema, t)
    writeFile(`${config.out}/${camelcase(t)}.ts`, content)
  }
  await sequelize.close()
}
