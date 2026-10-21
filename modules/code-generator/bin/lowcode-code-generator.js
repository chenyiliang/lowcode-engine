#!/usr/bin/env node
/* eslint-disable no-var */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable @typescript-eslint/no-require-imports */

// commander 7 起 require('commander') 不再返回可直接调用的 program 单例，
// 而是返回模块对象（.command/.parse 都在 .program 上）。commander 15 沿用此形态：
// 实测 require('commander').parse 为 undefined，require('commander').program.parse 才是 function。
// HEAD 用的是 commander 6（返回单例），升级后必须改取 .program，否则 program.command(...) 会 TypeError。
var program = require('commander').program;

program
  .command('generate', { isDefault: true })
  .description('Generate code from ali lowcode schema')
  .requiredOption('-s, --solution <solution>', 'specify the solution to use (icejs/rax/recore)')
  .option('-i, --input <input>', 'specify the input schema file')
  .option('-o, --output <output>', 'specify the output directory', 'generated')
  .option('-c, --cwd <cwd>', 'specify the working directory', '.')
  .option('-q, --quiet', 'be quiet, do not output anything unless get error', false)
  .option('-v, --verbose', 'be verbose, output more information', false)
  .option('--solution-options <options>', 'specify the solution options', '{}')
  // commander 7+（本项目升到 15）会严格校验位置参数：`.arguments()` 里的**每个裸词**都算一个必填
  // 参数。原来写的 '[input-schema] ali lowcode schema JSON file' 把说明文字混进了参数声明，
  // commander 6 宽松所以没报错，15 下会 `error: missing required argument 'ali'`。
  // 说明文字属于 .description()，.arguments() 只保留真正的位置参数 '[input-schema]'（可选）。
  .arguments('[input-schema]')
  // commander 7+ 的 action 回调签名是 (位置参数..., options, command)，
  // commander 6 是 (位置参数..., command)。原代码取第二个形参当 command 并调用 .opts()，
  // 在 15 下第二参其实是 options 纯对象（无 .opts 方法），会 TypeError。
  // 这里显式接三个参数，仍用 command.opts() 取选项，语义与升级前完全一致。
  .action(function doGenerate(inputSchema, _options, command) {
    var options = command.opts();
    if (options.cwd) {
      process.chdir(options.cwd);
    }

    require('../dist/cli')
      .run(inputSchema ? [inputSchema] : [], options)
      .then((retCode) => {
        process.exit(retCode);
      });
  });

program
  .command('init-solution')
  .option('-c, --cwd <cwd>', 'specify the working directory', '.')
  .option('-q, --quiet', 'be quiet, do not output anything unless get error', false)
  .option('-v, --verbose', 'be verbose, output more information', false)
  .arguments('<your-solution-name>')
  // 同上：commander 15 的签名是 (solutionName, options, command)
  .action(function initSolution(solutionName, _options, command) {
    var options = command.opts();
    if (options.cwd) {
      process.chdir(options.cwd);
    }

    require('../dist/cli')
      .initSolution([solutionName], options)
      .then((retCode) => {
        process.exit(retCode);
      });
  });

program.parse(process.argv);

