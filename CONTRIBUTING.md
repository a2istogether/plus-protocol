# Contributing to Fast Protocol

Thank you for your interest in contributing to Fast Protocol! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate in all interactions. We aim to maintain a welcoming and inclusive community.

## Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourorg/fast-protocol
   cd fast-protocol
   ```

2. **Install dependencies**
   ```bash
   make install-deps
   ```

3. **Build the project**
   ```bash
   make build
   ```

4. **Run tests**
   ```bash
   make test
   ```

## Development Workflow

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, idiomatic code
   - Follow existing code style
   - Add tests for new features
   - Update documentation

3. **Format code**
   ```bash
   make fmt
   ```

4. **Run linting**
   ```bash
   make clippy
   ```

5. **Run tests**
   ```bash
   make test
   ```

6. **Commit changes**
   ```bash
   git commit -m "feat: add new feature"
   ```

   Use conventional commit messages:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `test:` - Tests
   - `refactor:` - Code refactoring
   - `perf:` - Performance improvement
   - `chore:` - Maintenance

7. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Create a Pull Request**
   - Go to GitHub and create a PR
   - Describe your changes
   - Link related issues

## Code Style

### Rust

- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `rustfmt` for formatting
- Use `clippy` for linting
- Write documentation comments for public APIs

### TypeScript/JavaScript

- Follow [Airbnb Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript for type safety
- Write JSDoc comments

### Swift

- Follow [Swift API Design Guidelines](https://swift.org/documentation/api-design-guidelines/)
- Use SwiftLint for linting

### Kotlin

- Follow [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html)
- Use ktlint for linting

## Testing

- Write unit tests for all new code
- Write integration tests for new features
- Ensure all tests pass before submitting PR
- Aim for high test coverage

### Running Tests

```bash
# All tests
make test

# Rust tests only
make test-rust

# Node.js tests only
make test-node
```

## Documentation

- Update README.md for user-facing changes
- Write inline documentation for code
- Update API documentation
- Add examples for new features

## Performance

- Profile performance-critical code
- Run benchmarks for optimizations
- Document performance characteristics

### Running Benchmarks

```bash
make bench
```

## Pull Request Process

1. **Update documentation**
2. **Add tests**
3. **Ensure CI passes**
4. **Request review**
5. **Address feedback**
6. **Squash commits** (if requested)

## Release Process

Maintainers handle releases:

1. Update version numbers
2. Update CHANGELOG.md
3. Create release tag
4. Publish to package registries

## Questions?

- Open an issue for bugs
- Start a discussion for features
- Join our Discord for chat

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

