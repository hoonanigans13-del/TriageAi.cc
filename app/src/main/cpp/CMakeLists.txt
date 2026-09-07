cmake_minimum_required(VERSION 3.22.1)
project(triage_ai_llama)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_definitions(-DGGML_USE_KQUANT)
add_definitions(-DGGML_VERSION="1")
add_definitions(-DGGML_COMMIT="unknown")

include_directories(
    ${CMAKE_SOURCE_DIR}/llama
    ${CMAKE_SOURCE_DIR}/llama/ggml-cpu
)

file(GLOB_RECURSE LLAMA_SOURCES
    ${CMAKE_SOURCE_DIR}/llama/*.cpp
    ${CMAKE_SOURCE_DIR}/llama/*.c
)

# Exclude problematic and unnecessary files for the bridge
list(FILTER LLAMA_SOURCES EXCLUDE REGEX "sampling\\.cpp")
list(FILTER LLAMA_SOURCES EXCLUDE REGEX "llama-model\\.cpp")
list(FILTER LLAMA_SOURCES EXCLUDE REGEX "llama-sampler\\.cpp")
list(FILTER LLAMA_SOURCES EXCLUDE REGEX "kleidiai/.*")
list(FILTER LLAMA_SOURCES EXCLUDE REGEX "spacemit/.*")
list(FILTER LLAMA_SOURCES EXCLUDE REGEX "amx/.*")

add_library(
    triage_llama
    SHARED
    ${LLAMA_SOURCES}
    triage_bridge.cpp
)

find_library(
    log-lib
    log
)

target_link_libraries(
    triage_llama
    ${log-lib}
)
