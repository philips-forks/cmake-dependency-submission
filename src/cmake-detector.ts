import * as core from '@actions/core'
import { readFileSync } from 'fs';
import { globSync } from 'glob'
import { PackageURL } from 'packageurl-js'
import {
    PackageCache,
    BuildTarget,
    Package,
    Snapshot,
    submitSnapshot
} from '@github/dependency-submission-toolkit'

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

export function parseCMakeListsFile(file: string): Array<GitPair> {
    const content = readFileSync(file, 'utf-8');
    return extractFetchContentGitDetails(content);
}

export function parseCMakeListsFiles(files: string[]): Array<GitPair> {
    let dependencies: Array<GitPair> = []

    files.forEach(file => {
        dependencies = dependencies.concat(parseCMakeListsFile(file))
    });

    return dependencies
}

export function parseNamespaceAndName(repo: string | undefined): [string, string] {
    const components = repo?.split('/').reverse()

    if (components?.length && components?.length > 2) {
        return [
            encodeURIComponent(components[1]),
            encodeURIComponent(components[0].replace('.git', ''))
        ]
    }

    throw new Error(
      `expectation violated: Git URL '${repo}' has an invalid format`
    )
}

export function parseDependencies(cache: PackageCache, dependencies: Array<GitPair>): Array<Package> {
    return dependencies.map((git) => {
        const [namespace, name] = parseNamespaceAndName(git.repo)
        const purl = new PackageURL('github', namespace, name, git.tag, null, null)

        if (cache.hasPackage(purl))
            return cache.package(purl)

        return cache.package(purl)
    })
}

export function createBuildTarget(name: string, dependencies: Array<GitPair>): BuildTarget {
    const cache = new PackageCache()
    const packages = parseDependencies(cache, dependencies)
    const buildTarget = new BuildTarget(name)

    packages.forEach(p => {
        buildTarget.addBuildDependency(p)
    });

    return buildTarget
}

export async function main() {
    try {
        const sourcePath = core.getInput('sourcePath')
        const cmakeFiles = globSync([sourcePath + '/**/CMakeLists.txt', sourcePath + '/**/*.cmake'])

        core.info(`Scanning dependencies for ${ cmakeFiles.join(', ') }`)

        const dependencies = parseCMakeListsFiles(cmakeFiles)

        core.info(`Found dependencies: ${ JSON.stringify(dependencies) }`);

        const buildTarget = createBuildTarget('name', dependencies)
        const snapshot = new Snapshot({
            name: 'cmake-dependency-submission',
            url: 'https://github.com/philips-forks/cmake-dependency-submission',
            version: '0.1.0' // x-release-please-version
        })

        snapshot.addManifest(buildTarget)
        submitSnapshot(snapshot)
    }
    catch (err) {
        core.setFailed(`Action failed with ${err}`)
    }
}
