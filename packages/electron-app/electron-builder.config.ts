import type {Configuration} from 'electron-builder';

const config: Configuration = {
  appId: 'com.audioreach.creator',

  artifactName: '${productName}-${version}-${platform}-${arch}.${ext}',

  compression: 'store',

  directories: {
    buildResources: 'libs',
    output: 'out',
  },
  extraMetadata: {
    main: 'dist/main.cjs',
  },
  files: [
    'dist/**/*',
    'package.json',
    // Exclude everything else since it's bundled
    '!node_modules/**/*',
    '!src/**/*',
    '!scripts/**/*',
    '!out/**/*',
    '!tsconfig*.json',
    '!test*',
  ],

  linux: {
    category: 'Utility',
    executableName: 'audioreach-creator-ui',
  },

  productName: 'audioreach-creator-ui',

  publish: null,
};

export default config;
