import os, json
import numpy as np
from PIL import Image, ImageFilter

RAWMAP = {
  '31':    'WhatsApp_Image_2026-10-09_at_15.48.31.png',
  '31_(1)':'WhatsApp_Image_2026-10-09_at_15.48.31_(1).png',
  '31_(2)':'WhatsApp_Image_2026-10-09_at_15.48.31_(2).png',
  '31_(3)':'WhatsApp_Image_2026-10-09_at_15.48.31_(3).png',
  '31_(5)':'WhatsApp_Image_2026-10-09_at_15.48.31_(5).png',
  '31_(6)':'WhatsApp_Image_2026-10-09_at_15.48.31_(6).png',
  '32':    'WhatsApp_Image_2026-10-09_at_15.48.32.png',
  '32_(1)':'WhatsApp_Image_2026-10-09_at_15.48.32_(1).png',
  '32_(2)':'WhatsApp_Image_2026-10-09_at_15.48.32_(2).png',
  '32_(3)':'WhatsApp_Image_2026-10-09_at_15.48.32_(3).png',
}

ASSIGN = {  # sprite key -> image tag
  'dog_sneaker':     '31_(5)',
  'dog_normal':      '32_(3)',
  'dog_boxer':       '32',
  'dog_sunflower':   '31_(2)',
  'dog_mummy':       '31_(1)',
  'dog_bard':        '31_(3)',
  'dog_bubble':      '32_(2)',
  'dog_firemage':    '31_(6)',
  'dog_crystal':     '32_(1)',
  'dog_electrician': '31',
  'dog_mecha':       '31_(4)',  # placeholder replaced below
}
ASSIGN['dog_mecha'] = '31'  # Mecha <- 31 (grande y gris metalico)
del ASSIGN['dog_mecha']; ASSIGN['dog_mecha']='31'
# normal<-32_(3), electrician<-31, mecha<-31? conflict: 31 used twice. Fix:
ASSIGN.update({
  'dog_sneaker':     '31_(5)',
  'dog_normal':      '32_(3)',
  'dog_boxer':       '32',
  'dog_sunflower':   '31_(2)',
  'dog_mummy':       '31_(1)',
  'dog_bard':        '31_(3)',
  'dog_bubble':      '32_(2)',
  'dog_firemage':    '31_(6)',
  'dog_crystal':     '32_(1)',
  'dog_electrician': '31_(4)' if False else '31',
})
# ensure uniqueness: remove duplicate by re-checking
seen={}
for k,v in list(ASSIGN.items()):
    seen.setdefault(v,[]).append(k)
dups={v:ks for v,ks in seen.items() if len(ks)>1}
if dups: raise SystemExit(f'DUPLICATED IMAGES: {dups}')

def load_seg(tag):
    """segment the character from raw image with tight bbox"""
    from scipy import ndimage
    p = os.path.join('work/sprites-raw', RAWMAP[tag])
    im = Image.open(p).convert('RGBA')
    a = np.array(im)
    mask = a[...,3] > 25
    md = ndimage.binary_dilation(mask, iterations=18)
    lab, n = ndimage.label(md)
    best=None; bestarea=0
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        area = int(((lab[sl]==i)&(mask[sl])).sum())
        if area>bestarea: bestarea=area; best=i
    comp = (lab==best) & mask
    ys,xs = np.where(comp)
    y0,y1,x0,x1 = ys.min(), ys.max()+1, xs.min(), xs.max()+1
    crop = a[y0:y1, x0:x1].copy()
    crop[...,3] = np.where(comp[y0:y1,x0:x1], crop[...,3], 0)
    return crop

def hue_of(a):
    import colorsys
    r,g,b = a[...,0]/255., a[...,1]/255., a[...,2]/255.
    mx=np.maximum(np.maximum(r,g),b); mn=np.minimum(np.minimum(r,g),b)
    d=mx-mn
    h=np.zeros_like(mx)
    m=d>0
    idx=m&(mx==r); h[idx]=((g[idx]-b[idx])/d[idx])%6
    idx=m&(mx==g); h[idx]=(b[idx]-r[idx])/d[idx]+2
    idx=m&(mx==b); h[idx]=(r[idx]-g[idx])/d[idx]+4
    h=(h*60)%360
    s=np.where(mx>0, d/np.maximum(mx,1e-9), 0)
    return h, s, mx

def recolor_hue(a, sel, target_deg):
    """rotate hue of selected pixels toward target_deg (0=red,120=green,240=blue)"""
    h,s,v = hue_of(a[...,:3].astype(float)/255.)
    out = a.copy()
    hh = h % 360
    # current warm direction ~ between 0 and 60; rotate to target
    delta = target_deg - np.where(hh<=180, hh, hh-360)
    nh = (h + delta) % 360
    # rebuild rgb from hsv
    import numpy as _n
    i = (nh/60).astype(int) % 6
    f = nh/60 - (nh//60)
    p = v*(1-s); q = v*(1-f*s); t = v*(1-(1-f)*s)
    r_=_[None]; 
    r = _n.choose(i, [v,t,p,p,q,v])
    g = _n.choose(i, [q,v,v,t,p,p])
    b = _n.choose(i, [p,p,q,v,v,t])
    rgb = (_n.stack([r,g,b],-1)*255).astype(_n.uint8)
    out[...,:3] = _n.where(sel[...,None], rgb, out[...,:3])
    return out

def brighten(a, sel, factor):
    out=a.copy().astype(np.float32)
    mul = np.ones(out.shape[:2], np.float32)*factor
    out[...,:3] = np.where(sel[...,None], np.clip(out[...,:3]*mul[...,None],0,255), out[...,:3])
    return out.astype(np.uint8)

def process(key, tag):
    a = load_seg(tag)
    H,W = a.shape[:2]
    alpha = a[...,3]>128
    rgb = a[...,:3].astype(int)
    mx = rgb.max(-1); mn = rgb.min(-1); sat = mx-mn
    r,g,b = rgb[...,0],rgb[...,1],rgb[...,2]
    warm = (r>g+25)&(r>b+25)&alpha
    blue = (b>r+25)&(b>g+5)&alpha
    green = (g>r+15)&(g>b+15)&alpha
    grayish = (sat<30)&(mx>70)&alpha
    feet0 = int(H*0.72)
    feetband = np.zeros((H,W),bool); feetband[feet0:,:]=True
    headband = np.zeros((H,W),bool); headband[:int(H*0.30),:]=True

    if key=='dog_sneaker':
        sel = grayish & feetband
        a = brighten(a, sel, 1.55)
    elif key=='dog_normal':
        pass
    elif key=='dog_boxer':
        sel = warm & headband
        a = brighten(a, sel, 1.15)
    elif key=='dog_sunflower':
        pass
    elif key=='dog_mummy':
        a = brighten(a, grayish, 1.25)
    elif key=='dog_bard':
        sel = green & ~headband
        a = recolor_hue(a, sel, 115)
        a = brighten(a, sel, 1.25)
    elif key=='dog_bubble':
        pass
    elif key=='dog_firemage':
        pass
    elif key=='dog_crystal':
        sel = blue
        a = recolor_hue(a, sel, 195)
        a = brighten(a, sel, 1.15)
    elif key=='dog_electrician':
        sel = grayish & ~headband
        a = recolor_hue(a, sel, 210)
        a = brighten(a, sel, 1.1)
    elif key=='dog_mecha':
        sel = grayish
        a = brighten(a, sel, 1.12)
    return a

OUT='public/slime-tower/sprites'
os.makedirs(OUT, exist_ok=True)
manifest=[]
for key,tag in ASSIGN.items():
    a = process(key,tag)
    im = Image.fromarray(a)
    # resize to max height 512 preserving aspect
    w,h = im.size
    if h>512:
        nw = max(1, round(w*512/h)); im = im.resize((nw,512), Image.LANCZOS)
    # feather alpha edges by 1px blur on alpha channel
    arr = np.array(im)
    al = arr[...,3].astype(np.float32)
    alimg = Image.fromarray(al.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    arr[...,3] = np.array(alimg)
    im = Image.fromarray(arr)
    path=os.path.join(OUT,f'{key}.png'); im.save(path)
    manifest.append((key,tag,im.size))
    print('saved',path,im.size)

# generic projectile keys used by UI/engine fallbacks
import shutil
shutil.copy(os.path.join(OUT,'dog_normal.png'), os.path.join(OUT,'archer.png'))
shutil.copy(os.path.join(OUT,'dog_boxer.png'),  os.path.join(OUT,'cannon.png'))
shutil.copy(os.path.join(OUT,'dog_bard.png'),   os.path.join(OUT,'frost.png'))
print('generic copies done')
