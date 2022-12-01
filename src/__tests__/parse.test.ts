import { parseProject } from '../parse'

describe('parseProject', () => {
  test('Parses project from project dir', () => {
    expect(parseProject('example')).toBe(4)
  })
})

export {}
