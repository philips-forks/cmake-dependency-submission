"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cmake_detector_1 = require("./cmake-detector");
describe('extractFetchContentGitDetails', () => {
    const fetchContentDataSimple = ['FetchContent_Declare(', 'GIT_REPOSITORY https://github.com/owner/repo', 'GIT_TAG v1.0.0', ')'];
    const fetchContentDataComment = ['FetchContent_Declare(', 'GIT_REPOSITORY https://github.com/owner/repo', 'GIT_TAG  v1.0.0 # release-1.0.0', ')'];
    const fetchContentDataQuoted = ['FetchContent_Declare(', 'GIT_REPOSITORY "https://github.com/owner/repo"', 'GIT_TAG "v1.0.0"', ')'];
    const expectedResult = { name: 'repo', namespace: 'owner', qualifiers: null, subpath: null, type: 'github', version: 'v1.0.0' };
    test('Returns empty for no input', () => {
        expect((0, cmake_detector_1.extractFetchContentGitDetails)('')).toStrictEqual([]);
    });
    test('Returns empty for invalid input', () => {
        expect((0, cmake_detector_1.extractFetchContentGitDetails)('Foo')).toStrictEqual([]);
    });
    test('Returns empty for FetchContent_Declare without Git details', () => {
        expect((0, cmake_detector_1.extractFetchContentGitDetails)('FetchContent_Declare()')).toStrictEqual([]);
    });
    test('Returns match for valid FetchContent_Declare', () => {
        expect((0, cmake_detector_1.extractFetchContentGitDetails)(fetchContentDataSimple.join('\n'))).toEqual([expectedResult]);
    });
    test('Returns matches for multiple FetchContent_Declares', () => {
        expect((0, cmake_detector_1.extractFetchContentGitDetails)((fetchContentDataSimple.concat(fetchContentDataSimple)).join('\n'))).toEqual([expectedResult, expectedResult]);
    });
    test('Returns matches for single-line FetchContent_Declare', () => {
        expect((0, cmake_detector_1.extractFetchContentGitDetails)('FetchContent_Declare(GIT_REPOSITORY https://github.com/owner/repo GIT_TAG v1.0.0)')).toEqual([expectedResult]);
    });
    test('Returns match for FetchContent_Declare with CRLF line endings', () => {
        expect((0, cmake_detector_1.extractFetchContentGitDetails)(fetchContentDataSimple.join('\r\n'))).toEqual([expectedResult]);
    });
    test('Returns match for FetchContent_Declare with comments', () => {
        expect((0, cmake_detector_1.extractFetchContentGitDetails)(fetchContentDataComment.join('\n'))).toEqual([expectedResult]);
    });
    test('Returns match for FetchContent_Declare with quoted arguments', () => {
        expect((0, cmake_detector_1.extractFetchContentGitDetails)(fetchContentDataQuoted.join('\n'))).toEqual([expectedResult]);
    });
});
describe('parseNamespaceAndName', () => {
    test('Returns namespace and name for Git repository', () => {
        expect((0, cmake_detector_1.parseNamespaceAndName)('https://github.com/foo/bar')).toStrictEqual(['foo', 'bar']);
    });
    test('Returns namespace and name for Git repository with .git postfix', () => {
        expect((0, cmake_detector_1.parseNamespaceAndName)('https://github.com/foo/bar.git')).toStrictEqual(['foo', 'bar']);
    });
    test('Throws exception for invalid GitHub URL', () => {
        expect(() => { (0, cmake_detector_1.parseNamespaceAndName)('https://github.com/foo/'); }).toThrowError();
    });
});
describe('parsePackageType', () => {
    test('Returns correct PURL type for GitHub URL', () => {
        expect((0, cmake_detector_1.parsePackageType)('https://github.com/foo/bar')).toBe('github');
    });
    test('Returns correct PURL type for BitBucket URL', () => {
        expect((0, cmake_detector_1.parsePackageType)('https://bitbucket.com/foo/bar')).toBe('bitbucket');
    });
    test('Returns correct PURL type for other URL', () => {
        expect((0, cmake_detector_1.parsePackageType)('https://other.com/foo/bar')).toBe('generic');
    });
});
