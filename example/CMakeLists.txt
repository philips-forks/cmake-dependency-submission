cmake_minimum_required(VERSION 3.24)
project(cmake-example VERSION 1.0.0 LANGUAGES CXX)

include(FetchContent)
FetchContent_Declare(
    emil
    GIT_REPOSITORY https://github.com/philips-software/amp-embedded-infra-lib
    GIT_TAG v4.0.0
    GIT_PROGRESS TRUE
)
FetchContent_MakeAvailable(emil)

# Example of annotated dependency
# cmake-dependency-scan pkg:github/google/googletest@v1.13.0

add_executable(cmake-example main.cpp)
target_link_libraries(cmake-example PRIVATE infra.util)
