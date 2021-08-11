import { Sequelize } from 'sequelize'
import { autoTypeorm } from '../src'

const seq = new Sequelize(process.env.MYSQL_URL)

afterAll(async () => {
  await seq.close()
})

it('normal config should work well for typeorm', async () => {
  const res = await autoTypeorm(seq, {
    test: true,
    out: './null',
  })

  expect(res).toMatchSnapshot()
})

it('tables option should work well for typeorm', async () => {
  const res = await autoTypeorm(seq, {
    test: true,
    out: './null',
    tables: ['orders', 'products'],
  })

  expect(res).toMatchSnapshot()
})

it('exclude option should work well for typeorm', async () => {
  const res = await autoTypeorm(seq, {
    test: true,
    out: './null',
    exclude: ['orders', 'products'],
  })

  expect(res).toMatchSnapshot()
})

it('withColumnType option should work well for typeorm', async () => {
  const res = await autoTypeorm(seq, {
    test: true,
    out: './null',
    withColumnType: false,
  })

  expect(res).toMatchSnapshot()
})

it('exportDefault option should work well', async () => {
  const res = await autoTypeorm(seq, {
    test: true,
    out: './null',
    exportDefault: true,
  })

  expect(res).toMatchSnapshot()
})
