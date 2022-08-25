"""
haimtran
use inference.py as entry_point when create your own model
with aws managed container
"""
import json
from collections import namedtuple
import numpy as np
import mxnet as mx

# pylint: disable=invalid-name

Batch = namedtuple("Batch", ["data"])

# Change the context to mx.cpu() if deploying to a CPU endpoint
ctx = mx.gpu()

train_data_location = "s3://"

def model_fn(model_dir):
    # The compiled model artifacts are saved with the prefix 'compiled'
    sym, arg_params, aux_params = mx.model.load_checkpoint(
        "compiled", 0
    )
    mod = mx.mod.Module(symbol=sym, context=ctx, label_names=None)
    exe = mod.bind(
        for_training=False,
        data_shapes=[("data", (1, 3, 224, 224))],
        label_shapes=mod._label_shapes,
    )
    mod.set_params(arg_params, aux_params, allow_missing=True)

    # Run warm-up inference on empty data during model load (required for GPU)
    data = mx.nd.empty((1, 3, 224, 224), ctx=ctx)
    mod.forward(Batch([data]))
    return mod


def transform_fn(mod, image, input_content_type, output_content_type):
    # pre-processing
    decoded = mx.image.imdecode(image)
    resized = mx.image.resize_short(decoded, 224)
    cropped, crop_info = mx.image.center_crop(resized, (224, 224))
    normalized = mx.image.color_normalize(
        cropped.astype(np.float32) / 255,
        mean=mx.nd.array([0.485, 0.456, 0.406]),
        std=mx.nd.array([0.229, 0.224, 0.225]),
    )
    transposed = normalized.transpose((2, 0, 1))
    batchified = transposed.expand_dims(axis=0)
    casted = batchified.astype(dtype="float32")
    processed_input = casted.as_in_context(ctx)

    # prediction/inference
    mod.forward(Batch([processed_input]))

    # post-processing
    prob = mod.get_outputs()[0].asnumpy().tolist()
    prob_json = json.dumps(prob)
    return prob_json, output_content_type
