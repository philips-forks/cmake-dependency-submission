cmake_minimum_required(VERSION 3.14)
project(cmake-example VERSION 1.0.0 LANGUAGES CXX)

# Example linking glfw library
find_package(glfw)
if(glfw_FOUND)
    message(STATUS "GLFW found")
else()
    message(STATUS "GLFW not found, fetch from GitHub")
    include(FetchContent)
    FetchContent_Declare(
        glfw
        GIT_REPOSITORY "https://github.com/glfw/glfw"
        GIT_TAG "3.3.8"
        GIT_PROGRESS TRUE
    )
    FetchContent_MakeAvailable(glfw)
endif()

# Create cmake-example executable
add_executable(cmake-example "main.cpp")
target_link_libraries(cmake-example PRIVATE glfw)
