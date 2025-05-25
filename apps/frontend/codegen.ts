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
        preResolveTypes: true,
        avoidOptionals: true,
        immutableTypes: true,
        namingConvention: 'keep',
        dedupeOperationSuffix: true,
        nonOptionalTypename: true,
      },
    }
  }
};

export default config;