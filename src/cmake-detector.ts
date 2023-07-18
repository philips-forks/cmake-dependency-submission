import * as core from '@actions/core'
import { readFileSync } from 'fs';
import { globSync } from 'glob'

type GitPair = { repo: string | undefined, tag: string | undefined }

function normalizeArgument(value: string): string {
    return value.replace(/[")]+/g, '')
}

function getArgumentForKeyword(keyword: string, line: string): string {
    const array = line.slice(line.indexOf(keyword)).split(/\s+/);
    return normalizeArgument(array[array.findIndex((value) => value == keyword) + 1])
}

export function extractFetchContentGitDetails(content: string): Array<GitPair> {
    let pairs: Array<GitPair> = []
    let readingFetch: boolean = false
    let pair: GitPair = { repo: undefined, tag: undefined }

    content.split(/\r?\n/).forEach((line) => {
        if (line.includes('FetchContent_Declare')) {
            readingFetch = true;
        }

        if (readingFetch) {
            const gitRepositoryKeyword = 'GIT_REPOSITORY'
            const gitTagKeword = 'GIT_TAG'

            if (line.includes(gitRepositoryKeyword)) {
                pair.repo = getArgumentForKeyword(gitRepositoryKeyword, line)
            }

            if (line.includes(gitTagKeword)) {
                pair.tag = getArgumentForKeyword(gitTagKeword, line)
            }

            if (line.includes(')')) {
                readingFetch = false;

                if (pair.repo && pair.tag) {
                    pairs.push({...pair});
                    pair = { repo: undefined, tag: undefined }
                }
            }
        }
    })

    return pairs
}

export function parseCMakeListsFile(path: string): Array<GitPair> {
    const content = readFileSync(path, 'utf-8');
    return extractFetchContentGitDetails(content);
}

export function parseCMakeListsFiles(files: string[]): Array<GitPair> {
    let dependencies: Array<GitPair> = []

    files.forEach(file => {
        dependencies = dependencies.concat(parseCMakeListsFile(file))
    });

    return dependencies
}

export async function main() {
    const sourcePath = core.getInput('sourcePath')
    const cmakeFiles = globSync([sourcePath + '/**/CMakeLists.txt', sourcePath + '/**/*.cmake'])
    const dependencies = parseCMakeListsFiles(cmakeFiles)

    console.log(`dependencies: ${ JSON.stringify(dependencies) }`);
}
