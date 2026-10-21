import CodeGen from '../../../src';

describe('CodeGen.utils.resultHelper.scanFiles', () => {
  it('should works', () => {
    const result = require('./example-result.json') as any;
    const files = CodeGen.utils.resultHelper.scanFiles(result);
    expect(Array.from(files)).toMatchInlineSnapshot(`
      [
        [
          ".eslintrc",
          {
            "content": "{}",
            "ext": "",
            "name": ".eslintrc",
          },
        ],
        [
          "package.json",
          {
            "content": "{ "name": "demo", "version":"1.0.0" }",
            "ext": "json",
            "name": "package",
          },
        ],
        [
          "src/index.js",
          {
            "content": "console.log("Hello")",
            "ext": "js",
            "name": "index",
          },
        ],
        [
          "src/index.css",
          {
            "content": "html,body{ padding: 0; }",
            "ext": "css",
            "name": "index",
          },
        ],
        [
          "src/components/index.js",
          {
            "content": "export * from "./Hello";",
            "ext": "js",
            "name": "index",
          },
        ],
        [
          "src/components/Hello/index.js",
          {
            "content": "export default () => <div>Hello</div>",
            "ext": "js",
            "name": "index",
          },
        ],
        [
          "src/components/Hello/index.css",
          {
            "content": ".hello {color: red}",
            "ext": "css",
            "name": "index",
          },
        ],
      ]
    `);
  });
});
