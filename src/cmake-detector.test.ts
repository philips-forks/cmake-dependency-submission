import { extractFetchContentGitDetails, parseNamespaceAndName, parsePackageType } from './cmake-detector'

describe('extractFetchContentGitDetails', () => {
  const fetchContentDataSimple = ['FetchContent_Declare(', 'GIT_REPOSITORY https://github.com/owner/repo', 'GIT_TAG v1.0.0', ')']
  const fetchContentDataComment = ['FetchContent_Declare(', 'GIT_REPOSITORY https://github.com/owner/repo', 'GIT_TAG  v1.0.0 # release-1.0.0', ')']
  const fetchContentDataQuoted = ['FetchContent_Declare(', 'GIT_REPOSITORY "https://github.com/owner/repo"', 'GIT_TAG "v1.0.0"', ')']
  const expectedResult = { name: 'repo', namespace: 'owner', qualifiers: null, subpath: null, type: 'github', version: 'v1.0.0' }

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
    expect(extractFetchContentGitDetails(fetchContentDataSimple.join('\n'))).toEqual([expectedResult])
  })

  test('Returns matches for multiple FetchContent_Declares', () => {
    expect(extractFetchContentGitDetails((fetchContentDataSimple.concat(fetchContentDataSimple)).join('\n'))).toEqual([expectedResult, expectedResult])
  })

  test('Returns matches for single-line FetchContent_Declare', () => {
    expect(extractFetchContentGitDetails('FetchContent_Declare(GIT_REPOSITORY https://github.com/owner/repo GIT_TAG v1.0.0)')).toEqual([expectedResult])
  })

  test('Returns match for FetchContent_Declare with CRLF line endings', () => {
    expect(extractFetchContentGitDetails(fetchContentDataSimple.join('\r\n'))).toEqual([expectedResult])
  })

  test('Returns match for FetchContent_Declare with comments', () => {
    expect(extractFetchContentGitDetails(fetchContentDataComment.join('\n'))).toEqual([expectedResult])
  })

  test('Returns match for FetchContent_Declare with quoted arguments', () => {
    expect(extractFetchContentGitDetails(fetchContentDataQuoted.join('\n'))).toEqual([expectedResult])
  })
})

describe('parseNamespaceAndName', () => {
  test('Returns namespace and name for Git repository', () => {
    expect(parseNamespaceAndName('https://github.com/foo/bar')).toStrictEqual(['foo', 'bar'])
  })

  test('Returns namespace and name for Git repository with .git postfix', () => {
    expect(parseNamespaceAndName('https://github.com/foo/bar.git')).toStrictEqual(['foo', 'bar'])
  })

  test('Throws exception for invalid GitHub URL', () => {
    expect(() => { parseNamespaceAndName('https://github.com/foo/') }).toThrowError()
  })
})

describe('parsePackageType', () => {
  test('Returns correct PURL type for GitHub URL', () => {
    expect(parsePackageType('https://github.com/foo/bar')).toBe('github')
  })

  test('Returns correct PURL type for BitBucket URL', () => {
    expect(parsePackageType('https://bitbucket.com/foo/bar')).toBe('bitbucket')
  })

  test('Returns correct PURL type for other URL', () => {
    expect(parsePackageType('https://other.com/foo/bar')).toBe('generic')
  })
})
