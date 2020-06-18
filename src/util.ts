import * as fs from 'fs'
import { isNull } from 'util'
import * as _ from 'lodash'
import { IndentManager } from './im'

const typeWithLength = (
  type: string,
  lengthStr: RegExpMatchArray | null
): string => {
  return isNull(lengthStr) ? type : `${type}${lengthStr}`
}

export const isEmptyObj = (obj: any) => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false
    }
  }
  return true
}

export const wrap = (str: string, q: string = "'"): string => `${q}${str}${q}`

export const writeFile = (filePath: string, content: string) => {
  return fs.writeFileSync(filePath, content)
}

export const getColumnOptions = (opt: any): any => {
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

export const object2code = (obj: any, im: IndentManager): string => {
  let indent = im.getIndent()
  let str = `{\n`
  indent = im.go()
  Object.keys(obj).forEach((k) => {
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

export const getColumType = (t: string): string => {
  const tt = t.toLowerCase()
  // bool
  if (tt === 'boolean' || tt === 'bit(1)' || tt === 'bit') {
    return 'DataType.BOOLEAN'
  }
  // int
  if (tt.match(/^(smallint|mediumint|tinyint|int)/)) {
    const length = tt.match(/\(\d+\)/)
    const res: string = 'DataType.INTEGER'
    let optionsStr: string = ''
    const options: any = {}
    if (!isNull(length)) {
      options.length = `${length}`.replace(/\(|\)/g, '')
    }
    if (tt.match(/unsigned/i)) {
      options.unsigned = true
    }
    if (tt.match(/zerofill/i)) {
      options.zerofill = true
    }

    if (!_.isEmpty(options)) {
      optionsStr += '({ '
      Object.keys(options).forEach((k, i) => {
        const v = options[k]
        optionsStr += `${k}: ${v}${
          i === Object.keys(options).length - 1 ? '' : ', '
        }`
      })
      optionsStr += ' })'
    }
    return res + optionsStr
  }
  // bigint
  if (tt.match(/^bigint/)) {
    return 'DataType.BIGINT'
  }
  // varchar
  if (tt.match(/^varchar/)) {
    const length = tt.match(/\(\d+\)/)
    return typeWithLength('DataType.STRING', length)
  }
  // string
  if (tt.match(/^string|varying|nvarchar/)) {
    return 'DataType.STRING'
  }
  // char
  if (tt.match(/^char/)) {
    const length = tt.match(/\(\d+\)/)
    return typeWithLength('DataType.CHAR', length)
  }
  // real
  if (tt.match(/^real/)) {
    return 'DataType.REAL'
  }
  // text
  if (tt.match(/text|ntext$/)) {
    return 'DataType.TEXT'
  }
  // time
  if (tt === 'date') {
    return 'DataType.DATEONLY'
  }
  if (tt.match(/^(date|timestamp)/)) {
    return 'DataType.DATE'
  }

  if (tt.match(/^(time)/)) {
    return 'DataType.TIME'
  }
  // number
  if (tt.match(/^(float|float4)/)) {
    return 'DataType.FLOAT'
  }
  if (tt.match(/^decimal/)) {
    return 'DataType.DECIMAL'
  }
  if (tt.match(/^(float8|double precision|numeric)/)) {
    return 'DataType.DOUBLE'
  }
  // uuid
  if (tt.match(/^uuid|uniqueidentifier/)) {
    return 'DataType.UUIDV4'
  }
  // jsonb
  if (tt.match(/^jsonb/)) {
    return 'DataType.JSONB'
  }
  // json
  if (tt.match(/^json/)) {
    return 'DataType.JSON'
  }
  // geo
  if (tt.match(/^geometry/)) {
    return 'DataType.GEOMETRY'
  }

  // blob
  if (tt.match(/blob$/)) {
    const lengthType = tt.replace(/blob$/, '')
    return lengthType ? `DataType.BLOB('${lengthType}')` : 'DataType.BLOB'
  }
}

export const getType = (
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
      'BIT',
    ].includes(t)
  ) {
    if (type === 'TINYINT(1)') {
      return {
        tsType: 'boolean',
        columnType: getColumType(type),
        import: 'DataType',
      }
    }
    return {
      tsType: 'number',
      columnType: getColumType(type),
      import: 'DataType',
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
      import: 'DataType',
    }
  }
  if (['DATE', 'TIME', 'DATETIME', 'TIMESTAMP'].includes(t)) {
    return {
      tsType: 'Date',
      columnType: getColumType(type),
      import: 'DataType',
    }
  }

  if (['BLOB', 'TINYBLOB', 'MEDIUMBLOB', 'LONGBLOB'].includes(t)) {
    return {
      tsType: 'Buffer',
      columnType: getColumType(type),
      import: 'DataType',
    }
  }

  throw new Error(`type ${type} not impl yet`)
}
