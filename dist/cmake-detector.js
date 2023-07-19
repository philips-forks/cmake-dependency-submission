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
exports.main = exports.createBuildTarget = exports.dependenciesToPackages = exports.parsePackageType = exports.parseNamespaceAndName = exports.parseCMakeListsFiles = exports.extractFetchContentGitDetails = void 0;
const core = __importStar(require("@actions/core"));
const fs_1 = require("fs");
const glob_1 = require("glob");
const packageurl_js_1 = require("packageurl-js");
const path_1 = require("path");
const url_1 = require("url");
const dependency_submission_toolkit_1 = require("@github/dependency-submission-toolkit");
function normalizeCMakeArgument(value) {
    return value.replace(/[")]+/g, '');
}
function getArgumentForKeyword(keyword, line) {
    const array = line.slice(line.indexOf(keyword)).split(/\s+/);
    return normalizeCMakeArgument(array[array.findIndex((value) => value == keyword) + 1]);
}
function extractFetchContentGitDetails(content) {
    let pairs = [];
    let readingFetch = false;
    let repo = undefined;
    let tag = undefined;
    content.split(/\r?\n/).forEach((line) => {
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
                    pairs.push({ repo: repo, tag: tag });
                    repo = undefined;
                    tag = undefined;
                }
            }
        }
    });
    return pairs;
}
exports.extractFetchContentGitDetails = extractFetchContentGitDetails;
function parseCMakeListsFiles(files) {
    let buildTargets = [];
    files.forEach(file => {
        const content = (0, fs_1.readFileSync)(file, 'utf-8');
        const dependencies = extractFetchContentGitDetails(content);
        buildTargets = buildTargets.concat(createBuildTarget((0, path_1.relative)(core.getInput('sourcePath'), file), dependencies));
    });
    return buildTargets;
}
exports.parseCMakeListsFiles = parseCMakeListsFiles;
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
    const purlTypes = ['github', 'bitbucket']; // From: https://github.com/package-url/purl-spec/blob/master/PURL-TYPES.rst
    const url = new url_1.URL(repo);
    for (const type of purlTypes)
        if (url.hostname.includes(type))
            return type;
    return 'generic';
}
exports.parsePackageType = parsePackageType;
function dependenciesToPackages(cache, dependencies) {
    return dependencies.map((git) => {
        const [namespace, name] = parseNamespaceAndName(git.repo);
        const type = parsePackageType(git.repo);
        const purl = new packageurl_js_1.PackageURL(type, namespace, name, git.tag, null, null);
        return cache.package(purl);
    });
}
exports.dependenciesToPackages = dependenciesToPackages;
function createBuildTarget(name, dependencies) {
    const cache = new dependency_submission_toolkit_1.PackageCache();
    const packages = dependenciesToPackages(cache, dependencies);
    const buildTarget = new dependency_submission_toolkit_1.BuildTarget(name, name);
    packages.forEach(p => {
        buildTarget.addBuildDependency(p);
    });
    return buildTarget;
}
exports.createBuildTarget = createBuildTarget;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const sourcePath = core.getInput('sourcePath');
            const cmakeFiles = (0, glob_1.globSync)([sourcePath + '/**/CMakeLists.txt', sourcePath + '/**/*.cmake']);
            core.startGroup('Parsing CMake files...');
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
