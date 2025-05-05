// codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:4000/graphql',
  documents: ['src/graphql/queries/*.{ts,tsx}'],
  generates: {
    'src/graphql/models/generated.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
      },
    },
    'src/graphql/dtos/': {
      preset: 'near-operation-file',
      presetConfig: {
        extension: '.dto.ts',
        baseTypesPath: '../models/generated.ts',
      },
      plugins: [
        'typescript',
        'typescript-operations',
      ],
    },
    'src/graphql/queries/': {
      preset: 'near-operation-file',
      presetConfig: {
        extension: '.query.ts',
        baseTypesPath: '../models/generated.ts',
      },
      plugins: [
        'typescript',
        'typescript-operations',
      ],
    },
    'src/graphql/mutations/': {
      preset: 'near-operation-file',
      presetConfig: {
        extension: '.mutation.ts',
        baseTypesPath: '../models/generated.ts',
      },
      plugins: [
        'typescript',
        'typescript-operations',
      ],
    },
  },
  ignoreNoDocuments: true,
};

export default config;