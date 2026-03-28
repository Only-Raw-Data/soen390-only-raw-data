const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const svgRoot = path.resolve(projectRoot, "node_modules", "react-native-svg");

/** Absolute entry file Metro should load for the package name. */
function resolveReactNativeSvgEntry() {
  try {
    return require.resolve("react-native-svg", { paths: [projectRoot] });
  } catch {
    return path.join(svgRoot, "lib", "commonjs", "index.js");
  }
}

const svgEntry = resolveReactNativeSvgEntry();

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "react-native-svg": svgRoot,
};

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-svg") {
    return { type: "sourceFile", filePath: svgEntry };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
