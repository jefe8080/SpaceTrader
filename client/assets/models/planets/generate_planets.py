
import bpy,bmesh,math,json,random,struct,runpy
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/projects/SpaceTrader/client/assets/models/planets')
SPECS=json.loads((ROOT/'specs.json').read_text(encoding='utf8'))
LIB=runpy.run_path(str(ROOT.parent/'generate_buildings.py'))
G=LIB['box'].__globals__
box,cyl,cone,orb,beam,mesh=[LIB[n] for n in ['box','cyl','cone','orb','beam','mesh']]
THEMES={
'agrar':{'ground':(.30,.47,.19),'edge':(.21,.31,.12),'pad':(.47,.48,.33),'road':(.19,.23,.18),'accent':(.72,.72,.41),'flora':(.26,.45,.16),'water':(.10,.33,.43)},
'ocean':{'ground':(.58,.53,.38),'edge':(.30,.36,.34),'pad':(.53,.59,.56),'road':(.18,.26,.29),'accent':(.20,.65,.70),'flora':(.24,.43,.21),'water':(.04,.27,.40)},
'desert':{'ground':(.65,.42,.20),'edge':(.43,.25,.11),'pad':(.55,.46,.33),'road':(.33,.27,.21),'accent':(.94,.63,.24),'flora':(.22,.39,.24),'water':(.10,.42,.48)},
'mining':{'ground':(.28,.25,.23),'edge':(.17,.16,.16),'pad':(.40,.37,.33),'road':(.15,.18,.19),'accent':(.88,.43,.13),'flora':(.24,.30,.19),'water':(.19,.37,.38)},
'ice':{'ground':(.69,.81,.84),'edge':(.30,.50,.59),'pad':(.48,.62,.65),'road':(.22,.34,.41),'accent':(.22,.70,.83),'flora':(.31,.51,.46),'water':(.09,.39,.53)},
'urban':{'ground':(.31,.34,.35),'edge':(.16,.20,.22),'pad':(.43,.46,.46),'road':(.10,.14,.17),'accent':(.94,.62,.21),'flora':(.21,.38,.24),'water':(.12,.43,.48)},
'resort':{'ground':(.38,.53,.27),'edge':(.29,.37,.21),'pad':(.66,.61,.47),'road':(.38,.37,.30),'accent':(.24,.67,.67),'flora':(.25,.48,.24),'water':(.07,.49,.57)},
'gasgiant':{'ground':(.24,.31,.35),'edge':(.12,.19,.25),'pad':(.40,.47,.50),'road':(.10,.16,.22),'accent':(.98,.58,.20),'flora':(.55,.62,.57),'water':(.60,.39,.22)},
'jungle':{'ground':(.16,.31,.12),'edge':(.09,.19,.08),'pad':(.36,.39,.26),'road':(.20,.26,.18),'accent':(.52,.71,.24),'flora':(.15,.37,.17),'water':(.07,.31,.30)},
'volcanic':{'ground':(.19,.16,.17),'edge':(.10,.08,.09),'pad':(.33,.31,.30),'road':(.12,.14,.16),'accent':(.96,.33,.06),'flora':(.24,.22,.21),'water':(.95,.12,.01)},
'colony':{'ground':(.40,.43,.27),'edge':(.27,.29,.19),'pad':(.54,.49,.37),'road':(.29,.30,.25),'accent':(.27,.65,.69),'flora':(.30,.43,.21),'water':(.13,.39,.46)},
'industrial':{'ground':(.29,.29,.26),'edge':(.16,.18,.17),'pad':(.43,.42,.37),'road':(.13,.17,.18),'accent':(.98,.53,.15),'flora':(.25,.34,.25),'water':(.16,.36,.35)}
}
def material(name,rgb,metal=0,emission=0):
    return LIB['mat']('Planet_'+name,rgb,metal,.75,emission)
def palette(k):
    t=THEMES[k];p=LIB['palette']()
    for key in ['ground','edge','pad','road','accent','flora','water']:
        p[key]=material(k+'_'+key,t[key],.20 if key=='road' else 0,1.2 if k=='volcanic' and key=='water' else 0)
    p['ground_light']=material(k+'_Ground_Light',tuple(min(1,c*1.15+.015) for c in t['ground']))
    p['ground_dark']=material(k+'_Ground_Dark',tuple(c*.85 for c in t['ground']))
    p['rock']=material(k+'_Rocks',THEMES[k]['edge'])
    return p
def layout(k):
    spec=SPECS[k];cats=[cat for cat,n in spec['factory_categories'].items() for _ in range(n)]
    points=[]
    for row,y in enumerate([-28,-10,10,28]):
        for col,x in enumerate([-50,-30,-10,10,30,50]):
            i=row*6+col+1;role='questhouse' if i==1 else 'general';category=None
            if row==3 and col<len(cats):role='factory';category=cats[col]
            yaw=math.pi if row in [0,2] else 0
            points.append({'id':'slot_'+str(i).zfill(2),'node':'planet_'+k+'__slot_'+str(i).zfill(2),'role':role,'category':category,'position':[x,.12,-y],'rotation_y':yaw,'footprint':[13,10],'clearance_height':12,'_blender':[x,y,.12]})
    points.append({'id':'slot_large','node':'planet_'+k+'__slot_large','role':'large','category':None,'position':[0,.12,-44],'rotation_y':0,'footprint':[18,13],'clearance_height':12,'_blender':[0,44,.12]})
    for i,(x,y) in enumerate([(-63,-5),(-63,5),(63,-5),(63,5)]):
        points.append({'id':'prop_'+str(i+1).zfill(2),'node':'planet_'+k+'__prop_'+str(i+1).zfill(2),'role':'prop','category':None,'position':[x,.12,-y],'rotation_y':0,'footprint':[3.6,3.6],'clearance_height':3,'_blender':[x,y,.12]})
    return points
def choose_group(name):
    global asset
    asset=groups[name];G['asset']=asset
def root_mesh(name,vs,faces,mat):
    return mesh(name,vs,faces,mat)
def land_tile(k):
    # Solid chamfered terrain tile, all building land remains flat at z=0.
    outline=[(-65,-52.5),(65,-52.5),(70,-47.5),(70,47.5),(65,52.5),(-65,52.5),(-70,47.5),(-70,-47.5)]
    vs=[(x,y,0) for x,y in outline]+[(x*.985,y*.985,-2.4) for x,y in outline]
    faces=[tuple(range(8)),tuple(range(15,7,-1))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
    mesh('Terrain_tile',vs,faces,'ground')
    # Fine, broad color patches with no raised ground inside usable lots.
    for x,y,w,d in [(-54,-43,22,12),(53,44,24,12),(-53,43,25,12),(54,-43,22,12)]:
        box('Terrain_patch',(x,y,.006),(w,d,.01),'ground_light',0)
def water_district(k):
    if k=='ocean':
        box('Ocean_bed',(0,0,-2.1),(145,111,1.5),'edge',.2)
        box('Water_surface',(0,0,-1.26),(145,111,.10),'water',.3)
    # One connected concave deck avoids coplanar seams at wings/large lot.
    outline=[(-62,-37),(62,-37),(62,-8),(66.5,-8),(66.5,8),(62,8),(62,37),(10,37),(10,52),(-10,52),(-10,37),(-62,37),(-62,8),(-66.5,8),(-66.5,-8),(-62,-8)]
    N=len(outline)
    vs=[(x,y,0) for x,y in outline]+[(x,y,-1.6) for x,y in outline]
    faces=[tuple(range(N)),tuple(range(2*N-1,N-1,-1))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
    mesh('Settlement_platform',vs,faces,'ground')
    if k=='ocean':
        for x in [-65,65]:
            for y in [-30,30]:box('Mooring_pier',(x,y,-.25),(8,2,.5),'wood',.03)
        for y in [-39,39]:
            for x in [-48,-24,24,48]:
                beam('Seawall_edge',(x-8,y,-.22),(x+8,y,-.22),.18,'ivory')
        for x,y in [(-68,-40),(66,40),(-40,-49),(42,-47)]:
            cone('Navigation_buoy',(x,y,-.55),.65,.33,1.5,'amber')
            cyl('Buoy_light',(x,y,.32),.18,.24,'light')
        for x,y in [(-50,48),(48,49),(-66,12),(66,-15)]:
            orb('Sea_rock',(x,y,-.7),(3.3,2.3,1.6),'rock')
        for x,y in [(-40,-48),(-10,-47),(25,-48),(55,46)]:
            box('Water_glint',(x,y,-1.19),(5.0,.1,.015),'glass',0)
    else:
        for x in [-50,-10,30,50]:
            for y in [-27,27]:
                cyl('Platform_thruster',(x,y,-2.5),1.7,3.0,'dark',12)
                cyl('Thruster_ring',(x,y,-4.0),1.8,.45,'amber',12)
                cone('Thruster_glow',(x,y,-4.7),.4,1.5,1.0,'glass',12)
        for x in [-61,61]:
            for y in [-34,-17,17,34]:
                beam('Guardrail_post',(x,y,0),(x,y,1.0),.06,'ivory')
            for a,b in [(-34,-17),(17,34)]:beam('Safety_rail',(x,a,1),(x,b,1),.055,'accent')
        cloud=material('Gas_Cloud',(.58,.41,.28))
        for x,y,z in [(-45,35,-10),(45,-30,-11),(-48,-36,-13),(35,35,-12),(0,-44,-10)]:
            for dx,dy,s in [(-7,0,7),(0,3,9),(8,-2,7)]:orb('Atmosphere_cloud',(x+dx,y+dy,z),(s,s*.65,3.1),cloud,2)
def roads_and_pads(k,slots):
    choose_group('Roads')
    for y in [-19,0,19]:
        box('East_west_road',(0,y,.025),(124,4.8,.05),'road',.015)
        for yy in [y-2.6,y+2.6]:box('Road_curb',(0,yy,.055),(124,.22,.11),'pad',.015)
        for x in range(-58,61,5):
            if min(abs(x-v) for v in [-40,0,40])>3:box('Road_center_mark',(x,y,.057),(1.6,.10,.012),'accent',0)
    for x in [-40,0,40]:
        box('North_south_road',(x,0,.030),(3.8,72,.055),'road',.01)
        for xx in [x-2.1,x+2.1]:box('Road_curb',(xx,0,.06),(.22,72,.12),'pad',.01)
        for y in range(-33,36,5):
            if min(abs(y-v) for v in [-19,0,19])>3:box('Road_center_mark',(x,y,.068),(.1,1.5,.015),'accent',0)
    # Crosswalks at the central boulevard's three intersections.
    for x in [-40,0,40]:
        for offset in [-4,4]:
            for yy in [-1.5,-.9,-.3,.3,.9,1.5]:
                box('Pedestrian_crossing',(x+offset,yy,.064),(.65,.30,.014),'ivory',0)
    for s in slots:
        x,y,z=s['_blender'];w,d=s['footprint']
        box('Buildable_pad_'+s['id'],(x,y,.055),(w+.7,d+.7,.11),'pad',.025)
        for dx in [-w/2,w/2]:
            for dy in [-d/2,d/2]:
                box('Lot_corner',(x+dx,y+dy,.116),(.6,.12,.012),'accent',0)
                box('Lot_corner',(x+dx,y+dy,.116),(.12,.6,.012),'accent',0)
        if s['role']=='prop':continue
        target=35 if s['role']=='large' else (-19 if y<0 else 19)
        edge=y+(d/2+.35)*(1 if target>y else -1)
        length=abs(target-edge)
        box('Lot_access',(x,(edge+target)/2,.065),(2.3,length,.13),'pad',.015)
        if s['role']=='factory':
            for dx in [-5,5]:box('Factory_lot_marker',(x+dx,edge,.118),(.65,.15,.016),'amber',0)
def safe(x,y,r=1):
    for s in slots:
        sx,sy,_=s['_blender'];w,d=s['footprint']
        if abs(x-sx)<w/2+r+.5 and abs(y-sy)<d/2+r+.5:return False
    for roadY in [-19,0,19]:
        if abs(y-roadY)<3+r and abs(x)<63+r:return False
    for roadX in [-40,0,40]:
        if abs(x-roadX)<2.6+r and abs(y)<37+r:return False
    return True
def tree(x,y,h=4,palm=False):
    if palm:
        beam('Palm_trunk',(x,y,0),(x+.35,y,h*.8),.19,'wood')
        for i in range(6):
            a=i*math.tau/6;tip=(x+math.cos(a)*2.4,y+math.sin(a)*2.4,h*.70)
            mesh('Palm_frond',[(x+.35,y,h*.85),(tip[0]+math.sin(a)*.6,tip[1]-math.cos(a)*.6,tip[2]),(tip[0],tip[1],tip[2]-.3),(tip[0]-math.sin(a)*.6,tip[1]+math.cos(a)*.6,tip[2])],[(0,1,2,3)],'flora')
    else:
        cyl('Tree_trunk',(x,y,h*.25),.20,h*.50,'wood',7)
        orb('Tree_crown',(x,y,h*.70),(h*.30,h*.29,h*.40),'flora',2)
        orb('Tree_crown_light',(x-.4,y-.25,h*.79),(h*.23,h*.22,h*.26),'green',1)
def crystal(x,y,size=1,color='glass'):
    for dx,dy,h,r in [(-.65,.2,2,.38),(.25,0,3,.48),(.75,.35,1.4,.26)]:
        cone('Crystal',(x+dx*size,y+dy*size,h*size/2),r*size,0,h*size,color,6)
def cactus(x,y,h=3):
    cyl('Cactus_stem',(x,y,h/2),.26,h,'flora',7)
    for d,z in [(-.65,h*.55),(.65,h*.35)]:
        beam('Cactus_arm',(x,y,z),(x+d,y,z),.16,'flora')
        cyl('Cactus_tip',(x+d,y,z+.45),.16,.9,'flora',7)
def bench(x,y):
    box('Bench_seat',(x,y,.72),(2,.55,.15),'wood')
    box('Bench_back',(x,y+.22,1.05),(2,.12,.45),'teal')
    for xx in [x-.75,x+.75]:box('Bench_leg',(xx,y,.33),(.13,.4,.66),'dark')
def lamp(x,y):
    cyl('Streetlight_base',(x,y,.17),.25,.34,'dark',8)
    beam('Streetlight_post',(x,y,.3),(x,y,3.0),.065,'teal')
    beam('Streetlight_arm',(x,y,3),(x+.5,y,3),.05,'teal')
    box('Streetlight',(x+.50,y,2.94),(.48,.30,.12),'light',.015)
def deco(k):
    choose_group('Decoration')
    if k not in ['ocean','gasgiant']:
        candidates=[(-65,y) for y in [-40,-26,-9,12,30,44]]+[(65,y) for y in [-40,-25,-9,12,30,44]]+[(x,-45) for x in [-52,-32,-12,12,32,52]]+[(x,45) for x in [-53,-32,32,53]]
        for i,(x,y) in enumerate(candidates):
            x+=rng.uniform(-1.2,1.2);y+=rng.uniform(-1.2,1.2)
            if not safe(x,y,3.2):continue
            if k in ['agrar','jungle','resort','colony']:
                if k=='colony' and i%2:orb('Boulder',(x,y,.4),(1.8,1.4,1.1),'rock')
                else:tree(x,y,6.5 if k=='jungle' else (3 if k=='colony' else 4.8),k=='resort')
                if k=='jungle':
                    for dx,dy in [(-1.9,-.2),(1.8,.8)]:orb('Fern_bush',(x+dx,y+dy,.7),(1.1,.85,.85),'green')
            elif k=='desert':
                if i%3==0:cactus(x,y,3.2)
                else:orb('Sand_dune',(x,y,.10),(3.8,2.4,1.3),'ground_light',2)
            elif k=='ice':
                if i%2:crystal(x,y,.9)
                else:orb('Snow_drift',(x,y,.12),(3.4,2.3,1.4),'ivory',2)
            elif k in ['mining','volcanic']:
                orb('Basalt_boulder',(x,y,.55),(3.1,2.1,2.4),'rock',1)
                if k=='mining' and i%3==0:crystal(x-.4,y,.65,'glass')
            elif k=='urban':
                box('Park_planter',(x,y,.25),(4.6,3.4,.5),'teal')
                box('Park_grass',(x,y,.51),(4.3,3.1,.05),'flora',0);tree(x,y,3.7)
            elif k=='industrial':
                if i%3==0:
                    cyl('Utility_tank',(x,y,1.0),1.25,2,'concrete',12)
                    cyl('Utility_tank_band',(x,y,.8),1.28,.3,'amber',12)
                else:
                    for dx in [-.8,.8]:box('Cargo',(x+dx,y,.55),(1.25,1.4,1.1),'teal')
        # Four outer corner hills / industrial infrastructure.
        for x,y in [(-55,47),(55,47),(-55,-47),(55,-47)]:
            if not safe(x,y,4):continue
            if k in ['desert','mining','ice','jungle','volcanic','agrar']:
                orb('Rim_hill',(x,y,.6),(8,4,3.4 if k!='jungle' else 4.4),'ground_dark' if k not in ['ice','mining','volcanic'] else ('ivory' if k=='ice' else 'rock'),2)
        if k=='agrar':
            for x in [-45,-25,25,45]:
                if safe(x,-42,3):
                    box('Field_soil',(x,-42,.03),(6,3.5,.06),'earth',0)
                    for dx in [-2,-1,0,1,2]:box('Crop_row',(x+dx,-42,.30),(.38,3.1,.54),'crop',.07)
        if k=='resort':
            box('Beach',(0,-45,.01),(120,13,.02),'cream',0)
            box('Beach_water',(0,-50,.022),(122,3,.025),'water',0)
            for x in [-42,-22,22,42]:
                beam('Parasol_post',(x,-42,.0),(x,-42,2.3),.06,'wood')
                cone('Parasol',(x,-42,2.33),1.4,0,.5,'ivory',8)
                box('Sunbed',(x+1.8,-44,.4),(.65,1.9,.17),'teal')
        if k=='ice':
            for x,y in [(-25,-47),(25,-45),(-64,30),(64,-30)]:
                o=box('Ice_fissure',(x,y,.019),(8,.15,.02),'water',0);o.rotation_euler[2]=.25
        if k=='volcanic':
            for y in [-45,45]:
                for x in [-51,-34,34,51]:
                    o=box('Lava_channel',(x,y,.02),(13,1.0,.04),'water',0);o.rotation_euler[2]=.15 if x<0 else -.18
                    for dx in [-5,0,5]:orb('Lava_bank',(x+dx,y+1.0,.45),(1.3,.8,.75),'rock')
        if k=='colony':
            for x in [-22,22]:
                for dx in [-1.5,0,1.5]:
                    if safe(x+dx,-43,1):
                        beam('Solar_support',(x+dx,-43,0),(x+dx,-43,1.2),.07,'teal')
                        o=box('Survey_solar',(x+dx,-43,1.3),(1.2,2,.08),'solar');o.rotation_euler[0]=.25
        if k=='industrial':
            for y in [-43,43]:
                for x in [-50,-30,30,50]:
                    if safe(x,y,3):
                        beam('Utility_pipe',(x-5,y,1.1),(x+5,y,1.1),.20,'teal')
                        for xx in [x-3,x+3]:box('Pipe_support',(xx,y,.45),(.35,.6,.9),'dark')
    # Roadside furnishings are in the free strips between pads and road intersections.
    for x,y in [(-60,-19),(-20,-19),(20,-19),(60,-19),(-60,19),(-20,19),(20,19),(60,19)]:
        # offset sidewalks away from road, leaving at least 1m to lots.
        lamp(x,y+3.2)
    for x,y in [(-64,20),(64,-20)]:
        if k not in ['ocean','gasgiant'] and safe(x,y,1.3):bench(x,y)
def joined(group,k):
    bpy.ops.object.select_all(action='DESELECT')
    for o in group.objects:o.select_set(True)
    bpy.context.view_layer.objects.active=next(iter(group.objects));bpy.ops.object.join();o=bpy.context.object;o.name='planet_'+k+'__'+group.name.split('__')[-1]
    bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
    return o
def aim(o,t):o.rotation_euler=(Vector(t)-o.location).to_track_quat('-Z','Y').to_euler()
def stage(scene,title,k):
    c=bpy.data.collections.new('planet_'+k+'__Preview_Stage');scene.collection.children.link(c)
    def relink(o):
        for col in list(o.users_collection):col.objects.unlink(o)
        c.objects.link(o)
    bpy.ops.mesh.primitive_plane_add(size=800,location=(0,0,-20 if k=='gasgiant' else -3))
    o=bpy.context.object;relink(o);o.name='planet_'+k+'__Studio_Floor';o.data.materials.append(material('Studio_Ground',(.06,.09,.12)))
    d=bpy.data.cameras.new('Planet_Camera');cam=bpy.data.objects.new('planet_'+k+'__Camera',d);c.objects.link(cam)
    cam.location=(125,-170,142);aim(cam,(0,0,1));d.type='ORTHO';d.ortho_scale=199;scene.camera=cam
    for name,pos,power,col,size in [('Key',(-70,-95,160),260000,(1,.85,.68),85),('Fill',(90,-40,110),170000,(.6,.8,1),80),('Rim',(40,110,145),280000,(.69,.86,1),80)]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=col;d.shape='DISK';d.size=size
        o=bpy.data.objects.new('planet_'+k+'__'+name,d);c.objects.link(o);o.location=pos;aim(o,(0,0,0))
    w=bpy.data.worlds.new('Planet_Studio');w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(.12,.18,.24,1);w.node_tree.nodes['Background'].inputs[1].default_value=.45;scene.world=w
    text=bpy.data.curves.new('Planet_Title','FONT');text.body=title;text.size=5;text.align_x='CENTER'
    o=bpy.data.objects.new('planet_'+k+'__Preview_Title',text);c.objects.link(o);o.parent=cam;o.location=(0,-70,-1);text.materials.append(material('Preview_Text',(.76,.85,.9),0,1))
    scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
    scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
    return cam
def sample_buildings(scene,k,slots):
    c=bpy.data.collections.new('planet_'+k+'__Preview_Buildings');scene.collection.children.link(c)
    lookup={ 'farm':['grain','biomass','food','fertilizer','textiles','preserves'],'drill':['crude','gas','helium3','shipfuel','fuel','chemicals','acid'],'silo':['water','ice','coolant'],'mine':['ore','crystals','rareearth','silicate','sulfur','raremetals','ingots','cutters'],'tower':['tourists','workers']}
    models=['questhouse']+[next((a for a,goods in lookup.items() if good in goods),'hall') for good in SPECS[k]['produce']]+['store']*len(SPECS[k]['consume'])+['tavern','casino','school','smuggler']
    assignments=[(models[0],slots[0])]
    general=iter(s for s in slots if s['role']=='general')
    assignments.extend((model,next(general)) for model in models[1:])
    assignments.extend(('factory',s) for s in slots if s['role']=='factory')
    assignments.extend([('racetrack',next(s for s in slots if s['role']=='large')),('beggar',slots[-4]),('dog',slots[-1])])
    sources={};check=[]
    for a,s in assignments:
        if a not in sources:
            colname='Questhouse_Model' if a=='questhouse' else a+'_Model'
            col=bpy.data.collections.get(colname)
            src=next((o for o in col.objects if o.type=='MESH'),None) if col else None
            if src is None:
                with bpy.data.libraries.load(str(ROOT.parent/a/(a+'.blend')),link=False) as (data_from,data_to):data_to.objects=['Questhouse' if a=='questhouse' else a]
                src=data_to.objects[0]
            sources[a]=src
        src=sources[a]
        o=bpy.data.objects.new('planet_'+k+'__Sample_'+a+'_'+s['id'],src.data);c.objects.link(o);o.location=s['_blender'];o.rotation_euler=(0,0,s['rotation_y'])
        dims=src.dimensions;assert dims.x<=s['footprint'][0]+.01 and dims.y<=s['footprint'][1]+.01,(a,s['id'])
        check.append({'asset':a,'slot':s['id']})
    return c,check
def build(k,render=True):
    global groups,slots,rng
    out=ROOT/k;out.mkdir(parents=True,exist_ok=True)
    if (out/'ground.glb').exists() or (out/'ground.blend').exists():raise RuntimeError('Refusing overwrite: '+k)
    scene=bpy.data.scenes.new('planet_'+k+'_Asset');bpy.context.window.scene=scene;scene.unit_settings.system='METRIC'
    groups={}
    for name in ['Terrain','Roads','Decoration']:
        col=bpy.data.collections.new('planet_'+k+'__'+name);scene.collection.children.link(col);groups[name]=col
    G['M']=palette(k);slots=layout(k);rng=random.Random(14017+list(SPECS).index(k))
    choose_group('Terrain')
    if k in ['ocean','gasgiant']:water_district(k)
    else:land_tile(k)
    roads_and_pads(k,slots);deco(k)
    bpy.context.view_layer.update()
    # Validate above-ground decoration against every reserved lot.
    violations=[]
    for o in groups['Decoration'].objects:
        corners=[o.matrix_world@Vector(v) for v in o.bound_box]
        minx,maxx=min(v.x for v in corners),max(v.x for v in corners)
        miny,maxy=min(v.y for v in corners),max(v.y for v in corners)
        if max(v.z for v in corners)<=.12:continue
        for s in slots:
            x,y,_=s['_blender'];w,d=s['footprint']
            if minx<x+w/2 and maxx>x-w/2 and miny<y+d/2 and maxy>y-d/2:violations.append((o.name,s['id']))
    assert not violations,violations
    models=[joined(c,k) for c in groups.values()]
    main=bpy.data.collections.new('planet_'+k+'__Placement');scene.collection.children.link(main)
    root=bpy.data.objects.new('planet_'+k,None);main.objects.link(root)
    for o in models:o.parent=root
    for s in slots:
        o=bpy.data.objects.new(s['node'],None);main.objects.link(o);o.empty_display_type='PLAIN_AXES';o.empty_display_size=.7;o.location=s['_blender'];o.rotation_euler[2]=s['rotation_y'];o.parent=root
        o['slot_id']=s['id'];o['role']=s['role'];o['width']=s['footprint'][0];o['depth']=s['footprint'][1]
        if s['category']:o['category']=s['category']
    bpy.ops.object.select_all(action='DESELECT')
    for o in [root]+list(root.children):o.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(out/'ground.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
    b=(out/'ground.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];gl=json.loads(b[20:20+n])
    node_by_name={n['name']:n for n in gl['nodes']}
    assert len(gl['meshes'])==3 and not gl.get('images')
    for s in slots:
        n=node_by_name[s['node']]
        assert all(abs(v-w)<.0001 for v,w in zip(n.get('translation',[0,0,0]),s['position'])),s['id']
        assert n['extras']['slot_id']==s['id']
    clean=[{a:b for a,b in s.items() if not a.startswith('_')} for s in slots]
    lay={'planet_type':k,'units':'meters','coordinate_system':'glTF, +Y up','terrain_root':'planet_'+k,'regular_pad_count':24,'large_pad_count':1,'prop_point_count':4,'factory_capacity':SPECS[k]['factory_categories'],'slots':clean,'layout_id':'colony_grid_v1','ground_url':k+'/ground.glb'}
    (out/'layout.json').write_text(json.dumps(lay,ensure_ascii=False,indent=2),encoding='utf8')
    tris=sum(gl['accessors'][p['indices']]['count']//3 for m in gl['meshes'] for p in m['primitives'])
    meta={'planet_type':k,'label':SPECS[k]['label'],'triangles':tris,'materials':len(gl['materials']),'glb_bytes':len(b),'meshes':3,'placement_nodes':len(slots),'buildings_in_glb':False,'width_m':140,'depth_m':105,'slot_elevation_m':.12,'checks':['reserved lot clearance','exported anchors match layout.json','all materials embedded'],'layout': 'layout.json'}
    (out/'asset.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
    (out/'generate.py').write_text("import runpy\nfrom pathlib import Path\nns=runpy.run_path(str(Path(__file__).resolve().parents[1]/'generate_planets.py'))\nns['build']("+repr(k)+")\n",encoding='utf8')
    stage(scene,SPECS[k]['label'],k)
    samples,check=sample_buildings(scene,k,slots);samples.hide_render=True;samples.hide_viewport=True
    scene.render.filepath=str(out/'preview.png')
    bpy.data.libraries.write(str(out/'ground.blend'),{scene},fake_user=True)
    if render:
        bpy.ops.render.render(write_still=True)
        samples.hide_render=False;samples.hide_viewport=False
        scene.render.filepath=str(out/'preview-populated.png');bpy.ops.render.render(write_still=True)
        samples.hide_render=True;samples.hide_viewport=True;scene.render.filepath=str(out/'preview.png')
    (out/'sample-placements.json').write_text(json.dumps(check,indent=2),encoding='utf8')
    return meta
