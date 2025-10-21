#!/bin/bash
# Build script for Fast Protocol

set -e  # Exit on error

echo "================================"
echo "Fast Protocol Build Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check Rust
    if ! command -v cargo &> /dev/null; then
        echo -e "${RED}Error: Rust/Cargo not found. Please install from https://rustup.rs/${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Rust/Cargo found${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}Warning: Node.js not found. Node.js bindings will be skipped.${NC}"
    else
        echo -e "${GREEN}✓ Node.js found${NC}"
    fi
    
    # Check wasm-pack
    if ! command -v wasm-pack &> /dev/null; then
        echo -e "${YELLOW}Warning: wasm-pack not found. WASM bindings will be skipped.${NC}"
    else
        echo -e "${GREEN}✓ wasm-pack found${NC}"
    fi
    
    echo ""
}

# Build Rust core
build_rust() {
    echo "Building Rust core..."
    cd rust-core
    cargo build --release
    cargo test --release
    cd ..
    echo -e "${GREEN}✓ Rust core built successfully${NC}"
    echo ""
}

# Build Node.js bridge
build_nodejs() {
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}Skipping Node.js bridge (Node.js not found)${NC}"
        return
    fi
    
    echo "Building Node.js bridge..."
    cd node-bridge
    npm install
    npm run build
    cd ..
    echo -e "${GREEN}✓ Node.js bridge built successfully${NC}"
    echo ""
}

# Build WASM
build_wasm() {
    if ! command -v wasm-pack &> /dev/null; then
        echo -e "${YELLOW}Skipping WASM (wasm-pack not found)${NC}"
        return
    fi
    
    echo "Building WASM module..."
    cd wasm
    wasm-pack build --target web --out-dir pkg
    cd ..
    echo -e "${GREEN}✓ WASM module built successfully${NC}"
    echo ""
}

# Build examples
build_examples() {
    echo "Building examples..."
    cd examples/rust
    cargo build --release
    cd ../..
    echo -e "${GREEN}✓ Examples built successfully${NC}"
    echo ""
}

# Main build process
main() {
    check_prerequisites
    
    echo "Starting build process..."
    echo ""
    
    build_rust
    build_nodejs
    build_wasm
    build_examples
    
    echo "================================"
    echo -e "${GREEN}Build completed successfully!${NC}"
    echo "================================"
    echo ""
    echo "Next steps:"
    echo "  1. Run examples: cd examples/rust && cargo run --bin server"
    echo "  2. Run tests: cd rust-core && cargo test"
    echo "  3. See README.md for more information"
    echo ""
}

# Run main
main

