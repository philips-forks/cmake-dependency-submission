<div align="center">
<img src="https://user-images.githubusercontent.com/17342434/204997817-e8f9273d-d3d9-4869-9d9a-94d0889acf3d.png" alt="C++ Logo" width="100"/>
</div>

<h1 align="center">
CMake Dependency Submission
</h1>

This GitHub Action identifies dependencies for a CMake project that uses [FetchContent](https://cmake.org/cmake/help/latest/module/FetchContent.html), and submits the results to the [Dependency Submission API](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/using-the-dependency-submission-api). Dependencies then appear in your repository's [dependency graph](https://github.com/philips-forks/cmake-dependency-submission/network/dependencies) and can, for example, be exported to an SBOM file.

## Usage

This Action can be used in two different modes, depending on how the list of CMake files to scan should be determined:

- [Glob mode](#glob-mode) (*default*); CMakeLists.txt and *.cmake files will be found by recursively globbing from the optionally provided sourcePath.
- [Configure mode](#configure-mode); CMake files will be found by querying the [CMake File API](https://cmake.org/cmake/help/latest/manual/cmake-file-api.7.html#manual:cmake-file-api(7)). In configure mode it is mandatory to run the CMake configure step before this action is ran.

Glob mode is faster, but configure mode is more accurate. Configure mode will recursively detect FetchContent dependencies. Configure mode will not include CMake files that are part of the source tree, but not included in the configured build.

See [action.yml](action.yml) for all valid inputs.
See [dependency-submission.yml](.github/workflows/dependency-submission.yml) for an example scan on this repository.

> **&#9432;** please note that the Dependency Submission API requires `contents: write` persmissions.

### Glob mode

```yml
name: CMake Dependency Submission

on:
  push:
    branches:
      - main

jobs:
  dependency-submission:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v3
      - uses: philips-forks/cmake-dependency-submission@main
```

### Configure mode

```yml
name: CMake Dependency Submission

on:
  push:
    branches:
      - main

jobs:
  dependency-submission:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v3
      - run: cmake -S example -B build
      - uses: philips-forks/cmake-dependency-submission@main
        with:
          scanMode: 'configure'
          buildPath: 'build'
```

## Non-FetchContent dependencies

When an external dependency is not FetchContent-compatible, or there is another reason to consume a dependency without using FetchContent, the dependency can still be detected by this Action using an annotation in a CMake file.

The annotation should be in the following format:

`# cmake-dependency-scan [package-url]`

Where `[package-url]` should be a valid [Package URL](https://github.com/package-url/purl-spec) like `pkg:github/google/googletest@v1.13.0`

## License

This project is licensed under the [MIT](https://choosealicense.com/licenses/mit/) license. See [LICENSE](LICENSE) for details.
