import { readFileSync } from 'fs';
import { join } from 'path';

export function parseProject (projectRoot: string): number {
    const cmakeFile = readFileSync(join(projectRoot, 'CMakeLists.txt'), 'utf-8');

    type GitPair = { repo: string|undefined, tag: string|undefined};
    let pairs: Array<GitPair> = [];

    let readingFetch: boolean = false;
    let pair: GitPair = { repo: undefined, tag: undefined };

    cmakeFile.split(/\r?\n/).forEach((line) => {
        if(line.includes('FetchContent_Declare')) {
            readingFetch = true;
        }

        if(readingFetch) {
            // Parse repo
            if(line.includes('GIT_REPOSITORY')) {
                pair.repo = line;
            }

            // Parse tag
            if(line.includes('GIT_TAG')) {
                pair.tag = line;
            }

            if(line.includes(')')) {
                readingFetch = false;

                // Push repo-tag pair and clear it 
                if(pair.repo && pair.tag) {
                    pairs.push({...pair});
                    pair.repo = undefined;
                    pair.tag = undefined;
                }
            }
        }
    });

    console.log(`pairs: ${JSON.stringify(pairs)}`);

    return 4;
}
