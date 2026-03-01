import { generate } from "../src/index";
import JSZip from "jszip";
import saveAs from "file-saver";

jest.mock("binary-loader!./template.zip", () => "mock-template-zip", { virtual: true });
jest.mock("./templates/node.xml", () => ({ __esModule: true, default: "<Shape ID='1'><Text></Text><Cell N='PinX'/><Cell N='PinY'/><Cell N='Relationships' V='0'/><Cell N='Size'/><Cell N='TxtWidth' V='10' /></Shape>" }), { virtual: true });
jest.mock("./templates/connector-shape.xml", () => ({ __esModule: true, default: "<Shape ID='1'><Cell N='LineColor'/><Cell N='LineWeight'/></Shape>" }), { virtual: true });
jest.mock("./templates/group.xml", () => ({ __esModule: true, default: "<Shape ID='1'><Cell N='Width'/><Cell N='Height'/><Cell N='PinX'/><Cell N='PinY'/><Cell N='Relationships' V='0'/><Text></Text></Shape>" }), { virtual: true });
jest.mock("./templates/logo.xml", () => ({ __esModule: true, default: "<Shape ID='1'><Cell N='Width'/><Cell N='Height'/></Shape>" }), { virtual: true });

type MockZipFile = {
  async: (format: string) => Promise<string>;
};

type MockZip = {
  file: (path: string, contents?: string) => MockZip | MockZipFile;
  generateAsync: (options: { type: string }) => Promise<string>;
  __getWrittenXml: () => string | undefined;
};

const templateXml = "<Page><Shapes></Shapes><Connects></Connects></Page>";

const createMockZip = (): MockZip => {
  let writtenXml: string | undefined;

  return {
    file: (path: string, contents?: string) => {
      if (contents) {
        writtenXml = contents;
        return createMockZip();
      }

      return {
        async: async () => templateXml,
      };
    },
    generateAsync: async () => "mock-blob",
    __getWrittenXml: () => writtenXml,
  };
};

jest.mock("jszip", () => ({
  __esModule: true,
  default: {
    loadAsync: jest.fn(),
  },
}));

jest.mock("file-saver", () => ({
  __esModule: true,
  default: jest.fn(),
}));


describe("generate", () => {
  it("creates a Visio document blob and triggers download", async () => {
    const mockZip = createMockZip();
    const loadAsync = JSZip.loadAsync as jest.Mock;
    loadAsync.mockResolvedValue(mockZip);

    await generate(
      {
        nodes: [{ name: "NodeA", x: 10, y: 20, image: "Router.png" }],
        edges: [],
        groups: [],
      },
      "test-diagram",
    );

    expect(loadAsync).toHaveBeenCalledWith("mock-template-zip");
    expect(saveAs).toHaveBeenCalledWith("mock-blob", "test-diagram.vsdx");
  });
});

