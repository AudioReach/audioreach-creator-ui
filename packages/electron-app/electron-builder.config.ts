import type {Configuration} from "electron-builder"

import {removeBinaries} from "./scripts/remove-binaries"

const config: Configuration = {
  afterPack: async () => {
    if (process.env.DISABLE_BINARY_REMOVAL) {
      console.log("Skipping binary removal")
    } else {
      await removeBinaries()
    }
  },
  appId: "com.qualcomm.audioreach-creator-ui",
  // eslint-disable-next-line no-template-curly-in-string -- electron-builder template variables
  artifactName: "${productName}-${version}-${platform}-${arch}.${ext}",

  compression: "store",

  directories: {
    buildResources: "libs",
    output: "out",
  },
  extraMetadata: {
    main: "dist/main.cjs",
  },
  files: [
    "dist/**/*",
    "package.json",
    // Exclude everything else since it's bundled
    "!node_modules/**/*",
    "!src/**/*",
    "!scripts/**/*",
    "!out/**/*",
    "!tsconfig*.json",
    "!test*",
  ],

  linux: {
    category: "Utility",
    executableName: "audioreach-creator-ui",
    icon: "public/libs/icons/qact_256.png",
  },

  productName: "audioreach-creator-ui",

  publish: null,

  win: {
    icon: "public/libs/QACT_Icon.ico",
  },
}

export default config
