import CodeGen from '../../../../src';
import fileSaver from 'file-saver';
import * as utils from '../../../../src/publisher/zip/utils';

jest.mock('file-saver');

// utils 里的 isNodeProcess / generateProjectZip 都是 `export const`。
// 经 swc 转成 CJS 后，命名空间对象上的这些属性是**不可配置的 getter**，
// 于是 `jest.spyOn(utils, 'isNodeProcess')` 会抛 `TypeError: Cannot redefine property`
// （HEAD 时代用 ts-jest 编译，产物形态不同，才能 spy；这是转换差异，不是产品回归）。
// 正确做法是用 jest.mock 工厂替换整个模块 —— 消费方 src/publisher/zip/index.ts 与
// 本测试通过 require 拿到的是**同一份** mock，因此桩能生效。
// 必须用 importActual 透传真实实现：同文件的 'should works' 用例依赖真实的
// generateProjectZip 与 Node 环境下的 writeZipToDisk，若全量桩掉那个用例会失败。
jest.mock('../../../../src/publisher/zip/utils', () => {
  const actual = jest.requireActual('../../../../src/publisher/zip/utils');
  return {
    ...actual,
    isNodeProcess: jest.fn(actual.isNodeProcess),
    generateProjectZip: jest.fn(actual.generateProjectZip),
  };
});

describe('public/publisher/zip/zip', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should works', async () => {
    const zip = CodeGen.publishers.zip({
      outputPath: 'demo-output',
      projectSlug: 'example-project',
    });

    const demoProject = {
      name: 'demo',
      dirs: [],
      files: [
        {
          name: 'package',
          ext: 'json',
          content: '{ "name": "demo", "version": "1.0.0" }',
        },
      ],
    };

    expect(zip.getOutputPath()).toMatchInlineSnapshot('"demo-output"');

    expect(zip.getProject()).toMatchInlineSnapshot('undefined');
    zip.setProject(demoProject);
    expect(zip.getProject()).toBeTruthy();

    expect(zip.getOutputPath()).toMatchInlineSnapshot('"demo-output"');
    expect(zip.setOutputPath('output')).toBe(undefined);
    expect(zip.getOutputPath()).toMatchInlineSnapshot('"output"');

    const publishRes = await zip.publish({
      project: demoProject,
    });

    expect(publishRes.success).toBeTruthy();
    expect(publishRes.payload).toBeTruthy();
  });

  it('should throws Error when project is missing', async () => {
    const zip = CodeGen.publishers.zip({});
    expect(zip.publish()).rejects.toBeTruthy();
  });

  it('should publish the project as a zip file in the browser', async () => {
    const zipContent = 'zip content';
    const zipName = 'example-project';
    jest.spyOn(utils, 'isNodeProcess').mockReturnValue(false);
    // new Zip 里面也有平台判断，所以这里 mock
    jest.spyOn(utils, 'generateProjectZip').mockResolvedValue(zipContent as any);
    const spy = jest.spyOn(fileSaver, 'saveAs');

    const zip = CodeGen.publishers.zip({
      projectSlug: zipName,
    });

    const demoProject = {
      name: 'demo',
      dirs: [],
      files: [
        {
          name: 'package',
          ext: 'json',
          content: '{ "name": "demo", "version": "1.0.0" }',
        },
      ],
    };

    zip.setProject(demoProject);
    const publishRes = await zip.publish({
      project: demoProject,
    });

    expect(publishRes.success).toBeTruthy();
    // Jest 30 移除了废弃别名 toBeCalledWith，用规范名 toHaveBeenCalledWith（语义相同）
    expect(spy).toHaveBeenCalledWith(zipContent, `${zipName}.zip`);
    spy.mockReset();
    spy.mockRestore();
  });
});
