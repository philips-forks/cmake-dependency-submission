cmake_minimum_required(VERSION 3.14)
project(cmake-example VERSION 1.0.0 LANGUAGES CXX)

FetchContent_Declare(
    mbedtls
    GIT_REPOSITORY https://github.com/Mbed-TLS/mbedtls
    GIT_TAG 2297157dd6236e4a5c2f46c84c401599ef639cf5
    GIT_PROGRESS TRUE
)
FetchContent_MakeAvailable(mbedtls)

add_executable(cmake-example main.cpp)
target_link_libraries(cmake-example PRIVATE mbedtls)
