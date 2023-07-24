"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.getCMakeListsFromFileApi = exports.parseCMakeListsFiles = exports.createBuildTarget = exports.extractFetchContentGitDetails = exports.parsePackageType = exports.parseNamespaceAndName = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const fs_1 = require("fs");
const glob_1 = require("glob");
const packageurl_js_1 = require("packageurl-js");
const path_1 = require("path");
const url_1 = require("url");
const dependency_submission_toolkit_1 = require("@github/dependency-submission-toolkit");
const scanModeGlob = 'glob';
const scanModeConfigure = 'configure';
function normalizeCMakeArgument(value) {
    return value.replace(/[")]+/g, '');
}
function getArgumentForKeyword(keyword, line) {
    const array = line.slice(line.indexOf(keyword)).split(/\s+/);
    return normalizeCMakeArgument(array[array.findIndex((value) => value === keyword) + 1]);
}
function parseNamespaceAndName(repo) {
    const url = new url_1.URL(repo);
    const components = url.pathname.split('/').reverse();
    if (components.length > 2 && components[0].length > 0) {
        return [
            encodeURIComponent(components[1].toLowerCase()),
            encodeURIComponent(components[0].replace('.git', '').toLowerCase())
        ];
    }
    throw new Error(`expectation violated: Git URL '${repo}' has an invalid format`);
}
exports.parseNamespaceAndName = parseNamespaceAndName;
function parsePackageType(repo) {
    // Supported types taken from: https://github.com/package-url/purl-spec/blob/master/PURL-TYPES.rst
    const purlTypes = ['github', 'bitbucket'];
    const url = new url_1.URL(repo);
    for (const type of purlTypes)
        if (url.hostname.includes(type))
            return type;
    return 'generic';
}
exports.parsePackageType = parsePackageType;
function extractFetchContentGitDetails(content) {
    let purls = [];
    let readingFetch = false;
    let repo = undefined;
    let tag = undefined;
    content.split(/\r?\n/).forEach((line) => {
        if (line.includes('cmake-dependency-scan')) {
            line.split(/\s+/).forEach(element => {
                if (element.startsWith('pkg:'))
                    purls.push(packageurl_js_1.PackageURL.fromString(element));
            });
        }
        if (line.includes('FetchContent_Declare'))
            readingFetch = true;
        if (readingFetch) {
            const gitRepositoryKeyword = 'GIT_REPOSITORY';
            const gitTagKeword = 'GIT_TAG';
            if (line.includes(gitRepositoryKeyword))
                repo = getArgumentForKeyword(gitRepositoryKeyword, line);
            if (line.includes(gitTagKeword))
                tag = getArgumentForKeyword(gitTagKeword, line);
            if (line.includes(')')) {
                readingFetch = false;
                if (repo && tag) {
                    const [namespace, name] = parseNamespaceAndName(repo);
                    const type = parsePackageType(repo);
                    purls.push(new packageurl_js_1.PackageURL(type, namespace, name, tag, null, null));
                    repo = undefined;
                    tag = undefined;
                }
            }
        }
    });
    return purls;
}
exports.extractFetchContentGitDetails = extractFetchContentGitDetails;
function createBuildTarget(name, dependencies) {
    const buildTarget = new dependency_submission_toolkit_1.BuildTarget(name, name);
    const cache = new dependency_submission_toolkit_1.PackageCache();
    dependencies.forEach(purl => {
        buildTarget.addBuildDependency(cache.package(purl));
    });
    return buildTarget;
}
exports.createBuildTarget = createBuildTarget;
function parseCMakeListsFiles(files) {
    let buildTargets = [];
    const cache = new dependency_submission_toolkit_1.PackageCache();
    files.forEach(file => {
        const content = (0, fs_1.readFileSync)(file, 'utf-8');
        const dependencies = extractFetchContentGitDetails(content);
        if (dependencies.length > 0) {
            const relativePath = (0, path_1.relative)(core.getInput('sourcePath'), file);
            const buildTarget = new dependency_submission_toolkit_1.BuildTarget(relativePath, relativePath);
            dependencies.forEach(dependency => {
                buildTarget.addBuildDependency(cache.package(dependency));
            });
            buildTargets.push(buildTarget);
        }
    });
    return buildTargets;
}
exports.parseCMakeListsFiles = parseCMakeListsFiles;
function getCMakeListsFromFileApi(buildPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const cmakeApiPath = (0, path_1.join)(buildPath, '.cmake', 'api', 'v1');
        (0, fs_1.mkdirSync)((0, path_1.join)(cmakeApiPath, 'query'), { recursive: true });
        (0, fs_1.writeFileSync)((0, path_1.join)(cmakeApiPath, 'query', 'cmakeFiles-v1'), '');
        const cmakeCommand = yield exec.getExecOutput('cmake', ['.'], { cwd: buildPath });
        if (cmakeCommand.exitCode !== 0) {
            core.error(cmakeCommand.stderr);
            throw Error(`running 'cmake .' failed!`);
        }
        let cmakeFiles = [];
        const resultFiles = (0, glob_1.globSync)((0, path_1.join)(cmakeApiPath, 'reply', 'cmakeFiles-v1-*.json'));
        resultFiles.forEach(file => {
            const jsonResult = JSON.parse((0, fs_1.readFileSync)(file).toString());
            for (const input of jsonResult.inputs)
                if (!input.isCMake) // If isCMake is true, it's a CMake 'internal' module; included in the CMake installation
                 {
                    const path = (0, path_1.isAbsolute)(input.path) ? input.path : (0, path_1.join)(jsonResult.paths.source, input.path);
                    cmakeFiles = cmakeFiles.concat(path);
                }
        });
        return cmakeFiles;
    });
}
exports.getCMakeListsFromFileApi = getCMakeListsFromFileApi;
function getCMakeFiles(scanMode, sourcePath, buildPath) {
    return __awaiter(this, void 0, void 0, function* () {
        let cmakeFiles = [];
        if (scanMode === scanModeGlob)
            cmakeFiles = (0, glob_1.globSync)([(0, path_1.join)(sourcePath, '**', 'CMakeLists.txt'), (0, path_1.join)(sourcePath, '**', '*.cmake')]);
        else if (scanMode === scanModeConfigure)
            cmakeFiles = yield getCMakeListsFromFileApi(buildPath);
        else
            throw Error(`invalid scanMode selected. Please choose either '${scanModeGlob}' or '${scanModeConfigure}'`);
        return cmakeFiles;
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const sourcePath = core.getInput('sourcePath');
            const buildPath = core.getInput('buildPath');
            const scanMode = core.getInput('scanMode');
            if (scanMode === scanModeConfigure && buildPath.length === 0)
                throw Error(`buildPath input is required when using ${scanModeConfigure} scanMode`);
            core.startGroup('Parsing CMake files...');
            const cmakeFiles = yield getCMakeFiles(scanMode, sourcePath, buildPath);
            core.info(`Scanning dependencies for ${cmakeFiles.join(', ')}`);
            const buildTargets = parseCMakeListsFiles(cmakeFiles);
            core.endGroup();
            core.startGroup('Submitting dependencies...');
            const snapshot = new dependency_submission_toolkit_1.Snapshot({
                name: 'cmake-dependency-submission',
                url: 'https://github.com/philips-forks/cmake-dependency-submission',
                version: '0.1.0' // x-release-please-version
            });
            buildTargets.forEach(buildTarget => {
                snapshot.addManifest(buildTarget);
            });
            (0, dependency_submission_toolkit_1.submitSnapshot)(snapshot);
            core.endGroup();
        }
        catch (err) {
            core.setFailed(`Action failed with ${err}`);
        }
    });
}
exports.main = main;
