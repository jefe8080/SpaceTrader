"""Landscape revision 2: elevated lots, distinct geography, front-facing buildings.
Run with Blender --background --factory-startup --python generate_landscapes.py.
Exports to v2/; the original first revision stays available.
"""
import bpy, math, json, random, struct, heapq
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parent
SPECS = json.loads((ROOT/'specs.json').read_text(encoding='utf-8'))
THEMES = {
 'agrar':((.32,.49,.20),(.18,.30,.12),(.36,.33,.22)),
 'ocean':((.70,.63,.42),(.41,.43,.28),(.46,.45,.31)),
 'desert':((.75,.51,.28),(.50,.30,.15),(.54,.37,.24)),
 'mining':((.34,.31,.29),(.19,.19,.21),(.27,.28,.28)),
 'ice':((.79,.89,.92),(.39,.61,.70),(.46,.60,.65)),
 'urban':((.38,.44,.40),(.22,.29,.27),(.24,.28,.32)),
 'resort':((.65,.66,.40),(.31,.46,.25),(.50,.46,.32)),
 'gasgiant':((.27,.36,.42),(.14,.23,.30),(.25,.30,.36)),
 'jungle':((.22,.39,.16),(.10,.23,.11),(.28,.28,.20)),
 'volcanic':((.24,.21,.23),(.12,.12,.15),(.31,.28,.29)),
 'colony':((.45,.49,.31),(.28,.35,.22),(.38,.37,.30)),
 'industrial':((.40,.39,.33),(.24,.26,.25),(.26,.29,.30)),
}
DESCRIPTIONS={
 'agrar':'Rolling farmland, crop terraces, irrigation and a wooded ridge',
 'ocean':'Four raised islands, sandy shores, bridges and a small harbour island',
 'desert':'Dune basin, oasis, sandstone mesas and winding caravan streets',
 'mining':'Terraced quarry, mineral seams, mine roads and a mountain ridge',
 'ice':'Glacier terraces, frozen river, ice cliffs and snow peaks',
 'urban':'Three stepped city districts, retaining walls, parks and a canal',
 'resort':'Coastal terraces, lagoon, palm beaches and resort paths',
 'gasgiant':'Floating platform archipelago at several heights with support towers',
 'jungle':'Forest clearings, winding river, overgrown ridges and canopy',
 'volcanic':'Basalt terraces, a raised volcanic crater and flowing lava',
 'colony':'Pioneer terraces, river valley, rocky hills and solar fields',
 'industrial':'Stepped industrial yards, slag hills, tanks, pipes and a canal',
}
def material(name,color,metal=0,emission=0):
 m=bpy.data.materials.new('Landscape_'+name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
 p.inputs['Roughness'].default_value=.8;p.inputs['Metallic'].default_value=metal
 p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m
class Geometry:
 def __init__(self,name):self.name=name;self.v=[];self.f=[];self.mi=[]
 def add(self,vertices,faces,mat):
  start=len(self.v);self.v.extend(vertices)
  self.f.extend(tuple(i+start for i in face) for face in faces);self.mi.extend([mat]*len(faces))
 def object(self,collection,mats):
  d=bpy.data.meshes.new(self.name);d.from_pydata(self.v,[],self.f);d.update()
  o=bpy.data.objects.new(self.name,d);collection.objects.link(o)
  for m in mats:d.materials.append(m)
  for p,i in zip(d.polygons,self.mi):p.material_index=i
  return o
def box(g,x,y,z,w,d,h,m):
 vs=[(x+dx*w/2,y+dy*d/2,z+dz*h/2) for dz in [-1,1] for dy in [-1,1] for dx in [-1,1]]
 g.add(vs,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],m)
def cone(g,x,y,z,rx,ry,h,m,n=8,tip=.0):
 vs=[(x+rx*math.cos(i*math.tau/n),y+ry*math.sin(i*math.tau/n),z) for i in range(n)]
 if tip==0:
  vs.append((x,y,z+h))
  faces=[tuple(range(n-1,-1,-1))]+[(i,(i+1)%n,n) for i in range(n)]
 else:
  vs += [(x+rx*tip*math.cos(i*math.tau/n),y+ry*tip*math.sin(i*math.tau/n),z+h) for i in range(n)]
  faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 g.add(vs,faces,m)
def ellipsoid(g,x,y,z,rx,ry,rz,m):
 from itertools import combinations
 phi=(1+math.sqrt(5))/2
 points=[Vector(p) for p in [(a,b,0) for a in [-1,1] for b in [-phi,phi]]+[(0,a,b) for a in [-1,1] for b in [-phi,phi]]+[(b,0,a) for a in [-1,1] for b in [-phi,phi]]]
 faces=[(i,j,k) for i,j,k in combinations(range(12),3) if all(abs((points[a]-points[b]).length-2)<1e-5 for a,b in [(i,j),(j,k),(k,i)])]
 g.add([(x+p.normalized().x*rx,y+p.normalized().y*ry,z+p.normalized().z*rz) for p in points],faces,m)
def hill(x,y,cx,cy,rx,ry,h):
 return h*max(0,1-((x-cx)/rx)**2-((y-cy)/ry)**2)**1.35
def coordinates(k):
 if k in ['ocean','gasgiant']:
  centers=[(-45,-35),(42,-35),(-43,34),(43,34)]
  return [(cx+dx,cy+dy) for cx,cy in centers for dy in [-16,0,16] for dx in [-11,11]]
 if k=='desert':
  return [(r*math.cos(i*math.tau/12+phase),r*.86*math.sin(i*math.tau/12+phase)) for r,phase in [(43,.13),(73,.13)] for i in range(12)]
 if k=='mining':
  return [(x,y) for y in [-38,4,43] for x in [-70,-50,-30,-10,10,30,50,70]]
 if k=='urban':
  return [(cx+dx,cy+dy) for cx,cy in [(-49,-25),(39,-15),(0,43)] for dy in [-10,10] for dx in [-31.5,-10.5,10.5,31.5]]
 if k=='jungle':
  return [(cx+dx,cy+dy) for cx,cy in [(-44,-32),(43,-27),(-43,30),(42,36)] for dy in [-16,0,16] for dx in [-11,11]]
 ys={'agrar':[-32,-7,19,43],'ice':[-35,-10,15,41],'resort':[-29,-4,21,46],
     'volcanic':[-44,-22,0,22],'colony':[-37,-12,15,43],'industrial':[-38,-12,15,42]}[k]
 return [(x+(2 if row%2 else -2)+(col%2)*.7,y+(col%3-1)*1.5) for row,y in enumerate(ys) for col,x in enumerate([-58,-36,-14,14,36,58])]
def terrain_base(k,x,y):
 if k in ['ocean','gasgiant']:
  levels=[2.4,4.0,7.2,9.0] if k=='ocean' else [5,9,13,17]
  v=-1.0 if k=='ocean' else -8
  for (cx,cy),level in zip([(-45,-35),(42,-35),(-43,34),(43,34)],levels):
   r=math.sqrt(((x-cx)/33)**2+((y-cy)/31)**2)
   v=max(v,level*min(1,max(0,(1.05-r)/.30)))
  r=math.sqrt((x/23)**2+((y-73)/16)**2)
  return max(v,(5 if k=='ocean' else 12)*min(1,max(0,(1-r)/.28)))
 base=1.6+(y+40)*.055+1.0*math.sin(x*.07+y*.05)
 if k=='agrar':return base+hill(x,y,-68,61,33,28,15)+hill(x,y,62,63,26,25,11)
 if k=='desert':return 1+hill(x,y,-78,51,22,32,22)+hill(x,y,73,52,26,25,18)+2*(1+math.sin(x*.07+y*.1))
 if k=='mining':return round((7+(y+40)*.09-hill(x,y,0,7,36,30,11)+hill(x,y,0,74,77,27,25))/2)*2
 if k=='ice':return 2+math.floor((y+48)/24)*3+hill(x,y,-60,64,32,23,24)+hill(x,y,47,66,32,22,19)-hill(x,y,0,0,6,80,4)
 if k=='urban':return 2+math.floor((y+46)/25)*2.6
 if k=='resort':return 1.2+(y+35)*.09+hill(x,y,-76,57,24,27,17)
 if k=='jungle':return base+hill(x,y,-67,66,37,27,20)+hill(x,y,68,60,26,31,16)
 if k=='volcanic':
  r=math.sqrt((x/28)**2+((y-60)/24)**2)
  volcano=33*max(0,1-r/1.7)-hill(x,y,0,60,11,10,13)
  return max(base,volcano)
 if k=='colony':return base+hill(x,y,-76,56,29,34,19)+hill(x,y,65,62,29,24,16)
 return 3+math.floor((y+45)/25)*2+hill(x,y,-76,61,25,24,16)+hill(x,y,72,64,25,24,14)
def make_slots(k):
 cats=[cat for cat,n in SPECS[k]['factory_categories'].items() for _ in range(n)]
 out=[]
 coords=coordinates(k)
 # Frontmost left-hand lot is the easily reached questhouse.
 coords.sort(key=lambda p:(round(p[1]/12),p[0]))
 for i,(x,y) in enumerate(coords):
  role='questhouse' if i==0 else ('factory' if i>=24-len(cats) else 'general')
  cat=cats[i-(24-len(cats))] if role=='factory' else None
  out.append(dict(id='slot_'+str(i+1).zfill(2),role=role,category=cat,x=round(x,2),y=round(y,2),z=round(max(.7,terrain_base(k,x,y)),2),footprint=[13,10],clearance_height=12))
 lx,ly=(0,73) if k in ['ocean','gasgiant'] else ((0,0) if k=='desert' else (0,-65) if k=='volcanic' else (0,70))
 out.append(dict(id='slot_large',role='large',category=None,x=lx,y=ly,z=round(max(.7,terrain_base(k,lx,ly)),2),footprint=[18,13],clearance_height=12))
 props=[(-45,-29),(42,-29),(-43,40),(43,40)] if k in ['ocean','gasgiant'] else [(-85,-58),(85,-58),(-85,60),(85,60)]
 for i,(x,y) in enumerate(props):
  out.append(dict(id='prop_'+str(i+1).zfill(2),role='prop',category=None,x=x,y=y,z=round(max(.7,terrain_base(k,x,y)),2),footprint=[3.6,3.6],clearance_height=3))
 for s in out:
  s['node']='planet_'+k+'__'+s['id'];s['rotation_y']=0
  s['position']=[s['x'],round(s['z']+.12,3),-s['y']]
 return out
def generate(k):
 rng=random.Random(491+list(SPECS).index(k));slots=make_slots(k)
 fields=[]
 if k=='agrar':
  fields=[dict(x=x,y=-61,z=terrain_base(k,x,-61),footprint=[25,16]) for x in [-64,-32,0,32,64]]
  fields += [dict(x=x,y=0,z=terrain_base(k,x,0),footprint=[12,55]) for x in [-85,85]]
 zones=slots+fields
 def height(x,y):
  natural=terrain_base(k,x,y);best=0;level=natural
  for s in zones:
   dx=max(0,abs(x-s['x'])-s['footprint'][0]/2-.65)
   dy=max(0,abs(y-s['y'])-s['footprint'][1]/2-.65)
   d=math.hypot(dx,dy);weight=max(0,1-d/3.5)
   if weight>best:best=weight;level=s['z']
  return natural*(1-best)+level*best
 def clear(x,y,rx,ry):
  return all(abs(x-s['x'])>rx+s['footprint'][0]/2+1 or abs(y-s['y'])>ry+s['footprint'][1]/2+1 for s in zones)
 colors=[THEMES[k][0],THEMES[k][1],THEMES[k][2],tuple(min(1,c*1.13) for c in THEMES[k][0]),
         (.07,.43,.59) if k not in ['ice','volcanic'] else ((.22,.63,.78) if k=='ice' else (.98,.20,.02)),
         tuple(c*.82+d*.18 for c,d in zip(THEMES[k][0],(.74,.68,.49))),(.91,.84,.62),(.24,.39,.14),(.12,.28,.14),(.48,.28,.13),(.73,.66,.26),(.10,.25,.32),(.92,.47,.13),(.82,.90,.93)]
 names=['ground','rock','road','light_ground','water','pad','sand','leaf','dark_leaf','wood','crop','metal','accent','snow']
 mats=[material(k+'_'+n,c,.3 if n=='metal' else 0,1.2 if n=='water' and k=='volcanic' else 0) for n,c in zip(names,colors)]
 T,R,D=[Geometry('planet_'+k+'__'+n) for n in ['Terrain','Roads','Decoration']]
 # A triangulated solid landmass with real relief; ocean uses separated island surfaces.
 step=2
 verts=[];indices={}
 for iy,y in enumerate(range(-78,91,step)):
  for ix,x in enumerate(range(-98,99,step)):
   h=height(x,y)
   if k=='ocean' and h<.1:continue
   if k=='gasgiant':continue
   if k!='ocean' and (abs(x)>95 or abs(y-5)>81 or abs(x)+abs(y-5)>157):continue
   indices[(ix,iy)]=len(verts);verts.append((x,y,h))
 faces=[];materials=[];edges={}
 for (ix,iy),a in indices.items():
  keys=[(ix,iy),(ix+1,iy),(ix+1,iy+1),(ix,iy+1)]
  if not all(p in indices for p in keys):continue
  a,b,c,d=[indices[p] for p in keys]
  for face in [(a,b,c),(a,c,d)]:
   faces.append(face)
   cx=sum(verts[i][0] for i in face)/3;cy=sum(verts[i][1] for i in face)/3;z=sum(verts[i][2] for i in face)/3
   materials.append(6 if k in ['ocean','resort'] and z<1.7 else 13 if k=='ice' and z>10 else 1 if k in ['mining','volcanic','colony'] and z>13 else 3 if rng.random()<.12 else 0)
   for u,v in zip(face,face[1:]+face[:1]):
    key=tuple(sorted((u,v)));edges[key]=edges.get(key,0)+1
 T.v.extend(verts);T.f.extend(faces);T.mi.extend(materials)
 for (a,b),count in edges.items():
  if count==1:
   va,vb=verts[a],verts[b];floor=-3 if k=='ocean' else -5
   T.add([va,vb,(vb[0],vb[1],floor),(va[0],va[1],floor)],[(0,1,2,3)],1)
 if k=='ocean':
  box(T,0,4,-3.5,198,174,1,1);box(T,0,4,-.22,198,174,.12,4)
 if k=='ocean':
  for x in range(-82,83,15):
   for y in range(-66,82,15):
    if height(x,y)<0 and rng.random()<.55:
     T.add([(x-2,y,-.14),(x+2,y,-.14),(x+1,y+.2,-.13),(x-1,y+.2,-.13)],[(0,1,2,3)],13)
 if k=='gasgiant':
  for cx,cy,w,d in [(-45,-35,66,62),(42,-35,66,62),(-43,34,66,62),(43,34,66,62),(0,73,46,31)]:
   z=height(cx,cy);box(T,cx,cy,z-.65,w,d,1.3,0)
   for dx in [-22,22]:
    for dy in [-20,20]:
     if d<40 and abs(dy)>15:continue
     cone(T,cx+dx,cy+dy,z-9,1.7,1.7,8,11,8,.7)
     cone(D,cx+dx,cy+dy,z-10,2.2,2.2,1,12,8,1)
   box(T,cx,cy,z-.75,w-3,d-3,.15,11)
  for x,y in [(-75,65),(70,-55),(-55,-59),(55,69),(0,-50)]:
   cone(D,x,y,-19,22,15,9,6,9,.25)
 def surface(x,y):
  ix,iy=math.floor((x+98)/2),math.floor((y+78)/2)
  keys=[(ix,iy),(ix+1,iy),(ix+1,iy+1),(ix,iy+1)]
  if not all(key in indices for key in keys):return height(x,y)
  a,b,c,d=[verts[indices[key]][2] for key in keys]
  u=(x-(-98+ix*2))/2;v=(y-(-78+iy*2))/2
  return a*(1-u)+b*(u-v)+c*v if u>=v else a*(1-v)+c*u+d*(v-u)
 # Raised pads set the exported anchors exactly on their usable ground.
 for s in slots:
  x,y,z=s['x'],s['y'],s['z'];w,d=s['footprint']
  box(R,x,y,z+.055,w+.65,d+.65,.11,5)
  for dx in [-w/2,w/2]:
   for dy in [-d/2,d/2]:box(R,x+dx,y+dy,z+.116,.55,.12,.012,12)
 # A road network follows the actual lots using obstacle-aware routing.
 access=[(s['x'],s['y']-s['footprint'][1]/2-2.4,s['z']) for s in slots if s['role']!='prop']
 def blocked(cell):
  x,y=cell[0]*2,cell[1]*2
  return abs(x)>94 or y<-77 or y>85 or any(abs(x-s['x'])<s['footprint'][0]/2+1.45 and abs(y-s['y'])<s['footprint'][1]/2+1.45 for s in slots)
 def nearest(x,y):
  cell=(round(x/2),round(y/2))
  candidates=[(cell[0]+dx,cell[1]+dy) for dx in range(-5,6) for dy in range(-5,6)]
  return min((c for c in candidates if not blocked(c)),key=lambda c:(c[0]*2-x)**2+(c[1]*2-y)**2)
 def route(a,b):
  start,end=nearest(a[0],a[1]),nearest(b[0],b[1]);q=[(0,start)];cost={start:0};prev={}
  while q:
   _,cur=heapq.heappop(q)
   if cur==end:break
   for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
    nxt=(cur[0]+dx,cur[1]+dy)
    if blocked(nxt):continue
    weight=1+.025*abs(height(nxt[0]*2,nxt[1]*2)-height(cur[0]*2,cur[1]*2))
    new=cost[cur]+weight
    if new<cost.get(nxt,1e9):
     cost[nxt]=new;prev[nxt]=cur;heapq.heappush(q,(new+abs(nxt[0]-end[0])+abs(nxt[1]-end[1]),nxt))
  if end not in cost:raise RuntimeError('Disconnected road '+k)
  cells=[end]
  while cells[-1]!=start:cells.append(prev[cells[-1]])
  return list(reversed(cells))
 used=set();links=[];connected={0}
 while len(connected)<len(access):
  a,b=min(((a,b) for a in connected for b in range(len(access)) if b not in connected),key=lambda ab:(access[ab[0]][0]-access[ab[1]][0])**2+(access[ab[0]][1]-access[ab[1]][1])**2)
  links.append((a,b));connected.add(b)
 for ai,bi in links:
  a,b=access[ai],access[bi];cells=route(a,b)
  for j,cell in enumerate(cells):
   if cell in used:continue
   used.add(cell);x,y=cell[0]*2,cell[1]*2;z=height(x,y)
   if k in ['ocean','gasgiant']:
    z=max(z,a[2]+(b[2]-a[2])*j/max(1,len(cells)-1))
    if z-height(x,y)>1 and j%4==0:
     cone(R,x,y,-.1 if k=='ocean' else -12,.20,.20,z+.1 if k=='ocean' else z+12,11,6,1)
   box(R,x,y,z+.10,2.65,2.65,.16,2)
   if j%5==0:box(R,x,y,z+.19,.85,.10,.016,6)
 # Short entrance walks run forward from each building to its closest road cell.
 for s in slots:
  if s['role']=='prop':continue
  x,y,z=s['x'],s['y'],s['z'];d=s['footprint'][1]
  for j in range(4):
   yy=y-d/2-.3-j*.65
   box(R,x,yy,max(height(x,yy),z)+.10,2.2,.8,.16,5)
 # Landscape-specific features are deliberately outside every reserved footprint.
 def plant(x,y,h=5,palm=False):
  z=height(x,y)
  cone(D,x,y,z,.24,.24,h*.7,9,6,.7)
  if palm:
   for i in range(6):
    a=i*math.tau/6
    D.add([(x,y,z+h),(x+math.cos(a)*3-math.sin(a)*.6,y+math.sin(a)*3+math.cos(a)*.6,z+h-.7),(x+math.cos(a)*4,y+math.sin(a)*4,z+h-1.4)],[(0,1,2)],7)
  else:
   ellipsoid(D,x,y,z+h*.72,h*.37,h*.33,h*.40,7)
   ellipsoid(D,x+.45,y-.25,z+h*.84,h*.25,h*.24,h*.28,8)
 def rock(x,y,h=3):
  z=height(x,y);ellipsoid(D,x,y,z+h*.35,2.4,1.8,h*.58,1)
 points=[]
 for x in range(-88,89,9):
  for y in range(-65,80,9):
   xx=x+rng.uniform(-2,2);yy=y+rng.uniform(-2,2)
   if not clear(xx,yy,3.5,3.5):continue
   if min((xx-c[0]*2)**2+(yy-c[1]*2)**2 for c in used)<22:continue
   if k in ['ocean','gasgiant'] and height(xx,yy)<.8:continue
   points.append((xx,yy))
 for i,(x,y) in enumerate(points):
  if k in ['jungle','agrar','colony','resort','ocean']:
   if k=='agrar' and y<-45:continue
   if k in ['ocean','resort'] and rng.random()<.6:plant(x,y,4.8,True)
   elif k=='jungle' or rng.random()<.6:plant(x,y,7+rng.random()*3 if k=='jungle' else 4.5)
   else:rock(x,y,2+rng.random()*2)
  elif k=='desert':
   if i%3==0:
    z=height(x,y);cone(D,x,y,z,.45,.45,3.6,7,6,.65)
    box(D,x+.65,y,z+2,1.3,.35,.35,7)
   else:cone(D,x,y,height(x,y),4.3,2.4,1.8,3,6,.2)
  elif k=='ice':cone(D,x,y,height(x,y),2.1,1.5,4+rng.random()*5,13,5,.0)
  elif k=='mining':
   rock(x,y,3+rng.random()*4)
   if i%3==0:cone(D,x+.7,y,height(x,y)+1,.8,.8,3,4,5,0)
  elif k=='volcanic':
   if (x*x+(y-60)**2)>400:rock(x,y,2+rng.random()*3)
  elif k=='urban':
   z=height(x,y);box(D,x,y,z+.25,4,3,.5,11);plant(x,y,4)
  elif k=='industrial':
   z=height(x,y)
   if i%3:box(D,x,y,z+.7,3,2,1.4,11)
   else:cone(D,x,y,z,1.5,1.5,3.5,5,10,1)
  elif k=='gasgiant':
   z=height(x,y);cone(D,x,y,z,1,1,2,11,8,.75)
 for f in fields:
  x,y,z=f['x'],f['y'],f['z'];w,d=f['footprint']
  box(D,x,y,z+.026,w,d,.05,9)
  for j in range(int(w/1.25)):
   xx=x-w/2+.6+j*1.25
   box(D,xx,y,z+.22,.45,d-.8,.40,10 if int(x)%3 else 7)
  for side in [-1,1]:box(D,x+side*(w/2+.35),y,z+.05,.35,d,.1,4)
 # Waterways, bridges and special landmarks give each silhouette its own identity.
 if k in ['jungle','colony','urban','industrial','ice','resort']:
  for y in range(-69,78,2):
   x=12*math.sin(y*.05) if k in ['jungle','colony'] else (84 if k in ['urban','industrial'] else 0 if k=='ice' else -85)
   if not clear(x,y,2.2,1.1):continue
   if min((x-c[0]*2)**2+(y-c[1]*2)**2 for c in used)<12:continue
   corners=[(x-2.1,y-1.1),(x+2.1,y-1.1),(x+2.1,y+1.1),(x-2.1,y+1.1)]
   T.add([(xx,yy,surface(xx,yy)+.13) for xx,yy in corners],[(0,1,2),(0,2,3)],4)
 if k=='desert':
  for x,y,w,d in [(-23,0,12,15),(-23,-9,9,8)]:
   if clear(x,y,w/2,d/2):box(T,x,y,height(x,y)+.02,w,d,.04,4)
  for x,y in [(-23,-12),(-31,-1),(-16,9)]:
   if clear(x,y,3,3):plant(x,y,5,True)
 if k=='volcanic':
  cone(T,0,60,height(0,60)+.1,10,9,.2,4,24,1)
  for y in range(34,59,2):
   x=3*math.sin(y*.3)
   if clear(x,y,2,1):
    x2=3*math.sin((y+2)*.3)
    corners=[(x-1.9,y),(x+1.9,y),(x2+1.9,y+2),(x2-1.9,y+2)]
    T.add([(xx,yy,surface(xx,yy)+.17) for xx,yy in corners],[(0,1,2),(0,2,3)],4)
 if k=='resort':
  for x in [-70,-35,35,70]:
   if clear(x,-63,4,4):
    z=height(x,-63);box(T,x,-63,z+.02,15,14,.04,6)
    cone(D,x,-63,z,.1,.1,2.6,9,6,1);cone(D,x,-63,z+2.6,2,2,.5,6,8,0)
 if k in ['colony','industrial']:
  for x in [-62,-42,42,62]:
   if clear(x,-62,6,5):
    z=height(x,-62)
    for dx in [-3,0,3]:
     box(D,x+dx,-62,z+1.4,2.5,5,.16,11)
     box(D,x+dx,-62,z+.65,.18,3,1.3,5)
 # Export just the generated landscape, roads and anchors.
 scene=bpy.data.scenes.new('Landscape_v2_'+k);bpy.context.window.scene=scene;scene.unit_settings.system='METRIC'
 collection=bpy.data.collections.new('Landscape_v2_'+k);scene.collection.children.link(collection)
 root=bpy.data.objects.new('planet_'+k,None);collection.objects.link(root)
 objects=[g.object(collection,mats) for g in [T,R,D]]
 for o in objects:
  o.parent=root
  # Recalculate normals in the export-ready geometry.
  import bmesh
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 for s in slots:
  o=bpy.data.objects.new(s['node'],None);collection.objects.link(o);o.parent=root
  o.location=(s['x'],s['y'],s['z']+.12);o['slot_id']=s['id'];o['role']=s['role']
  o['width']=s['footprint'][0];o['depth']=s['footprint'][1]
  if s['category']:o['category']=s['category']
 out=ROOT/'v2'/k;out.mkdir(parents=True,exist_ok=True)
 bpy.ops.object.select_all(action='DESELECT')
 for o in collection.objects:o.select_set(True)
 bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.gltf(filepath=str(out/'ground.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
 data=(out/'ground.glb').read_bytes();n=struct.unpack_from('<I',data,12)[0];gl=json.loads(data[20:20+n])
 assert len(gl['meshes'])==3
 byname={n['name']:n for n in gl['nodes']}
 for s in slots:
  assert all(abs(a-b)<.0001 for a,b in zip(byname[s['node']]['translation'],s['position']))
  for dx in [-s['footprint'][0]/2,0,s['footprint'][0]/2]:
   for dy in [-s['footprint'][1]/2,0,s['footprint'][1]/2]:
    assert abs(height(s['x']+dx,s['y']+dy)-s['z'])<.001
 for i,a in enumerate(slots):
  for b in slots[i+1:]:
   assert not(abs(a['x']-b['x'])<(a['footprint'][0]+b['footprint'][0])/2+.3 and abs(a['y']-b['y'])<(a['footprint'][1]+b['footprint'][1])/2+.3),(k,a['id'],b['id'])
 clean=[{a:b for a,b in s.items() if a not in ['x','y','z']} for s in slots]
 layout=dict(planet_type=k,units='meters',coordinate_system='glTF, +Y up',terrain_root='planet_'+k,regular_pad_count=24,large_pad_count=1,prop_point_count=4,factory_capacity=SPECS[k]['factory_categories'],slots=clean,layout_id='landscape_v2_'+k,ground_url='v2/'+k+'/ground.glb',description=DESCRIPTIONS[k],camera=dict(projection='orthographic',front='+Z'))
 (out/'layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2),encoding='utf-8')
 tris=sum(gl['accessors'][p['indices']]['count']//3 for m in gl['meshes'] for p in m['primitives'])
 meta=dict(planet_type=k,label=SPECS[k]['label'],description=DESCRIPTIONS[k],triangles=tris,materials=len(gl['materials']),glb_bytes=len(data),meshes=3,placement_nodes=len(slots),buildings_in_glb=False,elevation_range_m=[min(s['z'] for s in slots),max(s['z'] for s in slots)],checks=['usable footprints flat at elevated anchors','reserved footprints separated','anchors match GLB','fronts +Z','connected roads avoid reserved footprints'],layout='layout.json')
 (out/'asset.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
 bpy.data.libraries.write(str(out/'ground.blend'),{scene},fake_user=True)
 return dict(planet_type=k,label=SPECS[k]['label'],glb='v2/'+k+'/ground.glb',blend='v2/'+k+'/ground.blend',layout='v2/'+k+'/layout.json',preview='v2/'+k+'/preview.png',preview_populated='v2/'+k+'/preview-populated.png',bytes=len(data),triangles=tris,anchor_count=29,description=DESCRIPTIONS[k])
def main():
 manifest=dict(version=2,layout_id='landscape_v2',up='+Y',units='meters',helper='placement.js',assets=[])
 for k in SPECS:
  print('LANDSCAPE_BUILD '+k,flush=True)
  manifest['assets'].append(generate(k))
  print('LANDSCAPE_DONE '+k,flush=True)
 (ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 print('LANDSCAPES_COMPLETE',flush=True)
if __name__=='__main__':main()
