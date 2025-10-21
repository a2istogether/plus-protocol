# Makefile for Fast Protocol

.PHONY: all build clean test docs help install-deps

# Default target
all: build

# Help
help:
	@echo "Fast Protocol - Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  make build         - Build all components"
	@echo "  make build-rust    - Build Rust core"
	@echo "  make build-node    - Build Node.js bridge"
	@echo "  make build-wasm    - Build WASM module"
	@echo "  make test          - Run all tests"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make docs          - Generate documentation"
	@echo "  make install-deps  - Install dependencies"
	@echo "  make examples      - Build examples"
	@echo ""

# Install dependencies
install-deps:
	@echo "Installing dependencies..."
	@command -v cargo >/dev/null 2>&1 || { echo "Installing Rust..."; curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh; }
	@command -v wasm-pack >/dev/null 2>&1 || { echo "Installing wasm-pack..."; cargo install wasm-pack; }
	@echo "Dependencies installed!"

# Build all
build: build-rust build-node build-wasm build-examples
	@echo "All components built successfully!"

# Build Rust core
build-rust:
	@echo "Building Rust core..."
	cd rust-core && cargo build --release

# Build Node.js bridge
build-node:
	@echo "Building Node.js bridge..."
	@if command -v node >/dev/null 2>&1; then \
		cd node-bridge && npm install && npm run build; \
	else \
		echo "Node.js not found, skipping..."; \
	fi

# Build WASM
build-wasm:
	@echo "Building WASM module..."
	@if command -v wasm-pack >/dev/null 2>&1; then \
		cd wasm && wasm-pack build --target web --out-dir pkg; \
	else \
		echo "wasm-pack not found, skipping..."; \
	fi

# Build examples
build-examples:
	@echo "Building examples..."
	cd examples/rust && cargo build --release

# Run tests
test: test-rust test-node
	@echo "All tests passed!"

test-rust:
	@echo "Testing Rust core..."
	cd rust-core && cargo test --release

test-node:
	@echo "Testing Node.js bridge..."
	@if command -v node >/dev/null 2>&1; then \
		cd node-bridge && npm test; \
	else \
		echo "Node.js not found, skipping..."; \
	fi

# Clean
clean:
	@echo "Cleaning build artifacts..."
	cd rust-core && cargo clean
	cd examples/rust && cargo clean
	rm -rf node-bridge/dist node-bridge/node_modules
	rm -rf wasm/pkg wasm/target
	@echo "Clean complete!"

# Generate documentation
docs:
	@echo "Generating documentation..."
	cd rust-core && cargo doc --no-deps --open

# Run server example
run-server:
	cd examples/rust && cargo run --bin server --release

# Run client example
run-client:
	cd examples/rust && cargo run --bin client --release

# Format code
fmt:
	@echo "Formatting code..."
	cd rust-core && cargo fmt
	cd examples/rust && cargo fmt

# Check code
check:
	@echo "Checking code..."
	cd rust-core && cargo check
	cd examples/rust && cargo check

# Clippy linting
clippy:
	@echo "Running clippy..."
	cd rust-core && cargo clippy -- -D warnings
	cd examples/rust && cargo clippy -- -D warnings

# Benchmark
bench:
	@echo "Running benchmarks..."
	cd rust-core && cargo bench

# Watch and rebuild on changes
watch:
	cd rust-core && cargo watch -x build

