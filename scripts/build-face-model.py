"""
Builds public/models/face_detector_short_range.tflite.

Source: BlazeFace short-range model from the npm package @mediapipe/face_detection
(Apache-2.0). MediaPipe Tasks' FaceDetector needs TFLite metadata (input
normalization), which that file lacks, so we attach it here. The official
`blaze_face_short_range.tflite` from Google's model storage is the same network
with metadata and can replace this file 1:1.

Usage (once, output is committed):
  npm i --no-save @mediapipe/face_detection
  pip install flatbuffers mediapipe
  python scripts/build-face-model.py
"""
import flatbuffers
from mediapipe.tasks.metadata import metadata_schema_py_generated as ms
from mediapipe.tasks.metadata import schema_py_generated as ts

SRC = "node_modules/@mediapipe/face_detection/face_detection_short_range.tflite"
DST = "public/models/face_detector_short_range.tflite"

buf = open(SRC, "rb").read()
model = ts.ModelT.InitFromObj(ts.Model.GetRootAsModel(buf, 0))

norm = ms.NormalizationOptionsT(); norm.mean = [127.5]; norm.std = [127.5]
pu = ms.ProcessUnitT(); pu.optionsType = ms.ProcessUnitOptions.NormalizationOptions; pu.options = norm
ip = ms.ImagePropertiesT(); ip.colorSpace = ms.ColorSpaceType.RGB
content = ms.ContentT(); content.contentPropertiesType = ms.ContentProperties.ImageProperties; content.contentProperties = ip
stats = ms.StatsT(); stats.max = [1.0]; stats.min = [-1.0]
image = ms.TensorMetadataT(); image.name = "image"; image.content = content; image.processUnits = [pu]; image.stats = stats


def feature(name):
    t = ms.TensorMetadataT(); t.name = name
    c = ms.ContentT(); c.contentPropertiesType = ms.ContentProperties.FeatureProperties; c.contentProperties = ms.FeaturePropertiesT()
    t.content = c
    return t


sg = ms.SubGraphMetadataT(); sg.inputTensorMetadata = [image]; sg.outputTensorMetadata = [feature("regressors"), feature("classificators")]
meta = ms.ModelMetadataT(); meta.name = "BlazeFace short-range"; meta.minParserVersion = "1.0.0"
meta.description = "Face detector (Apache-2.0), TFLite metadata added for MediaPipe Tasks."
meta.subgraphMetadata = [sg]

b = flatbuffers.Builder(0); b.Finish(meta.Pack(b), b"M001")
md_buf = ts.BufferT(); md_buf.data = list(bytes(b.Output()))
model.buffers.append(md_buf)
entry = ts.MetadataT(); entry.name = "TFLITE_METADATA"; entry.buffer = len(model.buffers) - 1
model.metadata = (model.metadata or []) + [entry]

out = flatbuffers.Builder(1024); out.Finish(model.Pack(out), file_identifier=b"TFL3")
open(DST, "wb").write(out.Output())
print("wrote", DST)
