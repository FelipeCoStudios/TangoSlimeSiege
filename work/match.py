import os, glob
import numpy as np
from PIL import Image

def metrics(p):
    im = Image.open(p).convert('RGBA')
    a = np.array(im)
    m = a[..., 3] > 128
    rgb = a[..., :3].astype(int)
    mx = rgb.max(-1); sat = mx - rgb.min(-1)
    r,g,b = rgb[...,0],rgb[...,1],rgb[...,2]
    ys,xs = np.where(m)
    y0,y1,x0,x1 = ys.min(),ys.max()+1,xs.min(),xs.max()+1
    hh=y1-y0; ww=x1-x0
    def reg(fa,fb):
        ya,yb = y0+int(hh*fa), y0+int(hh*fb)
        mm=m[ya:yb,x0:x1]; n=max(mm.sum(),1)
        R=r[ya:yb,x0:x1]; G=g[ya:yb,x0:x1]; B=b[ya:yb,x0:x1]; M=mx[ya:yb,x0:x1]; S=sat[ya:yb,x0:x1]
        return dict(
            sat=((S>60)&mm).sum()/n, white=((M>=215)&mm).sum()/n, dark=((M<=70)&mm).sum()/n,
            warm=((R>G+25)&(R>B+25)&mm).sum()/n,
            yellow=((R>150)&(G>120)&((M-B)>60)&(abs(R-G)<60)&mm).sum()/n,
            blue=((B>R+25)&(B>G+5)&mm).sum()/n, green=((G>R+15)&(G>B+15)&mm).sum()/n)
    return dict(size=(ww,hh), aspect=ww/hh, fill=m.mean(), head=reg(0.0,0.25), feet=reg(0.75,1.0))

data={}
for p in sorted(glob.glob('work/segments/*.png')):
    tag=os.path.basename(p).replace('WhatsApp_Image_2026-10-09_at_15.48.','').replace('__c0.png','') or '31'
    data[tag]=metrics(p)

want = {
 'normal':      lambda d: (1-d['head']['dark'])*(1-d['feet']['dark'])*d['feet']['warm'],
 'sneaker':     lambda d: d['feet']['white']*(1-d['feet']['dark']),
 'boxer':       lambda d: d['head']['warm']*(1-d['feet']['dark']),
 'sunflower':   lambda d: min(1.0, d['head']['yellow']*max(d['head']['green'],0.05)*3),
 'mummy':       lambda d: min(1.0, d['head']['white']*(1-d['head']['sat'])*3),
 'bard':        lambda d: d['head']['warm']*(1-d['feet']['dark']),
 'bubble':      lambda d: min(1.0, d['head']['blue']*d['head']['sat']*3),
 'firemage':    lambda d: min(1.0, d['head']['warm']*d['head']['sat']*3),
 'crystal':     lambda d: min(1.0,(1-d['head']['dark'])*max(0,(0.6-d['aspect']))*4 + (1-d['head']['sat'])*d['head']['white']*2),
 'electrician': lambda d: min(1.0, d['head']['sat']*(1-d['head']['blue'])*d['feet']['dark']*3),
 'mecha':       lambda d: min(1.0, d['fill']*d['aspect']*(1-d['head']['warm'])*2),
}
troops=list(want.keys()); tags=list(data.keys())
S=np.zeros((len(troops), len(tags)))
for i,t in enumerate(troops):
    for j,tg in enumerate(tags):
        S[i,j]=float(min(want[t](data[tg]),1.0))
np.save('work/scores.npy', S)
open('work/troops.txt','w').write('\n'.join(troops))
open('work/tags.txt','w').write('\n'.join(tags))
print('scores saved')
for j,tg in enumerate(tags):
    order = np.argsort(-S[:,j])[:4]
    print(f"{tg:8s}", ', '.join(f"{troops[k]}({S[k,j]:.2f})" for k in order))
