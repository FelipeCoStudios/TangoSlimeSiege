import os, glob
import numpy as np
from PIL import Image
from scipy import ndimage

RAW = 'work/sprites-raw'
OUT = 'work/segments'
os.makedirs(OUT, exist_ok=True)

for p in sorted(glob.glob(os.path.join(RAW, '*.png'))):
    im = Image.open(p).convert('RGBA')
    a = np.array(im)
    alpha = a[..., 3]
    mask = alpha > 25
    # dilate to merge parts of same character
    md = ndimage.binary_dilation(mask, iterations=18)
    lab, n = ndimage.label(md)
    objs = ndimage.find_objects(lab)
    comps = []
    for i, sl in enumerate(objs, start=1):
        ys, xs = sl
        h = ys.stop - ys.start; w = xs.stop - xs.start
        size = int((lab[sl] == i)[mask[sl]].sum()) if False else int(((lab[sl] == i) & (mask[sl])).sum())
        if size < 4000 or w < 60 or h < 60:
            continue
        comps.append((i, xs.start, ys.start, xs.stop, ys.stop, size))
    name = os.path.basename(p).replace('.png','')
    print(f'{name}: {len(comps)} components')
    # save each component cropped from ORIGINAL image (tight bbox on original mask)
    for ci, (i, x0, y0, x1, y1, size) in enumerate(comps):
        sel = (lab[y0:y1, x0:x1] == i)
        sub_mask = sel & mask[y0:y1, x0:x1]
        ys2, xs2 = np.where(sub_mask)
        tx0, tx1 = xs2.min(), xs2.max()+1
        ty0, ty1 = ys2.min(), ys2.max()+1
        crop = a[ty0:ty1, tx0:tx1].copy()
        # zero out pixels not belonging to this component
        cm = np.zeros(crop.shape[:2], bool)
        cm[ys2 - ty0 + (y0 - y0), xs2 - tx0] = True
        keep = sub_mask[ty0-y0:ty1-y0, tx0-x1+x1*0+0:] if False else None
        # simpler: rebuild keep mask in crop coords
        keep = sub_mask[ty0-y0:ty1-y0, tx0-x0:tx1-x0]
        crop[..., 3] = np.where(keep, crop[..., 3], 0)
        outp = os.path.join(OUT, f'{name}__c{ci}_{x1-x0}x{y1-y0}.png')
        Image.fromarray(crop, 'RGBA').save(outp)
        dom = crop[...,:3][crop[...,3]>128].mean(axis=0).astype(int)
        print(f'   c{ci}: {tx1-tx0}x{ty1-ty0} px, meanRGB={tuple(dom)}, area={size}')
