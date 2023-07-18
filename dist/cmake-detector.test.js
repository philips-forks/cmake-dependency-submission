"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cmake_detector_1 = require("./cmake-detector");
const fetchContentDataSimple = ['FetchContent_Declare(', 'GIT_REPOSITORY https://github.com/owner/repo', 'GIT_TAG v1.0.0', ')'];
const expectedResultSimple = { repo: 'https://github.com/owner/repo', tag: 'v1.0.0' };
describe('extractFetchContentGitDetails', () => {
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
        expect((0, cmake_detector_1.extractFetchContentGitDetails)(fetchContentDataSimple.join('\n'))).toStrictEqual([expectedResultSimple]);
    });
    test('Returns match for FetchContent_Declare with CRLF line endings', () => {
        expect((0, cmake_detector_1.extractFetchContentGitDetails)(fetchContentDataSimple.join('\r\n'))).toStrictEqual([expectedResultSimple]);
    });
    test('Returns matches for multiple FetchContent_Declares', () => {
        expect((0, cmake_detector_1.extractFetchContentGitDetails)((fetchContentDataSimple.concat(fetchContentDataSimple)).join('\n'))).toStrictEqual([expectedResultSimple, expectedResultSimple]);
    });
});
