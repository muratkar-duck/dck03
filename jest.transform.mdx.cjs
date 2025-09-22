const { compileSync } = require('@mdx-js/mdx');

module.exports = {
  process(src) {
    const compiled = compileSync(src, {
      jsx: false,
      outputFormat: 'program',
      development: true,
    });

    let code = String(compiled.value || compiled);

    const replaceImports = (pattern, modulePath) => {
      code = code.replace(pattern, (_, imports) => {
        const converted = imports.replace(/\s+as\s+/g, ': ');
        return `const {${converted}} = require("${modulePath}");`;
      });
    };
    replaceImports(
      /import {([^}]+)} from "react\/jsx-dev-runtime";/,
      'react/jsx-dev-runtime'
    );
    replaceImports(
      /import {([^}]+)} from "@mdx-js\/react";/,
      '@mdx-js/react'
    );
    code = code.replace('export const metadata = ', 'const metadata = ');
    code = code.replace(
      'export default function MDXContent',
      'function MDXContent'
    );
    code +=
      '\nmodule.exports = MDXContent;\nmodule.exports.default = MDXContent;\nmodule.exports.metadata = metadata;\n';
    return {
      code,
    };
  },
};
