import { extractFetchContentGitDetails } from './cmake-detector'

const fetchContentDataSimple = ['FetchContent_Declare(', 'GIT_REPOSITORY https://github.com/owner/repo', 'GIT_TAG v1.0.0', ')']
const expectedResultSimple = { repo: 'https://github.com/owner/repo', tag: 'v1.0.0' }

describe('extractFetchContentGitDetails', () => {
  test('Returns empty for no input', () => {
    expect(extractFetchContentGitDetails('')).toStrictEqual([])
  })

  test('Returns empty for invalid input', () => {
    expect(extractFetchContentGitDetails('Foo')).toStrictEqual([])
  })

  test('Returns empty for FetchContent_Declare without Git details', () => {
    expect(extractFetchContentGitDetails('FetchContent_Declare()')).toStrictEqual([])
  })

  test('Returns match for valid FetchContent_Declare', () => {
    expect(extractFetchContentGitDetails(fetchContentDataSimple.join('\n'))).toStrictEqual([expectedResultSimple])
  })

  test('Returns match for FetchContent_Declare with CRLF line endings', () => {
    expect(extractFetchContentGitDetails(fetchContentDataSimple.join('\r\n'))).toStrictEqual([expectedResultSimple])
  })

  test('Returns matches for multiple FetchContent_Declares', () => {
    expect(extractFetchContentGitDetails((fetchContentDataSimple.concat(fetchContentDataSimple)).join('\n'))).toStrictEqual([expectedResultSimple, expectedResultSimple])
  })
})
