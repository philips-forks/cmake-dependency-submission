import * as core from '@actions/core'
import { readFileSync } from 'fs';

type GitPair = { repo: string | undefined, tag: string | undefined }

export function extractFetchContentGitDetails(content: string): Array<GitPair> {
    let pairs: Array<GitPair> = []
    let readingFetch: boolean = false
    let pair: GitPair = { repo: undefined, tag: undefined }

    content.split(/\r?\n/).forEach((line) => {
        if (line.includes('FetchContent_Declare')) {
            readingFetch = true;
        }

        if (readingFetch) {
            if (line.includes('GIT_REPOSITORY')) {
                pair.repo = line.replace('GIT_REPOSITORY', '').trim();
            }

            if (line.includes('GIT_TAG')) {
                pair.tag = line.replace('GIT_TAG', '').trim();
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

export function parseCMakeListsFile(path: string) {
    const content = readFileSync(path, 'utf-8');
    const dependencies = extractFetchContentGitDetails(content);

    console.log(`dependencies: ${ JSON.stringify(dependencies) }`);
}

export async function main() {
    const cmakeListsTxtPath = core.getInput('cmakeListsTxtPath')
    parseCMakeListsFile(cmakeListsTxtPath)
}
