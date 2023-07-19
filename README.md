<div align="center">
<img src="https://user-images.githubusercontent.com/17342434/204997817-e8f9273d-d3d9-4869-9d9a-94d0889acf3d.png" alt="C++ Logo" width="100"/>
</div>

<h1 align="center">
CMake Dependency Submission
</h1>

Calculates dependencies for a CMake project and submits the list to the Dependency Submission API

## Github dependency graph
![2022-12-01_09-57](https://user-images.githubusercontent.com/17342434/204997995-1955d053-87f4-464f-8e02-e36fa807d0b1.png)

## Setup

```yml
name: CMake Dependency Submission
on:
  push:
    branches:
      - main

jobs:
  dependency-submission:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Dependency Submission
        uses: philips-forks/cmake-dependency-submission@main
```

## License
This project is licensed under the MIT License - check [LICENSE](LICENSE) for details.
