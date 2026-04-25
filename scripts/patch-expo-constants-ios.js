const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const iosDir = path.join(projectRoot, 'ios');
const shellScriptFile = path.join(
  projectRoot,
  'node_modules',
  'expo-constants',
  'scripts',
  'get-app-config-ios.sh',
);
const podspecFile = path.join(
  projectRoot,
  'node_modules',
  'expo-constants',
  'ios',
  'EXConstants.podspec',
);

let changed = false;

function patchTextFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patch-expo-constants-ios] Skipped missing file: ${filePath}`);
    return;
  }

  const current = fs.readFileSync(filePath, 'utf8');
  let next = current;

  for (const [before, after] of replacements) {
    if (before instanceof RegExp) {
      next = next.replace(before, after);
    } else {
      next = next.replace(before, after);
    }
  }

  if (next !== current) {
    fs.writeFileSync(filePath, next);
    changed = true;
    console.log(`[patch-expo-constants-ios] Patched ${path.relative(projectRoot, filePath)}`);
  }
}

function patchJsonFile(filePath, mutate) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patch-expo-constants-ios] Skipped missing file: ${filePath}`);
    return;
  }

  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const next = mutate({ ...current });
  const currentText = `${JSON.stringify(current, null, 2)}\n`;
  const nextText = `${JSON.stringify(next, null, 2)}\n`;

  if (nextText !== currentText) {
    fs.writeFileSync(filePath, nextText);
    changed = true;
    console.log(`[patch-expo-constants-ios] Patched ${path.relative(projectRoot, filePath)}`);
  }
}

patchTextFile(shellScriptFile, [
  ['PROJECT_DIR_BASENAME=$(basename $PROJECT_DIR)', 'PROJECT_DIR_BASENAME=$(basename "$PROJECT_DIR")'],
]);

patchTextFile(podspecFile, [
  ["require 'json'", "require 'json'\nrequire 'shellwords'"],
  [
    "  env_vars = ENV['PROJECT_ROOT'] ? \"PROJECT_ROOT=#{ENV['PROJECT_ROOT']} \" : \"\"\n  script_phase = {\n    :name => 'Generate app.config for prebuilt Constants.manifest',\n    :script => \"bash -l -c \\\"#{env_vars}$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\"\",\n    :execution_position => :before_compile\n  }\n",
    "  project_root_export = ENV['PROJECT_ROOT'] ? \"export PROJECT_ROOT=#{Shellwords.escape(ENV['PROJECT_ROOT'])}\\n\" : \"\"\n  script_phase = {\n    :name => 'Generate app.config for prebuilt Constants.manifest',\n    :script => \"#{project_root_export}\\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\"\",\n    :execution_position => :before_compile\n  }\n",
  ],
]);

patchJsonFile(path.join(iosDir, 'Podfile.properties.json'), (current) => ({
  ...current,
  'ios.buildReactNativeFromSource': 'true',
}));

const xcodeprojDir = fs.existsSync(iosDir)
  ? fs.readdirSync(iosDir).find((entry) => entry.endsWith('.xcodeproj'))
  : null;

if (xcodeprojDir) {
  patchTextFile(path.join(iosDir, xcodeprojDir, 'project.pbxproj'), [
    [
      `\\n\\n\`\\"$NODE_BINARY\\" --print \\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\"\`\\n\\n`,
      `\\n\\nREACT_NATIVE_XCODE_SCRIPT=\\"$(\\"$NODE_BINARY\\" --print \\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\")\\"\\n\\"$REACT_NATIVE_XCODE_SCRIPT\\"\\n\\n`,
    ],
    [
      `\\n\\nRN_XCODE_SCRIPT=\\"$(\\"$NODE_BINARY\\" --print \\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\")\\"\\n\\"$RN_XCODE_SCRIPT\\"\\n\\n`,
      `\\n\\nREACT_NATIVE_XCODE_SCRIPT=\\"$(\\"$NODE_BINARY\\" --print \\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\")\\"\\n\\"$REACT_NATIVE_XCODE_SCRIPT\\"\\n\\n`,
    ],
    [
      /\\n\\n`"\$NODE_BINARY" --print "require\('path'\)\.dirname\(require\.resolve\('react-native\/package\.json'\)\) \+ '\/scripts\/react-native-xcode\.sh'"\`\\n\\n/g,
      `\\n\\nREACT_NATIVE_XCODE_SCRIPT=\\"$(\\"$NODE_BINARY\\" --print \\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\")\\"\\n\\"$REACT_NATIVE_XCODE_SCRIPT\\"\\n\\n`,
    ],
    [
      /\\n\\nRN_XCODE_SCRIPT=\\"\$\(\\"\$NODE_BINARY\\" --print \\"require\('path'\)\.dirname\(require\.resolve\('react-native\/package\.json'\)\) \+ '\/scripts\/react-native-xcode\.sh'\\"\)\\"\\n\\"\$RN_XCODE_SCRIPT\\"\\n\\n/g,
      `\\n\\nREACT_NATIVE_XCODE_SCRIPT=\\"$(\\"$NODE_BINARY\\" --print \\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\")\\"\\n\\"$REACT_NATIVE_XCODE_SCRIPT\\"\\n\\n`,
    ],
  ]);
}

if (!changed) {
  console.log('[patch-expo-constants-ios] Already patched');
}
