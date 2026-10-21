
import bpy,json
from array import array
from pathlib import Path
ROOT=Path(__file__).resolve().parent if '__file__' in globals() else Path('C:/projects/SpaceTrader/client/assets/models/planets')
keys=list(json.loads((ROOT/'specs.json').read_text(encoding='utf8')))
TW,TH,COLS,ROWS=640,480,3,4
W,H=TW*COLS,TH*ROWS
for source,dest in [('preview.png','overview-empty.png'),('preview-populated.png','overview-populated.png')]:
    pixels=array('f',[.035,.055,.07,1])*(W*H)
    for i,k in enumerate(keys):
        im=bpy.data.images.load(str(ROOT/k/source),check_existing=False);im.scale(TW,TH)
        src=array('f',[0])*(TW*TH*4);im.pixels.foreach_get(src)
        x=i%COLS*TW;y=(ROWS-1-i//COLS)*TH
        for row in range(TH):
            a=((y+row)*W+x)*4;pixels[a:a+TW*4]=src[row*TW*4:(row+1)*TW*4]
        bpy.data.images.remove(im)
    out=bpy.data.images.new('Planet_Overview',width=W,height=H,alpha=True);out.pixels.foreach_set(pixels)
    out.filepath_raw=str(ROOT/dest);out.file_format='PNG';out.save()
