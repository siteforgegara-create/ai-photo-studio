/// <reference lib="webworker" />
/**
 * Background-remover worker: runs MODNet with ONNX Runtime Web (WASM) off the
 * main thread. Input: the photo resized to the network size; output: an alpha
 * matte (0–1) of the same size. Nothing leaves the browser.
 */
import * as ort from "onnxruntime-web/wasm";
import { BG_MODEL } from "./model";

type InitMsg = { type: "init"; model: ArrayBuffer };
type RunMsg = { type: "run"; id: number; pixels: Uint8ClampedArray; width: number; height: number };

let session: ort.InferenceSession | null = null;
const post = (msg: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);

ort.env.wasm.wasmPaths = BG_MODEL.wasmPath;
// Multi-threading needs cross-origin isolation (COOP/COEP); one thread is plenty for a 512 px matte.
ort.env.wasm.numThreads = 1;

self.onmessage = async (e: MessageEvent<InitMsg | RunMsg>) => {
  const msg = e.data;
  try {
    if (msg.type === "init") {
      session = await ort.InferenceSession.create(new Uint8Array(msg.model), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      post({ type: "ready" });
      return;
    }
    if (!session) throw new Error("Model is not loaded");
    const { pixels, width, height } = msg;
    // RGBA → NCHW float, normalised to [-1, 1] (MODNet: mean 0.5, std 0.5).
    const plane = width * height;
    const input = new Float32Array(3 * plane);
    for (let i = 0; i < plane; i++) {
      input[i] = pixels[i * 4]! / 127.5 - 1;
      input[plane + i] = pixels[i * 4 + 1]! / 127.5 - 1;
      input[2 * plane + i] = pixels[i * 4 + 2]! / 127.5 - 1;
    }
    const feeds = { [session.inputNames[0]!]: new ort.Tensor("float32", input, [1, 3, height, width]) };
    const out = await session.run(feeds);
    const matte = out[session.outputNames[0]!]!.data as Float32Array;
    const copy = new Float32Array(matte);
    post({ type: "matte", id: msg.id, matte: copy, width, height }, [copy.buffer]);
  } catch (err) {
    post({ type: "error", id: "id" in msg ? msg.id : -1, message: err instanceof Error ? err.message : String(err) });
  }
};
