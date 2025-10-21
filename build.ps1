# Build script for Fast Protocol (Windows PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Fast Protocol Build Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
function Check-Prerequisites {
    Write-Host "Checking prerequisites..." -ForegroundColor Yellow
    
    # Check Rust
    if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
        Write-Host "Error: Rust/Cargo not found. Please install from https://rustup.rs/" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Rust/Cargo found" -ForegroundColor Green
    
    # Check Node.js
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "Warning: Node.js not found. Node.js bindings will be skipped." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Node.js found" -ForegroundColor Green
    }
    
    # Check wasm-pack
    if (!(Get-Command wasm-pack -ErrorAction SilentlyContinue)) {
        Write-Host "Warning: wasm-pack not found. WASM bindings will be skipped." -ForegroundColor Yellow
    } else {
        Write-Host "✓ wasm-pack found" -ForegroundColor Green
    }
    
    Write-Host ""
}

# Build Rust core
function Build-Rust {
    Write-Host "Building Rust core..." -ForegroundColor Yellow
    Push-Location rust-core
    cargo build --release
    cargo test --release
    Pop-Location
    Write-Host "✓ Rust core built successfully" -ForegroundColor Green
    Write-Host ""
}

# Build Node.js bridge
function Build-NodeJS {
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "Skipping Node.js bridge (Node.js not found)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Building Node.js bridge..." -ForegroundColor Yellow
    Push-Location node-bridge
    npm install
    npm run build
    Pop-Location
    Write-Host "✓ Node.js bridge built successfully" -ForegroundColor Green
    Write-Host ""
}

# Build WASM
function Build-WASM {
    if (!(Get-Command wasm-pack -ErrorAction SilentlyContinue)) {
        Write-Host "Skipping WASM (wasm-pack not found)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Building WASM module..." -ForegroundColor Yellow
    Push-Location wasm
    wasm-pack build --target web --out-dir pkg
    Pop-Location
    Write-Host "✓ WASM module built successfully" -ForegroundColor Green
    Write-Host ""
}

# Build examples
function Build-Examples {
    Write-Host "Building examples..." -ForegroundColor Yellow
    Push-Location examples\rust
    cargo build --release
    Pop-Location
    Write-Host "✓ Examples built successfully" -ForegroundColor Green
    Write-Host ""
}

# Main build process
function Main {
    Check-Prerequisites
    
    Write-Host "Starting build process..." -ForegroundColor Cyan
    Write-Host ""
    
    Build-Rust
    Build-NodeJS
    Build-WASM
    Build-Examples
    
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Run examples: cd examples\rust; cargo run --bin server"
    Write-Host "  2. Run tests: cd rust-core; cargo test"
    Write-Host "  3. See README.md for more information"
    Write-Host ""
}

# Run main
Main

