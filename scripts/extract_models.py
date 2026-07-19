#!/usr/bin/env python3
"""Extract detector + landmark TFLite models from MediaPipe Pose .task bundle."""

import sys, os

TASK_PATH = os.path.join(os.path.dirname(__file__), '..', 'assets/models/blazepose_lite_fp16.task')
ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets/models')

def extract_via_metadata():
    from tflite_support import metadata as _metadata
    displayer = _metadata.MetadataDisplayer.with_model_file(TASK_PATH)
    json_str = displayer.get_metadata_json()
    print("=== Model metadata (first 2500 chars) ===")
    print(json_str[:2500])
    print("...\n")

    associated_files = displayer.get_associated_files()
    print("=== Associated files ===")
    saved = []
    for f in associated_files:
        name = f.name
        content = displayer.get_associated_file_buffer(name)
        size = len(content)
        print(f"  {name!r} — {size:,} bytes")
        if name.endswith('.tflite'):
            out_path = os.path.join(ASSETS_DIR, name)
            with open(out_path, 'wb') as out:
                out.write(content)
            saved.append(out_path)
    return saved

def inspect_flatbuffer():
    """Print subgraph structure to understand the model."""
    from tflite import Model
    with open(TASK_PATH, 'rb') as f:
        data = f.read()
    buf = bytearray(data)
    model = Model.Model.GetRootAs(buf, 0)
    print(f"\n=== Flatbuffer structure ===")
    print(f"Version: {model.Version()}")
    sg_count = model.SubgraphsLength()
    print(f"Subgraphs: {sg_count}")
    for i in range(sg_count):
        sg = model.Subgraphs(i)
        outputs = []
        for j in range(sg.OutputsLength()):
            idx = sg.Outputs(j)
            t = sg.Tensors(idx)
            name = t.Name().decode('utf-8') if t.Name() else '(unnamed)'
            shape = [t.Shape(k) for k in range(t.ShapeLength())]
            outputs.append(f"{name}{shape}")
        print(f"  Subgraph[{i}]: inputs={sg.InputsLength()}, outputs={sg.OutputsLength()} {outputs}, tensors={sg.TensorsLength()}")

if __name__ == '__main__':
    os.makedirs(ASSETS_DIR, exist_ok=True)
    try:
        saved = extract_via_metadata()
        print(f"\nSaved {len(saved)} model file(s)")
    except Exception as e:
        print(f"Metadata extraction failed: {e}")
    inspect_flatbuffer()
