import os, glob, json
import numpy as np
from PIL import Image
from scipy import ndimage

RAW = 'work/sprites-raw'
OUT = 'work/segments'
os.makedirs(OUT, exist_ok=True)

report = {}
for p in sorted(glob.glob(os.path.join(RAW, '*.png'))):
    im = Image.open(p).convert('RGBA')
    a = np.array(im)
    alpha = a[..., 3]
    mask = alpha > 25
    md = ndimage.binary_dilation(mask, iterations=18)
    lab, n = ndimage.label(md)
    comps = []
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        ys, xs = sl
        h = ys.stop - ys.start; w = xs.stop - xs.start
        area = int(((lab[sl] == i) & (mask[sl])).sum())
        if area < 4000 or w < 60 or h < 60:
            continue
        # component mask over full image region
        comp_full = (lab == i)
        sub = comp_full[ys, xs] & mask[ys, xs]
        ys2, xs2 = np.where(sub)
        ty0, ty1 = ys.start + ys2.min(), ys.start + ys2.max() + 1
        tx0, tx1 = xs.start + xs2.min(), xs.start + xs2.max() + 1
        keep = sub[ty0 - ys.start:ty1 - ys.start, tx0 - xs.start:tx1 - xs.start]
        crop = a[ty0:ty1, tx0:tx1].copy()
        crop[..., 3] = np.where(keep, crop[..., 3], 0)
        ci = len(comps)
        outp = os.path.join(OUT, f'{os.path.basename(p)[:-4]}__c{ci}.png')
        Image.fromarray(crop, 'RGBA').save(outp)
        dom = tuple(int(v) for v in crop[..., :3][crop[..., 3] > 128].mean(axis=0))
        comps.append({'file': os.path.basename(outp), 'w': tx1-tx0, 'h': ty1-ty0,
                      'x': tx0, 'y': ty0, 'area': area, 'rgb': dom})
    report[os.path.basename(p)] = comps
    print(f'{os.path.basename(p)}: {len(comps)} chars')
    for c in comps:
        print('   ', c['file'], f"{c['w']}x{c['h']}", 'at', (c['x'], c['y']), 'rgb', c['rgb'])
json.dump(report, open('work/segments/report.json', 'w'), indent=1)
