import { Sequelize } from 'sequelize'
import * as camelcase from 'camelcase'
import * as _ from 'lodash'
import { IndentManager } from './im'
import {
  getType,
  object2code,
  wrap,
  getColumnOptions,
  writeFile,
  isEmptyObj,
} from './util'

const generateText = (
  schema: any,
  tableName: string,
  withColumnType: boolean = true
) => {
  const importSet = new Set<string>(['Model', 'Column', 'Table'])
  let res: string = ''
  const im = new IndentManager()
  let indent = im.getIndent()

  const modelClassName = camelcase(tableName, { pascalCase: true })

  res += `@Table({ tableName: '${tableName}' })\n`
  res += `export default class ${modelClassName} extends Model<${modelClassName}, Partial<${modelClassName}>> {\n`

  indent = im.go()
  let index = 0
  const length = Object.keys(schema).length

  for (const key of Object.keys(schema)) {
    const k = camelcase(key)
    const column = schema[key]
    const tt = getType(column.type)
    const colOpt = getColumnOptions(column) || {}
    const required = !column.allowNull && !colOpt.defaultValue

    let colStr: string

    if (withColumnType) {
      if (tt.import) {
        importSet.add(tt.import)
      }

      if (tt.columnType) {
        colOpt.type = tt.columnType
      }
    }

    if (!isEmptyObj(colOpt)) {
      if (
        colOpt.defaultValue &&
        [
          'current_timestamp',
          'current_date',
          'current_time',
          'localtime',
          'localtimestamp',
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
    res += `${indent}${k}${required ? '' : '?'}: ${tt.tsType}\n`
    if (index !== length - 1) {
      res += '\n'
    }
    index += 1
  }

  indent = im.back()
  res += `${indent}}\n`

  const importStr = `import { ${[...importSet].join(
    ', '
  )} } from 'sequelize-typescript'\n\n`

  res = importStr + res

  return res
}

export interface Config {
  out: string
  tables?: string[]
  exclude?: string[]
  test?: boolean
  withColumnType?: boolean
}

export const auto = async (sequelize: Sequelize, config: Config) => {
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
