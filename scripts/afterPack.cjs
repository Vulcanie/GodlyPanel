// Removes Chromium components this app never uses, after electron-builder has
// laid out the app folder and before it zips it.
//
//   dxcompiler.dll, dxil.dll   DirectX shader compiler — only WebGPU needs it.
//   vk_swiftshader.dll, vk_swiftshader_icd.json, vulkan-1.dll
//                              software Vulkan for WebGL/WebGPU on machines with
//                              no GPU. The UI draws nothing 3D, and Chromium
//                              falls back to software compositing without them.
//   d3dcompiler_47.dll         Windows 10 and 11 ship their own copy.
//
// Checked by launching the trimmed build and confirming the UI renders, with the
// GPU enabled and with --disable-gpu (the case these files exist for). Kept on
// purpose: LICENSES.chromium.html and LICENSE.electron.txt, which have to
// travel with the binaries.
const fs = require("node:fs");
const path = require("node:path");

const UNUSED = [
	"dxcompiler.dll",
	"dxil.dll",
	"vk_swiftshader.dll",
	"vk_swiftshader_icd.json",
	"vulkan-1.dll",
	"d3dcompiler_47.dll",
];

exports.default = async function afterPack(context) {
	for (const name of UNUSED) {
		fs.rmSync(path.join(context.appOutDir, name), { force: true });
	}
};
