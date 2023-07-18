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
exports.main = exports.createBuildTarget = exports.parseDependencies = exports.parseNamespaceAndName = exports.parseCMakeListsFiles = exports.parseCMakeListsFile = exports.extractFetchContentGitDetails = void 0;
const core = __importStar(require("@actions/core"));
const fs_1 = require("fs");
const glob_1 = require("glob");
const packageurl_js_1 = require("packageurl-js");
const dependency_submission_toolkit_1 = require("@github/dependency-submission-toolkit");
function normalizeArgument(value) {
    return value.replace(/[")]+/g, '');
}
function getArgumentForKeyword(keyword, line) {
    const array = line.slice(line.indexOf(keyword)).split(/\s+/);
    return normalizeArgument(array[array.findIndex((value) => value == keyword) + 1]);
}
function extractFetchContentGitDetails(content) {
    let pairs = [];
    let readingFetch = false;
    let pair = { repo: undefined, tag: undefined };
    content.split(/\r?\n/).forEach((line) => {
        if (line.includes('FetchContent_Declare')) {
            readingFetch = true;
        }
        if (readingFetch) {
            const gitRepositoryKeyword = 'GIT_REPOSITORY';
            const gitTagKeword = 'GIT_TAG';
            if (line.includes(gitRepositoryKeyword)) {
                pair.repo = getArgumentForKeyword(gitRepositoryKeyword, line);
            }
            if (line.includes(gitTagKeword)) {
                pair.tag = getArgumentForKeyword(gitTagKeword, line);
            }
            if (line.includes(')')) {
                readingFetch = false;
                if (pair.repo && pair.tag) {
                    pairs.push(Object.assign({}, pair));
                    pair = { repo: undefined, tag: undefined };
                }
            }
        }
    });
    return pairs;
}
exports.extractFetchContentGitDetails = extractFetchContentGitDetails;
function parseCMakeListsFile(file) {
    const content = (0, fs_1.readFileSync)(file, 'utf-8');
    return extractFetchContentGitDetails(content);
}
exports.parseCMakeListsFile = parseCMakeListsFile;
function parseCMakeListsFiles(files) {
    let dependencies = [];
    files.forEach(file => {
        dependencies = dependencies.concat(parseCMakeListsFile(file));
    });
    return dependencies;
}
exports.parseCMakeListsFiles = parseCMakeListsFiles;
function parseNamespaceAndName(repo) {
    const components = repo === null || repo === void 0 ? void 0 : repo.split('/').reverse();
    if ((components === null || components === void 0 ? void 0 : components.length) && (components === null || components === void 0 ? void 0 : components.length) > 2) {
        return [
            encodeURIComponent(components[1]),
            encodeURIComponent(components[0].replace('.git', ''))
        ];
    }
    throw new Error(`expectation violated: Git URL '${repo}' has an invalid format`);
}
exports.parseNamespaceAndName = parseNamespaceAndName;
function parseDependencies(cache, dependencies) {
    return dependencies.map((git) => {
        const [namespace, name] = parseNamespaceAndName(git.repo);
        const purl = new packageurl_js_1.PackageURL('github', namespace, name, git.tag, null, null);
        if (cache.hasPackage(purl))
            return cache.package(purl);
        return cache.package(purl);
    });
}
exports.parseDependencies = parseDependencies;
function createBuildTarget(name, dependencies) {
    const cache = new dependency_submission_toolkit_1.PackageCache();
    const packages = parseDependencies(cache, dependencies);
    const buildTarget = new dependency_submission_toolkit_1.BuildTarget(name);
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
            core.info(`Scanning dependencies for ${cmakeFiles.join(', ')}`);
            const dependencies = parseCMakeListsFiles(cmakeFiles);
            core.info(`Found dependencies: ${JSON.stringify(dependencies)}`);
            const buildTarget = createBuildTarget('name', dependencies);
            const snapshot = new dependency_submission_toolkit_1.Snapshot({
                name: 'cmake-dependency-submission',
                url: 'https://github.com/philips-forks/cmake-dependency-submission',
                version: '0.1.0' // x-release-please-version
            });
            snapshot.addManifest(buildTarget);
            (0, dependency_submission_toolkit_1.submitSnapshot)(snapshot);
        }
        catch (err) {
            core.setFailed(`Action failed with ${err}`);
        }
    });
}
exports.main = main;
