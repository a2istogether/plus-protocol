// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "FastProtocol",
    platforms: [
        .iOS(.v13),
        .macOS(.v10_15),
        .tvOS(.v13),
        .watchOS(.v6)
    ],
    products: [
        .library(
            name: "FastProtocol",
            targets: ["FastProtocol"]
        ),
    ],
    targets: [
        .target(
            name: "FastProtocol",
            dependencies: []
        ),
        .testTarget(
            name: "FastProtocolTests",
            dependencies: ["FastProtocol"]
        ),
    ]
)

