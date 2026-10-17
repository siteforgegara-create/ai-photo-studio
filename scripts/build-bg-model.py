"""
Builds public/models/modnet-portrait.onnx for /tools/background-remover.

Model: MODNet "photographic portrait matting" (ZHKKKe/MODNet). The README
states: "The code, models, and demos in this repository ... are released under
the Apache License 2.0" — commercial use is allowed. The ONNX export (opset 11,
input `input` NCHW float in [-1, 1], output `output` = alpha matte in [0, 1])
is taken from the npm package @rmbg/model-modnet@0.0.1, which ships it split
into three chunks (sha256 of the joined file is printed below).

To keep the download small and still run on every backend (WASM/WebGPU), the
weights are stored as float16 and cast back to float32 inside the graph, so all
operators still compute in float32 (same results, half the size).

Usage (once, output is committed):
  npm pack @rmbg/model-modnet@0.0.1 && tar xzf rmbg-model-modnet-0.0.1.tgz
  pip install onnx numpy onnxruntime
  python scripts/build-bg-model.py package/
"""
import hashlib
import sys

import numpy as np
import onnx
from onnx import helper, numpy_helper, TensorProto

SRC_DIR = sys.argv[1] if len(sys.argv) > 1 else "package/"
DST = "public/models/modnet-portrait.onnx"

raw = b"".join(open(f"{SRC_DIR}/modnet-{i}.onnx", "rb").read() for i in (1, 2, 3))
print("source sha256", hashlib.sha256(raw).hexdigest())
model = onnx.load_from_string(raw)

graph = model.graph
casts = []
new_inits = []
for init in graph.initializer:
    arr = numpy_helper.to_array(init)
    # Small tensors (BN stats, shapes, scalars) stay float32: no size win, no precision loss.
    if init.data_type != TensorProto.FLOAT or arr.size < 1024:
        new_inits.append(init)
        continue
    half_name = init.name + "__fp16"
    new_inits.append(numpy_helper.from_array(arr.astype(np.float16), half_name))
    casts.append(helper.make_node("Cast", [half_name], [init.name], to=TensorProto.FLOAT, name=init.name + "__cast"))

del graph.initializer[:]
graph.initializer.extend(new_inits)
nodes = list(graph.node)
del graph.node[:]
graph.node.extend(casts + nodes)
model.producer_name = "aps-build-bg-model"
model.doc_string = "MODNet photographic portrait matting (Apache-2.0), float16 weights + Cast."
onnx.checker.check_model(model)
onnx.save(model, DST)

# Sanity check: same matte as the float32 original on a random input.
import onnxruntime as ort

x = np.random.default_rng(0).uniform(-1, 1, (1, 3, 512, 512)).astype(np.float32)
a = ort.InferenceSession(raw).run(None, {"input": x})[0]
b = ort.InferenceSession(DST).run(None, {"input": x})[0]
print("max |diff| vs float32:", float(np.abs(a - b).max()))
print("written", DST, "sha256", hashlib.sha256(open(DST, "rb").read()).hexdigest())
