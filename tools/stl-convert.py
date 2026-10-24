"""Convert SpeakToLearn SyllablePredictorV6 (FP16 ONNX from github.com/cogeor/speaktolearn) to the browser model models/stl-v6-int8.onnx.
FP16 -> FP32 by hand (initializers, Constant nodes, Cast 'to', value_info), then onnxruntime dynamic INT8 on MatMul/Gemm.
Usage: python3 tools/stl-convert.py src_fp16.onnx models/stl-v6-int8.onnx"""
import sys,onnx,numpy as np
from onnx import numpy_helper,TensorProto
from onnxruntime.quantization import quantize_dynamic,QuantType
src,dst=sys.argv[1],sys.argv[2];m=onnx.load(src);F16,F32=TensorProto.FLOAT16,TensorProto.FLOAT
for i,t in enumerate(m.graph.initializer):
  if t.data_type==F16:m.graph.initializer[i].CopyFrom(numpy_helper.from_array(numpy_helper.to_array(t).astype(np.float32),t.name))
for n in m.graph.node:
  for a in n.attribute:
    if n.op_type=='Cast' and a.name=='to' and a.i==F16:a.i=F32
    if n.op_type=='Constant' and a.name=='value' and a.t.data_type==F16:a.t.CopyFrom(numpy_helper.from_array(numpy_helper.to_array(a.t).astype(np.float32),a.t.name))
for v in list(m.graph.input)+list(m.graph.output)+list(m.graph.value_info):
  if v.type.tensor_type.elem_type==F16:v.type.tensor_type.elem_type=F32
onnx.save(m,'/tmp/stl_fp32.onnx');quantize_dynamic('/tmp/stl_fp32.onnx',dst,op_types_to_quantize=['MatMul','Gemm'],weight_type=QuantType.QInt8)
print('wrote',dst)
