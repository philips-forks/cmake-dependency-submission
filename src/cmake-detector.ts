import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { globSync } from 'glob'
import { PackageURL } from 'packageurl-js'
import { relative, isAbsolute, join } from 'path'
import { URL } from 'url'
import {
    PackageCache,
    BuildTarget,
    Snapshot,
    submitSnapshot
} from '@github/dependency-submission-toolkit'

const scanModeGlob = 'glob'
const scanModeConfigure = 'configure'

function normalizeCMakeArgument(value: string): string {
    return value.replace(/[")]+/g, '')
}

function getArgumentForKeyword(keyword: string, line: string): string {
    const array = line.slice(line.indexOf(keyword)).split(/\s+/)
    return normalizeCMakeArgument(array[array.findIndex((value) => value === keyword) + 1])
}

export function parseNamespaceAndName(repo: string): [string, string] {
    const url = new URL(repo)
    const components = url.pathname.split('/').reverse()

    if (components.length > 2 && components[0].length > 0) {
        return [
            encodeURIComponent(components[1].toLowerCase()),
            encodeURIComponent(components[0].replace('.git', '').toLowerCase())
        ]
    }

    throw new Error(
      `expectation violated: Git URL '${repo}' has an invalid format`
    )
}

export function parsePackageType(repo: string): string {
    // Supported types taken from: https://github.com/package-url/purl-spec/blob/master/PURL-TYPES.rst
    const purlTypes = ['github', 'bitbucket']
    const url = new URL(repo)

    for (const type of purlTypes)
        if (url.hostname.includes(type))
            return type

    return 'generic'
}

export function extractFetchContentGitDetails(content: string): Array<PackageURL> {
    let purls: Array<PackageURL> = []
    let readingFetch: boolean = false
    let repo: string | undefined = undefined
    let tag: string | undefined = undefined

    content.split(/\r?\n/).forEach((line) => {
        if (line.includes('cmake-dependency-scan'))
        {
            line.split(/\s+/).forEach(element => {
                if (element.startsWith('pkg:'))
                    purls.push(PackageURL.fromString(element))
            });
        }

        if (line.includes('FetchContent_Declare'))
            readingFetch = true

        if (readingFetch) {
            const gitRepositoryKeyword = 'GIT_REPOSITORY'
            const gitTagKeword = 'GIT_TAG'

            if (line.includes(gitRepositoryKeyword))
                repo = getArgumentForKeyword(gitRepositoryKeyword, line)

            if (line.includes(gitTagKeword))
                tag = getArgumentForKeyword(gitTagKeword, line)

            if (line.includes(')')) {
                readingFetch = false

                if (repo && tag) {
                    const [namespace, name] = parseNamespaceAndName(repo)
                    const type = parsePackageType(repo)

                    purls.push(new PackageURL(type, namespace, name, tag, null, null))
                    repo = undefined
                    tag = undefined
                }
            }
        }
    })

    return purls
}

export function createBuildTarget(name: string, dependencies: Array<PackageURL>): BuildTarget {
    const buildTarget = new BuildTarget(name, name)
    const cache = new PackageCache()

    dependencies.forEach(purl => {
        buildTarget.addBuildDependency(cache.package(purl))
    })

    return buildTarget
}

export function parseCMakeListsFiles(files: string[]): Array<BuildTarget> {
    let buildTargets: Array<BuildTarget> = []
    const cache = new PackageCache()

    files.forEach(file => {
        const content = readFileSync(file, 'utf-8')
        const dependencies = extractFetchContentGitDetails(content)

        if (dependencies.length > 0)
        {
            const relativePath = relative(core.getInput('sourcePath'), file)
            const buildTarget = new BuildTarget(relativePath, relativePath)
        
            dependencies.forEach(dependency => {
                buildTarget.addBuildDependency(cache.package(dependency))
            })
        
            buildTargets.push(buildTarget)
        }
    })

    return buildTargets
}

export async function getCMakeListsFromFileApi(buildPath: string): Promise<string[]> {
    const cmakeApiPath = join(buildPath, '.cmake', 'api', 'v1')

    mkdirSync(join(cmakeApiPath, 'query'), { recursive: true })
    writeFileSync(join(cmakeApiPath, 'query', 'cmakeFiles-v1'), '')

    const cmakeCommand = await exec.getExecOutput(
        'cmake',
        ['.'],
        { cwd: buildPath }
    )

    if (cmakeCommand.exitCode !== 0) {
        core.error(cmakeCommand.stderr)

        throw Error(`running 'cmake .' failed!`)
    }

    let cmakeFiles: Array<string> = []
    const resultFiles = globSync(join(cmakeApiPath, 'reply', 'cmakeFiles-v1-*.json'))
    resultFiles.forEach(file => {
        const jsonResult = JSON.parse(readFileSync(file).toString())

        for (const input of jsonResult.inputs)
            if (!input.isCMake) // If isCMake is true, it's a CMake 'internal' module; included in the CMake installation
            {
                const path = isAbsolute(input.path) ? input.path : join(jsonResult.paths.source, input.path)
                cmakeFiles = cmakeFiles.concat(path)
            }
    })

    return cmakeFiles
}

async function getCMakeFiles(scanMode: string, sourcePath: string, buildPath: string) {
    let cmakeFiles: Array<string> = []

    if (scanMode === scanModeGlob)
        cmakeFiles = globSync([join(sourcePath, '**', 'CMakeLists.txt'), join(sourcePath, '**', '*.cmake')])
    else if (scanMode === scanModeConfigure)
        cmakeFiles = await getCMakeListsFromFileApi(buildPath)
    else
        throw Error(`invalid scanMode selected. Please choose either '${ scanModeGlob }' or '${ scanModeConfigure }'`)

    return cmakeFiles
}

export async function main() {
    try {
        const sourcePath = core.getInput('sourcePath')
        const buildPath = core.getInput('buildPath')
        const scanMode = core.getInput('scanMode')

        if (scanMode === scanModeConfigure && buildPath.length === 0)
            throw Error(`buildPath input is required when using ${ scanModeConfigure } scanMode`)

        core.startGroup('Parsing CMake files...')
        const cmakeFiles = await getCMakeFiles(scanMode, sourcePath, buildPath)
        core.info(`Scanning dependencies for ${ cmakeFiles.join(', ') }`)
        const buildTargets = parseCMakeListsFiles(cmakeFiles)
        core.endGroup()

        core.startGroup('Submitting dependencies...')
        const snapshot = new Snapshot({
            name: 'cmake-dependency-submission',
            url: 'https://github.com/philips-forks/cmake-dependency-submission',
            version: '0.1.0' // x-release-please-version
        })

        buildTargets.forEach(buildTarget => {
            snapshot.addManifest(buildTarget)
        })
        submitSnapshot(snapshot)
        core.endGroup()
    }
    catch (err) {
        core.setFailed(`Action failed with ${ err }`)
    }
}
