# Setup Instructions

Complete guide to setting up and running Fast Protocol on your system.

## Prerequisites

### Required

- **Rust 1.70+**: Install from [rustup.rs](https://rustup.rs/)
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

### Optional (for specific features)

- **Node.js 16+**: For Node.js bindings
  ```bash
  # Using nvm
  nvm install 16
  nvm use 16
  ```

- **wasm-pack**: For WebAssembly support
  ```bash
  cargo install wasm-pack
  ```

- **Swift 5.9+**: For iOS development (macOS only)
  - Install Xcode from App Store

- **Android Studio**: For Android development
  - Download from [developer.android.com](https://developer.android.com/studio)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourorg/fast-protocol
cd fast-protocol
```

### 2. Quick Setup (Recommended)

**Linux/macOS:**
```bash
chmod +x build.sh
./build.sh
```

**Windows:**
```powershell
.\build.ps1
```

**Using Make:**
```bash
make install-deps
make build
```

### 3. Manual Setup

#### Build Rust Core

```bash
cd rust-core
cargo build --release
cargo test
cd ..
```

#### Build Node.js Bridge

```bash
cd node-bridge
npm install
npm run build
cd ..
```

#### Build WASM Module

```bash
cd wasm
wasm-pack build --target web
cd ..
```

#### Build Examples

```bash
cd examples/rust
cargo build --release
cd ../..
```

## Verification

### Run Tests

```bash
# All tests
make test

# Or individually
cd rust-core && cargo test
cd node-bridge && npm test
```

### Run Examples

**Terminal 1 (Server):**
```bash
cd examples/rust
cargo run --bin server --release
```

**Terminal 2 (Client):**
```bash
cd examples/rust
cargo run --bin client --release
```

You should see output like:
```
Server listening on 127.0.0.1:8080
Routes:
  - /ping
  - /echo
  - /json
```

## Platform-Specific Setup

### macOS

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Build everything
./build.sh
```

### Linux

```bash
# Install build dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install build-essential pkg-config libssl-dev

# Build everything
./build.sh
```

### Windows

```powershell
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/

# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Build everything
.\build.ps1
```

## IDE Setup

### Visual Studio Code

Recommended extensions:
- rust-analyzer
- CodeLLDB (for debugging)
- Better TOML
- Error Lens

**.vscode/settings.json:**
```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "editor.formatOnSave": true
}
```

### IntelliJ IDEA / CLion

- Install Rust plugin
- Import as Cargo project
- Enable Clippy linting

## Troubleshooting

### Rust Build Errors

**Problem:** `cargo build` fails
```bash
# Update Rust
rustup update

# Clean and rebuild
cargo clean
cargo build
```

### Node.js Build Errors

**Problem:** `npm install` fails
```bash
# Clear cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### WASM Build Errors

**Problem:** `wasm-pack build` fails
```bash
# Reinstall wasm-pack
cargo install wasm-pack --force

# Try building again
wasm-pack build --target web
```

### Permission Errors (Linux/macOS)

```bash
# Make scripts executable
chmod +x build.sh
chmod +x examples/python/*.py
```

### Windows Linker Errors

Install Visual C++ Build Tools:
1. Download from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/)
2. Install "Desktop development with C++"
3. Restart terminal and try again

## Development Environment

### Watch Mode

Automatically rebuild on changes:
```bash
make watch
# or
cd rust-core && cargo watch -x build
```

### Running with Logs

```bash
RUST_LOG=debug cargo run --bin server
```

### Performance Profiling

```bash
# Run benchmarks
make bench

# Profile with perf (Linux)
perf record cargo run --release --bin server
perf report
```

## Docker Setup (Optional)

```dockerfile
# Dockerfile
FROM rust:1.70

WORKDIR /app
COPY . .

RUN cargo build --release

CMD ["./target/release/server"]
```

Build and run:
```bash
docker build -t fast-protocol .
docker run -p 8080:8080 fast-protocol
```

## Next Steps

1. Read [README.md](README.md) for usage instructions
2. Explore [examples/](examples/) directory
3. Check [CONTRIBUTING.md](CONTRIBUTING.md) to contribute
4. Join our community on Discord

## Support

If you encounter issues:
1. Check existing [GitHub Issues](https://github.com/yourorg/fast-protocol/issues)
2. Search [Stack Overflow](https://stackoverflow.com/questions/tagged/fast-protocol)
3. Ask in [Discord](https://discord.gg/fast-protocol)
4. Create a new issue with details

## Minimum System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 2GB free space for build artifacts
- **OS**: 
  - Linux (kernel 3.2+)
  - macOS 10.15+
  - Windows 10+

## Verified Configurations

| OS | Architecture | Status |
|----|--------------|--------|
| Ubuntu 22.04 | x86_64 | ✅ Tested |
| macOS 13+ | ARM64 | ✅ Tested |
| macOS 13+ | x86_64 | ✅ Tested |
| Windows 11 | x86_64 | ✅ Tested |
| Debian 11 | x86_64 | ✅ Tested |

---

**Happy coding!** 🚀

