<div align="center">
<img src="https://raw.githubusercontent.com/isocpp/logos/master/cpp_logo.png" alt="C++ Logo" width="100" height="100" />
</div>

<h1 align="center">
CMake Dependency Submission
</h1>

Calculates dependencies for a cmake project and submits the list to the Dependency Submission API

## Setup

```yml
name: CMake Dependency Submission
on:
  push:
    branches:
      - main

jobs:
  dependencies:
    name: Dependencies
    runs-on: ubuntu-latest
    permissions: # The Dependency Submission API requires write permission
      contents: write
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Dependency Submission
        uses: brenocq/cmake-dependency-submission
        with:
          testing-action: "Hello world!"
```


## License
This project is licensed under the MIT License - check [LICENSE](LICENSE) for details.
