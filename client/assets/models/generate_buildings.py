
import bpy, bmesh, math, json, struct, runpy
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/projects/SpaceTrader/client/assets/models')
SPECS=[
('farm','Agrarfarm',{'look':'farm'}),('drill','Bohranlage',{'look':'drill'}),
('silo','Tanklager',{'look':'silo'}),('mine','Bergwerk',{'look':'mine'}),
('tower','Wohngebäude',{'look':'tower'}),('store','Warenlager',{'look':'store'}),
('hall','Produktionshalle',{'look':'hall'}),('factory','Fabrik',{'kind':'factory'}),
('plot','Bauplatz',{'kind':'plot'}),('tavern','Taverne',{'kind':'fun','building':'tavern'}),
('casino','Kasino',{'kind':'fun','building':'casino'}),('fair','Jahrmarktbude',{'kind':'fun','building':'fair'}),
('racetrack','Rennbahn',{'kind':'fun','building':'racetrack'}),('stollen','Stollen',{'kind':'fun','building':'mine'}),
('smuggler','Schmugglerhöhle',{'kind':'smuggler'}),('school','Schule',{'kind':'school'}),
('beggar','Bettler',{'kind':'beggar'}),('dog','Hund',{'kind':'dog'})]
def mat(name,rgb,metal=0,rough=.65,emission=0):
    existing=bpy.data.materials.get('ST_'+name)
    if existing:return existing
    m=bpy.data.materials.new('ST_'+name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=emission
    return m
def palette():
    return {k:mat(k,*v) for k,v in {
    'cream':((.69,.63,.48),),'ivory':((.91,.86,.69),),'dark':((.055,.10,.13),.4),
    'teal':((.045,.31,.34),.25),'glass':((.12,.65,.72),.35,.25,.25),
    'amber':((.95,.39,.08),.15),'light':((1,.73,.30),0,.5,1.5),
    'concrete':((.24,.29,.29),),'solar':((.035,.14,.24),.45,.35),
    'green':((.19,.38,.18),),'crop':((.60,.72,.27),),'earth':((.28,.20,.13),),
    'purple':((.29,.13,.40),.2),'red':((.66,.20,.14),),'rock':((.31,.30,.28),),
    'wood':((.39,.24,.13),),'fur':((.49,.32,.19),),'skin':((.73,.48,.29),)
    }.items()}
def register(o,name,m):
    o.name=name
    for c in list(o.users_collection):c.objects.unlink(o)
    asset.objects.link(o)
    if m:o.data.materials.append(M[m] if isinstance(m,str) else m)
    return o
def box(name,loc,size,m='cream',bev=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=register(bpy.context.object,name,m);o.scale=size
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bev:
        mod=o.modifiers.new('Chamfers','BEVEL');mod.width=min(bev,min(size)*.3);mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def cyl(name,loc,r,depth,m='teal',n=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=depth,location=loc)
    return register(bpy.context.object,name,m)
def cone(name,loc,r1,r2,depth,m,n=12):
    bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r1,radius2=r2,depth=depth,location=loc)
    return register(bpy.context.object,name,m)
def orb(name,loc,size,m,sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc)
    o=register(bpy.context.object,name,m);o.scale=size
    return o
def beam(name,a,b,r=.055,m='teal'):
    a,b=Vector(a),Vector(b);o=cyl(name,(a+b)*.5,r,(b-a).length,m,8)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def mesh(name,verts,faces,m):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
    o=bpy.data.objects.new(name,d);asset.objects.link(o);d.materials.append(M[m]);return o
def label(string,loc,size=.4,m='ivory'):
    c=bpy.data.curves.new('Lettering','FONT');c.body=string;c.size=size;c.align_x='CENTER';c.align_y='CENTER';c.extrude=.002;c.resolution_u=1
    o=bpy.data.objects.new('Sign_letters',c);asset.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0);c.materials.append(M[m])
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
def sign(string,x,y,z,w=4,color='teal',size=.40):
    box('Sign_frame',(x,y,z),(w,.20,.65),'dark')
    box('Sign_face',(x,y-.115,z),(w-.18,.025,.46),color,.005)
    label(string,(x,y-.139,z),size)
def base(w=10,d=7.4):
    box('Foundation',(0,0,.16),(w,d,.32),'concrete',.10)
    box('Foundation_top',(0,0,.34),(w-.5,d-.5,.08),'dark')
def window(x,y,z,w=1.3,h=.85,lit='glass'):
    box('Window_frame',(x,y,z),(w+.16,.13,h+.16),'dark')
    box('Window',(x,y-.081,z),(w,.025,h),lit,.012)
    box('Window_sill',(x,y-.11,z-h/2-.13),(w+.22,.24,.10),'teal')
def door(x,y,z=.38,w=1.4,h=2,m='teal'):
    box('Door_frame',(x,y,z+h/2),(w+.24,.20,h+.12),'amber')
    box('Door',(x,y-.12,z+h/2),(w,.06,h),m)
    box('Door_seam',(x,y-.16,z+h/2),(.035,.02,h-.1),'dark',0)
    box('Door_light',(x,y-.17,z+h+.015),(w*.7,.025,.045),'light',.005)
def roof(x,y,z,w,d,rise=1):
    mesh('Pitched_roof',[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x,y-d/2,z+rise),(x-w/2,y+d/2,z),(x+w/2,y+d/2,z),(x,y+d/2,z+rise)],[(0,1,2),(5,4,3),(0,3,4,1),(0,2,5,3),(2,1,4,5)],'dark')
    box('Roof_ridge',(x,y,z+rise),(.12,d+.08,.10),'teal',.015)
def crate(x,y,z=.38,size=.8):
    box('Cargo_case',(x,y,z+size/2),(size,size,size),'amber')
    for xx in [x-size*.28,x+size*.28]:
        box('Case_band',(xx,y,z+size/2),(.07,size+.04,size+.04),'dark',.008)
def pipe(a,b,r=.12):beam('Pipe',a,b,r,'teal')
def wheel(loc,r,m='amber',rot=(math.pi/2,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=4,location=loc,major_radius=r,minor_radius=.065,rotation=rot)
    return register(bpy.context.object,'Wheel',m)
def rocks(center,scale=1):
    x,y,z=center
    for dx,dy,dz,s in [(-1,.3,.55,.9),(.3,.5,.75,1.2),(1,0,.40,.75),(-.2,-.5,.38,.8)]:
        orb('Rock',(x+dx*scale,y+dy*scale,z+dz*scale),(s*scale,s*.8*scale,s*.75*scale),'rock')
def tunnel(x,y,width=2.7,height=2.6,depth=1.7):
    # Freestanding faceted arch with a real open entrance.
    vs=[];N=8;r=width/2
    for yy in [y-depth/2,y+depth/2]:
        for rr in [r,r+.50]:
            for i in range(N+1):
                a=math.pi*i/N;vs.append((x+math.cos(a)*rr,yy,.38+height-r+math.sin(a)*rr))
    fs=[];q=N+1
    for i in range(N):
        fs.extend([(i,i+1,q+i+1,q+i),(2*q+i,3*q+i,3*q+i+1,2*q+i+1),(q+i,q+i+1,3*q+i+1,3*q+i),(i,2*q+i,2*q+i+1,i+1)])
    fs.extend([(0,q,3*q,2*q),(N,2*q+N,3*q+N,q+N)])
    mesh('Tunnel_arch',vs,fs,'rock')
    for xx in [x-r-.25,x+r+.25]:
        box('Tunnel_foot',(xx,y,.38+(height-r)/2),(.5,depth,height-r),'rock')
    box('Tunnel_dark_back',(x,y+depth/2+.025,.38+height/2),(width+.2,.08,height+.2),'dark',0)
def hall_shell(factory=False):
    base(11.5 if factory else 10,8)
    box('Hall_body',(-.4,.45,1.94),(7.8,5.3,3.12),'cream',.10)
    box('Hall_band',(-.4,.45,.63),(7.94,5.4,.45),'teal')
    for j in range(3):
        x=-4.35+j*2.63
        mesh('Sawtooth_roof',[(x,-2.4,3.5),(x,3.3,3.5),(x,3.3,4.5),(x,-2.4,4.5),(x+2.63,-2.4,3.5),(x+2.63,3.3,3.5)],[(0,1,2,3),(3,2,5,4),(0,4,5,1),(0,3,4),(1,5,2)],'dark')
        box('Roof_skylight',(x-.025,.43,4.04),(.04,4.75,.58),'glass',.005)
    door(-2.85,-2.25,w=1.05)
    for x in [-.8,1.15]:window(x,-2.25,2.20,1.5)
    sign('FABRIK' if factory else 'PRODUKTION',-.4,-2.31,3.05,5.2,size=.38)
    for x in [-2.4,.2,2.8]:window(x,3.15,2.25,1.5)
def build_geometry(k):
    if k=='farm':
        base(11,8);box('Farm_house',(-3,.7,1.57),(3.4,4.8,2.38),'cream',.08)
        roof(-3,.7,2.8,3.8,5.2,.8);door(-3,-1.78,w=1.25)
        window(-3,3.14,1.9,1.6);sign('AGRAR',-3,-1.89,2.37,2.7,size=.36)
        # Two opaque cyan greenhouse modules with ribbed barrel vaults.
        for x in [.4,3.4]:
            box('Greenhouse_plinth',(x,.9,.6),(2.6,4.8,.44),'teal')
            vs=[];N=8
            for y in [-1.5,3.3]:
                for i in range(N+1):
                    a=math.pi*i/N;vs.append((x+1.25*math.cos(a),y,1.0+1.6*math.sin(a)))
            fs=[(i,i+1,N+2+i,N+1+i) for i in range(N)]
            fs.extend([tuple(range(N,-1,-1)),tuple(range(N+1,2*(N+1)))])
            mesh('Greenhouse_vault',vs,fs,'glass')
            for y in [-1.52,.1,1.7,3.32]:
                for i in range(N):
                    a,b=math.pi*i/N,math.pi*(i+1)/N
                    beam('Vault_rib',(x+1.28*math.cos(a),y,1+1.63*math.sin(a)),(x+1.28*math.cos(b),y,1+1.63*math.sin(b)),.035,'ivory')
        for x in [-.5,1.65,3.8]:
            box('Raised_crop_bed',(x,-2.5,.53),(1.85,1.5,.3),'earth')
            for dx in [-.56,0,.56]:
                for y in [-2.9,-2.5,-2.1]:orb('Crop',(x+dx,y,.86),(.22,.22,.32),'crop')
        crate(-4.2,-2.8,size=.65)
    elif k=='drill':
        base(10,8);cx=-2.3
        for x in [cx-1.4,cx+1.4]:
            for y in [-1.3,1.3]:
                box('Rig_foot',(x,y,.55),(.7,.7,.35),'amber')
                beam('Derrick_leg',(x,y,.65),(cx+(x-cx)*.22,y*.22,6.7),.11,'dark')
        for z in [1.4,2.6,3.8,5,6.2]:
            t=(6.7-z)/6;h=1.4*t
            for y in [-h,h]:beam('Rig_cross',(cx-h,y,z),(cx+h,y,z),.07,'teal')
            for x in [cx-h,cx+h]:beam('Rig_cross',(x,-h,z),(x,h,z),.07,'teal')
        for z in [1.4,2.6,3.8,5]:
            h=1.4*(6.7-z)/6;h2=1.4*(6.7-z-1.2)/6
            beam('Diagonal_brace',(cx-h,-h,z),(cx+h2,-h2,z+1.2),.045,'amber')
            beam('Diagonal_brace',(cx+h,-h,z),(cx-h2,-h2,z+1.2),.045,'amber')
        cyl('Drill_shaft',(cx,0,3.2),.13,5.5,'ivory')
        box('Top_drive',(cx,0,6.65),(1.1,.9,.45),'amber')
        cyl('Tank',(2.1,1,1.7),1.2,2.4,'cream')
        cone('Tank_cap',(2.1,1,3.06),1.26,.55,.32,'teal')
        cyl('Tank_band',(2.1,1,1.3),1.22,.32,'teal')
        box('Control_cabin',(2.2,-2,1.24),(3.7,1.55,1.72),'teal')
        box('Cabin_roof',(2.2,-2,2.15),(3.95,1.8,.18),'dark')
        window(1.5,-2.81,1.51,1.4,.6);door(3,-2.82,w=.75,h=1.3)
        pipe((cx+.7,0,.7),(1,0,.7));pipe((1,0,.7),(1,1,1.4))
        sign('FÖRDERUNG',2.2,-2.86,2.5,3.8,size=.32)
    elif k=='silo':
        base(10,8)
        for x,h in [(-3,3.8),(0,5),(3,3.8)]:
            cyl('Silo',(x,.6,.5+h/2),1.18,h,'cream',16)
            cone('Silo_cap',(x,.6,.5+h+.21),1.22,.25,.42,'teal',16)
            for z in [1.1,h-.1]:cyl('Tank_band',(x,.6,z),1.21,.22,'teal',16)
            box('Level_display',(x,-.602,2.05),(.3,.06,1.4),'dark')
            box('Level_indicator',(x,-.64,1.94),(.14,.025,.95),'glass')
            pipe((x,-.6,.8),(x,-2.1,.8));pipe((x,-2.1,.8),(x,-2.1,.46))
        pipe((-3,-2.1,.7),(3,-2.1,.7))
        box('Pump_station',(3.5,-2.75,.9),(1.9,1.1,1.04),'teal')
        sign('TANKLAGER',0,-2.57,1.66,3.5,size=.34)
        for x in [-1.32,1.32]:
            beam('Ladder_side',(x,.6,.65),(x,.6,4.3),.045,'dark')
        for z in [1,1.5,2,2.5,3,3.5,4]:beam('Ladder_rung',(-1.32,.6,z),(1.32,.6,z),.035,'ivory')
    elif k=='mine':
        base(11,8);tunnel(1.65,1.15,2.6,2.8,2)
        rocks((2.2,1.6,.35),1.25)
        # Portal remains in front of rock cluster.
        for x in [.15,3.15]:box('Portal_pillar',(x,-.01,1.7),(.32,.3,2.7),'teal')
        box('Portal_lintel',(1.65,-.02,3.0),(3.35,.4,.3),'amber')
        for x in [-3.8,-1.4]:
            for y in [-.1,2.1]:beam('Headframe_leg',(x,y,.45),((x+(-2.6))/2,y*.5+.5,5.5),.12,'dark')
        box('Headframe_deck',(-2.6,1,4.3),(2.7,2.7,.22),'teal')
        wheel((-2.6,-.2,5.2),.8)
        for a in range(6):
            ang=a*math.pi/3;beam('Wheel_spoke',(-2.6,-.2,5.2),(-2.6+math.cos(ang)*.8,-.2,5.2+math.sin(ang)*.8),.04,'dark')
        beam('Hoist_cable',(-2.6,-.25,5.2),(-2.6,-.25,.5),.022,'ivory')
        for x in [.95,2.35]:box('Ore_rail',(x,-1.75,.43),(.08,4,.12),'dark',.005)
        for y in [-3,-2,-1,0]:box('Rail_sleeper',(1.65,y,.42),(1.9,.2,.10),'wood')
        box('Ore_cart',(1.65,-1.6,1.01),(1.25,1.35,.75),'amber')
        for x in [1.02,2.28]:
            for y in [-2,-1.2]:o=cyl('Cart_wheel',(x,y,.60),.24,.14,'dark');o.rotation_euler[1]=math.pi/2
        rocks((-4,-2.3,.38),.65);sign('BERGWERK',1.65,-.31,3.38,3.4,size=.35)
    elif k=='tower':
        base(10,8)
        for x,h in [(-2.3,7.8),(2.15,5.7)]:
            box('Residential_tower',(x,.65,.38+h/2),(3.35,4.3,h),'cream',.13)
            box('Tower_roof',(x,.65,.38+h+.12),(3.62,4.57,.24),'dark')
            for z in [1.5+i*1.3 for i in range(int(h/1.3))]:
                box('Floor_band',(x,.65,z-.58),(3.48,4.42,.14),'teal')
                for dx in [-.87,.87]:
                    window(x+dx,-1.56,z,.62,.73)
                    window(x+dx,2.86,z,.62,.73)
                for y in [-.45,1.5]:
                    box('Side_window_frame',(x+1.73,y,z),(.10,1.0,.85),'dark')
                    box('Side_window',(x+1.792,y,z),(.025,.8,.65),'glass')
            door(x,-1.61,w=1.2)
            box('Rooftop_unit',(x,.85,.38+h+.6),(1.8,1.5,.8),'teal')
        box('Skybridge',(-.15,.85,3.33),(1.3,1.65,.85),'dark')
        box('Bridge_window',(-.15,-.001,3.42),(1.25,.03,.5),'glass')
        sign('HABITAT',0,-2.5,1.02,2.65,size=.30)
        for x in [-4,4]:cyl('Planter',(x,-2.4,.70),.4,.6,'teal');orb('Shrub',(x,-2.4,1.2),(.55,.55,.65),'green')
    elif k=='store':
        base(11,8);box('Warehouse',(0,.6,1.88),(8,5.6,3),'cream',.10)
        # Barrel roof with arch ends.
        vs=[];N=10
        for y in [-2.45,3.65]:
            for i in range(N+1):
                a=math.pi*i/N;vs.append((4.3*math.cos(a),y,3.38+1.35*math.sin(a)))
        fs=[(i,i+1,N+2+i,N+1+i) for i in range(N)]
        fs.extend([tuple(range(N,-1,-1)),tuple(range(N+1,2*N+2))]);mesh('Barrel_roof',vs,fs,'dark')
        box('Cargo_gate',(0,-2.25,1.72),(3.5,.16,2.65),'teal')
        for z in [.7,1.05,1.4,1.75,2.1,2.45,2.8]:box('Shutter_rib',(0,-2.35,z),(3.4,.05,.055),'concrete',.004)
        for x in [-2.05,2.05]:box('Safety_bollard',(x,-2.65,.8),(.20,.2,.85),'amber')
        box('Loading_apron',(0,-2.9,.47),(4.3,1.6,.20),'concrete')
        sign('LAGER',0,-2.40,3.16,3.7,size=.42)
        door(-3,-2.24,w=.75,h=1.6)
        for x,y,s in [(3.1,-2.7,.9),(4.2,-2.3,.8),(3.5,-1.4,.7)]:crate(x,y,size=s)
        for x in [-2.4,0,2.4]:window(x,3.45,2.5,1.6,.55)
    elif k in ['hall','factory']:
        hall_shell(k=='factory')
        if k=='factory':
            for x,y,h in [(4.2,1.55,5.3),(2.9,2,6)]:
                cyl('Smokestack',(x,y,.38+h/2),.4,h,'concrete')
                cyl('Stack_band',(x,y,h-.3),.43,.35,'amber')
                cyl('Stack_mouth',(x,y,h+.39),.32,.02,'dark')
            box('Process_unit',(4.1,-.95,1.35),(1.8,2.6,1.9),'teal')
            pipe((4.1,-.95,2.3),(4.1,-.95,3.0));pipe((4.1,-.95,3),(2.4,-.95,3))
            cyl('Reactor',(4.1,-2.7,1.35),.6,1.7,'amber')
            crate(-4.65,-2.8,size=.8)
        else:
            box('Side_machine',(3.8,.45,1.39),(1.35,2.4,2),'teal')
            for z in [.85,1.13,1.41,1.69,1.97]:box('Vent',(4.50,.45,z),(.05,1.9,.09),'dark',.005)
            crate(-3.8,-2.9,size=.75)
    elif k=='plot':
        base(10,8)
        for x in [-3.7,3.7]:
            for y in [-2.6,2.6]:cone('Safety_cone',(x,y,.85),.3,.08,.95,'amber',8);cyl('Cone_band',(x,y,.8),.22,.14,'ivory',8)
        for y in [-2.7,2.7]:
            for x in [-2.4,2.4]:
                for xx in [x-.8,x+.8]:box('Barrier_foot',(xx,y,.55),(.65,.65,.34),'dark');beam('Barrier_leg',(xx,y,.6),(xx,y,1.45),.06)
                box('Barrier_board',(x,y,1.3),(2.3,.16,.40),'amber')
                for dx in [-.8,0,.8]:
                    o=box('Barrier_stripe',(x+dx,y-.091,1.3),(.20,.02,.40),'ivory',0);o.rotation_euler[1]=-.35
        box('Blueprint_slab',(0,.25,.40),(5.1,3.7,.045),'teal',0)
        for x in [-1.8,0,1.8]:box('Layout_line',(x,.25,.428),(.035,3.35,.008),'glass',0)
        for y in [-1.25,.25,1.75]:box('Layout_line',(0,y,.428),(4.7,.035,.008),'glass',0)
        beam('Sign_post',(0,2.7,.4),(0,2.7,2.5),.09)
        sign('FREI',0,2.7,2.3,2.2,size=.50)
        for x in [-2,-.8]:box('Building_materials',(x,1.9,.64),(.9,.8,.5),'cream')
    elif k=='tavern':
        base(11,8);box('Tavern_main',(-.8,.6,1.94),(6.9,4.8,3.12),'cream',.10);roof(-.8,.6,3.5,7.4,5.3,1)
        box('Tavern_band',(-.8,.6,.8),(7.02,4.9,.6),'teal')
        door(-.8,-1.85,w=1.4)
        for x in [-3.1,1.45]:window(x,-1.85,2.05,1.4,.85,'light')
        sign('TAVERNE',-.8,-1.99,3.10,5.3,size=.40)
        box('Patio_awning',(-.8,-2.75,2.87),(7.3,1.8,.14),'teal')
        for x in [-4.1,2.5]:beam('Awning_post',(x,-3.4,.4),(x,-3.4,2.85),.07)
        for x in [-2.9,1.2,4]:
            y=-2.45 if x<3 else .3
            cyl('Cafe_table',(x,y,1.10),.57,.14,'wood');cyl('Table_leg',(x,y,.75),.10,.65,'dark')
            for dy in [-.68,.68]:
                box('Cafe_stool',(x,y+dy,.72),(.5,.45,.13),'amber')
                for dx in [-.16,.16]:beam('Stool_leg',(x+dx,y+dy,.4),(x+dx,y+dy,.66),.04,'dark')
        beam('Mug_sign_bracket',(2.6,-.9,3.65),(3.5,-.9,3.65),.06,'dark')
        cyl('Mug_emblem',(3.35,-.9,3.26),.25,.47,'amber')
        wheel((3.65,-.9,3.27),.15,'amber')
    elif k=='casino':
        base(11,8);box('Casino_hull',(-.2,.65,2.06),(8.4,4.8,3.36),'cream',.12)
        box('Casino_crown',(-.2,.65,3.85),(8.9,5.3,.35),'purple')
        box('Casino_upper_band',(-.2,-1.80,3.02),(8.5,.18,.55),'purple')
        door(-.2,-1.84,w=2.1,h=2.5,m='purple')
        for x in [-3,2.6]:window(x,-1.81,1.98,1.45,1.4)
        sign('CASINO',-.2,-1.97,3.14,5.5,'purple',.49)
        for x in [-4,-3.25,-2.5,-1.75,-1,-.25,.5,1.25,2,2.75,3.5]:
            orb('Marquee_bulb',(x,-2.07,3.61),(.085,.085,.085),'light')
        box('Entry_canopy',(-.2,-2.75,2.89),(3.3,1.9,.18),'purple')
        for x in [-1.72,1.32]:beam('Entry_pillar',(x,-3.4,.4),(x,-3.4,2.88),.09,'ivory')
        cyl('Casino_pylon',(4.2,.5,2.8),.43,4.8,'purple',8)
        d=box('Casino_diamond',(4.2,.5,5.1),(1.1,.35,1.1),'amber');d.rotation_euler[1]=math.pi/4
        for x in [-3.2,-2.4]:
            cyl('Chip_stack',(x,-2.75,.62),.28,.48,'purple')
            for z in [.45,.62,.79]:cyl('Chip_stripe',(x,-2.75,z),.287,.06,'ivory')
        for x in [-2.5,0,2.5]:window(x,3.1,2.2,1.5,1.0)
    elif k=='fair':
        base(9,7)
        box('Stall_body',(0,.55,1.20),(6,3.7,1.65),'cream')
        box('Counter',(0,-1.45,1.67),(6.1,.8,.18),'wood')
        for x in [-2.9,2.9]:beam('Pavilion_post',(x,-1.35,1.65),(x,-1.35,3.3),.10,'teal')
        # Alternating striped pyramid pavilion.
        N=12;vs=[(0,.55,4.4)]+[(3.6*math.cos(i*2*math.pi/N),.55+2.8*math.sin(i*2*math.pi/N),3.10) for i in range(N)]
        for i in range(N):mesh('Striped_canopy',[vs[0],vs[i+1],vs[(i+1)%N+1]],[(0,1,2)],'amber' if i%2 else 'ivory')
        cyl('Flag_pole',(0,.55,4.75),.04,.7,'teal');box('Festival_flag',(.35,.55,4.98),(.65,.06,.35),'amber',0)
        box('Backboard',(0,1.1,2.30),(5.5,.15,1.5),'teal')
        for x in [-1.6,0,1.6]:
            for dx,z in [(-.25,1.9),(.25,1.9),(0,2.3)]:cyl('Game_can',(x+dx,.93,z),.16,.35,'amber')
        sign('JAHRMARKT',0,-1.61,1.25,4.7,size=.39)
        for x in [-2.5,2.5]:crate(x,-2.25,size=.7)
    elif k=='racetrack':
        base(16,11)
        # Continuous oval track ring, with segmented markings and double rail.
        N=48;vs=[]
        for a in range(N):
            t=a*2*math.pi/N
            for rx,ry in [(6.4,3.45),(4.75,1.95)]:vs.append((rx*math.cos(t),ry*math.sin(t)-.6,.40))
        mesh('Oval_track',vs,[(2*i,2*((i+1)%N),2*((i+1)%N)+1,2*i+1) for i in range(N)],'earth')
        for rx,ry in [(6.65,3.7),(4.5,1.72)]:
            for i in range(N):
                a=i*2*math.pi/N;b=(i+1)*2*math.pi/N
                beam('Track_rail',(rx*math.cos(a),ry*math.sin(a)-.6,.87),(rx*math.cos(b),ry*math.sin(b)-.6,.87),.045,'ivory')
                if i%4==0:beam('Rail_post',(rx*math.cos(a),ry*math.sin(a)-.6,.4),(rx*math.cos(a),ry*math.sin(a)-.6,.91),.045,'teal')
        for i in range(24):
            a=i*2*math.pi/24
            o=box('Track_marker',(5.6*math.cos(a),2.68*math.sin(a)-.6,.412),(.28,.06,.02),'ivory',0);o.rotation_euler[2]=a+math.pi/2
        for i in range(3):
            box('Grandstand_step',(0,3.3+i*.52,.65+i*.4),(7.4,.8,.5+i*.65),'concrete')
            box('Grandstand_seat',(0,3.3+i*.52,.96+i*.725),(6.8,.32,.12),'teal')
        for x in [-3.7,3.7]:beam('Grandstand_post',(x,4.4,.4),(x,4.4,4.2),.09)
        box('Grandstand_roof',(0,4,4.15),(8.1,2.1,.15),'dark')
        sign('RENNBAHN',0,3.1,3.8,5.2,size=.44)
        # Finish gate on the front straight.
        for x in [-1.45,1.45]:beam('Finish_post',(x,-3.35,.4),(x,-3.35,2.55),.08,'teal')
        box('Finish_bar',(0,-3.35,2.5),(3.2,.16,.45),'ivory')
        for x in [-1.2,-.6,0,.6,1.2]:box('Finish_check',(x,-3.445,2.5),(.30,.02,.20),'dark',0)
        for x,m in [(-4,'wood'),(0,'cream'),(4,'dark')]:
            y=-2.7 if abs(x)<1 else -.8
            orb('Horse_body',(x,y,1.16),(.70,.30,.40),m)
            beam('Horse_neck',(x+.4,y,1.30),(x+.63,y,1.77),.17,m)
            orb('Horse_head',(x+.74,y,1.77),(.30,.16,.17),m)
            for dx in [-.42,.42]:
                for dy in [-.18,.18]:beam('Horse_leg',(x+dx,y+dy,.52),(x+dx,y+dy,1.1),.055,m)
            beam('Horse_tail',(x-.60,y,1.3),(x-.9,y,1.06),.055,m)
    elif k in ['stollen','smuggler']:
        base(10,8);tunnel(0,.15,3,2.85,2.4)
        # Faceted shell piles beside and behind the open arch, not in its mouth.
        for x,y,s in [(-2.4,.75,1.1),(2.4,.75,1.2),(-1.3,2.4,1.0),(1.2,2.4,1.1)]:rocks((x,y,.38),s)
        if k=='stollen':
            for x in [-1.55,1.55]:box('Timber_support',(x,-1.18,1.77),(.25,.30,2.75),'wood')
            box('Timber_lintel',(0,-1.2,3.05),(3.5,.38,.25),'wood')
            sign('STOLLEN',0,-1.39,3.38,3.2,size=.34)
            for x in [-.55,.55]:box('Tunnel_rail',(x,-2,.44),(.07,3.8,.09),'dark',.005)
            for y in [-3,-2.3,-1.6,-.9]:box('Rail_sleeper',(0,y,.42),(1.6,.16,.08),'wood')
            box('Mine_cart',(0,-2,1.04),(1.0,1.3,.65),'teal')
            for x in [-.56,.56]:
                for y in [-2.4,-1.6]:o=cyl('Cart_wheel',(x,y,.62),.22,.13,'dark');o.rotation_euler[1]=math.pi/2
            for x,z in [(-3,.9),(-2.65,1.2),(-3.35,.7)]:cone('Crystal',(x,-2,z),.22,0,.85,'glass',6)
        else:
            box('Hideout_door',(0,-1.13,1.53),(2.4,.13,2.30),'dark')
            for z in [.7,1.1,1.5,1.9,2.3]:box('Shutter_slat',(0,-1.21,z),(2.32,.05,.065),'teal',.004)
            box('Secret_panel',(1.36,-1.25,1.5),(.27,.14,.65),'teal')
            box('Secret_light',(1.36,-1.34,1.64),(.12,.03,.10),'amber')
            for x,y,s in [(-2.6,-2.2,.8),(-3.4,-1.6,.7),(2.6,-2,.65)]:crate(x,y,size=s)
            box('Covered_cargo',(-3,-2.2,1.43),(1.4,1.15,.30),'teal')
        for x in [-1.75,1.75]:
            beam('Lamp_bracket',(x,-1.1,2.4),(x,-1.45,2.4),.035,'dark')
            cyl('Tunnel_lamp',(x,-1.45,2.31),.13,.23,'light')
    elif k=='school':
        base(11,8);box('School_hull',(-.5,.55,1.98),(8,4.8,3.2),'cream',.11)
        roof(-.5,.55,3.6,8.5,5.3,.9)
        for x in [-3.5,-1.8,1.0,2.7]:window(x,-1.9,2.25,1.1,.95)
        door(-.4,-1.95,w=1.45)
        box('School_canopy',(-.4,-2.63,2.95),(2.4,1.45,.16),'teal')
        sign('SCHULE',-.4,-2.0,3.14,3.8,size=.41)
        box('Clock_tower',(-3.4,1.45,4.12),(1.25,1.4,2.3),'teal')
        roof(-3.4,1.45,5.30,1.55,1.7,.65)
        o=cyl('Clock_face',(-3.4,.71,4.65),.42,.07,'ivory',16);o.rotation_euler[0]=math.pi/2
        beam('Clock_hand',(-3.4,.665,4.65),(-3.4,.665,4.95),.026,'dark')
        beam('Clock_hand',(-3.4,.661,4.65),(-3.14,.661,4.54),.026,'dark')
        for x in [-3,2.8]:
            box('Yard_bench',(x,-2.85,.86),(1.6,.5,.15),'wood')
            for xx in [x-.6,x+.6]:box('Bench_support',(xx,-2.85,.61),(.13,.4,.5),'teal')
        # Open book emblem on independent front kiosk.
        beam('Book_sign_post',(4,-2,.4),(4,-2,2.4),.09)
        for x,angle in [(3.73,-.18),(4.27,.18)]:
            o=box('Book_emblem',(x,-2,2.41),(.51,.1,.65),'ivory');o.rotation_euler[1]=angle
        box('Book_spine',(4,-2.08,2.42),(.055,.08,.70),'amber')
        for x in [-2.7,0,2.7]:window(x,3.0,2.2,1.5,.85)
    elif k=='beggar':
        base(3.2,2.8)
        box('Resting_mat',(-.2,0,.40),(1.8,1.8,.07),'wood',.01)
        orb('Seated_coat',(-.3,.25,.99),(.45,.38,.64),'teal')
        orb('Head',(-.3,.13,1.83),(.25,.24,.31),'skin',2)
        cone('Hat_crown',(-.3,.13,2.11),.27,.19,.22,'dark',8)
        cyl('Hat_brim',(-.3,.13,2.01),.34,.045,'dark',12)
        for x in [-.55,-.08]:
            beam('Bent_thigh',(x,.08,.76),(x,-.6,.60),.15,'dark')
            beam('Lower_leg',(x,-.6,.60),(x,-.85,.43),.13,'dark')
            box('Boot',(x,-.97,.48),(.27,.42,.18),'wood')
        for x in [-.69,.09]:
            beam('Coat_arm',(x,.12,1.34),(x,-.35,.98),.13,'teal')
            orb('Hand',(x,-.4,.92),(.11,.11,.13),'skin')
        cyl('Bowl',(.70,-.70,.48),.29,.17,'concrete')
        cyl('Bowl_inside',(.70,-.70,.57),.23,.012,'dark')
        for x,y in [(.65,-.66),(.8,-.78)]:cyl('Coin',(x,y,.583),.045,.015,'amber',8)
        orb('Bedroll',(-.9,.8,.65),(.3,.48,.28),'cream')
    elif k=='dog':
        # A static low-poly colony companion, realistic footprint (no building plinth).
        orb('Dog_body',(0,.07,.71),(.63,.26,.33),'fur',2)
        orb('Dog_chest',(.40,.07,.79),(.28,.26,.4),'fur',1)
        orb('Dog_head',(.63,.03,1.11),(.30,.23,.28),'fur',2)
        orb('Dog_muzzle',(.88,-.005,1.04),(.23,.14,.13),'cream')
        orb('Nose',(1.055,-.005,1.065),(.065,.11,.065),'dark')
        for y in [-.115,.175]:
            orb('Dog_eye',(.785,y,1.19),(.040,.035,.04),'dark')
            cone('Dog_ear',(.57,y,1.40),.13,0,.32,'wood',4)
        for x in [-.43,.43]:
            for y in [-.11,.25]:
                beam('Dog_leg',(x,y,.15),(x,y,.64),.065,'fur')
                box('Dog_paw',(x+.045,y,.075),(.23,.15,.15),'wood')
        beam('Dog_tail',(-.49,.10,.84),(-.87,.10,1.17),.07,'fur')
        beam('Dog_tail_tip',(-.87,.10,1.17),(-1.0,.10,1.34),.055,'cream')
        o=cyl('Dog_collar',(.42,.07,.98),.265,.11,'teal');o.rotation_euler[1]=math.pi/2
        orb('Collar_tag',(.53,-.19,.87),(.06,.026,.08),'amber')
    else:raise ValueError(k)
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
def stage_scene(scene,title,model):
    stage=bpy.data.collections.new('Preview_Stage');scene.collection.children.link(stage)
    def link(o):
        for c in list(o.users_collection):c.objects.unlink(o)
        stage.objects.link(o)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025));o=bpy.context.object;o.name='Preview_Ground';link(o);o.data.materials.append(mat('Preview_Ground',(.075,.11,.135)))
    dim=model.dimensions;scale=max(dim.x*1.65,dim.y*2,dim.z*2.1,4)
    target=Vector((0,0,dim.z*.40))
    d=bpy.data.cameras.new('Preview_Camera');cam=bpy.data.objects.new('Preview_Camera',d);stage.objects.link(cam)
    cam.location=target+Vector((12,-17,11)).normalized()*scale*1.5;aim(cam,target)
    d.type='ORTHO';d.ortho_scale=scale;scene.camera=cam
    # Camera-facing footer used in the contact sheet and individual renders.
    c=bpy.data.curves.new('Preview_title','FONT');c.body=title;c.align_x='CENTER';c.size=scale*.031
    o=bpy.data.objects.new('Preview_title',c);stage.objects.link(o);o.parent=cam;o.location=(0,-scale*600/720/2+scale*.028,-1);c.materials.append(mat('Preview_text',(.78,.87,.90),0,1,1))
    for name,pos,power,col,size in [('Warm_key',(-5,-9,12),1900,(1,.83,.64),8),('Cool_fill',(8,-4,7),1150,(.55,.8,1),7),('Rim_light',(2,7,10),2200,(.66,.84,1),6)]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=col;d.shape='DISK';d.size=size
        o=bpy.data.objects.new(name,d);stage.objects.link(o);o.location=pos;aim(o,(0,0,1.7))
    w=bpy.data.worlds.new('Studio_World');w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(.13,.18,.24,1);w.node_tree.nodes['Background'].inputs[1].default_value=.45;scene.world=w
    scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
    scene.render.resolution_x=720;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
    return cam
def build(k,render=True):
    global asset,M
    spec=next(s for s in SPECS if s[0]==k);title=spec[1];out=ROOT/k;out.mkdir(parents=True,exist_ok=True)
    if (out/(k+'.glb')).exists() or (out/(k+'.blend')).exists():raise RuntimeError('Refusing overwrite: '+k)
    scene=bpy.data.scenes.new(k+'_Asset');bpy.context.window.scene=scene;scene.unit_settings.system='METRIC'
    asset=bpy.data.collections.new(k+'_Model');scene.collection.children.link(asset);M=palette()
    build_geometry(k)
    bpy.ops.object.select_all(action='DESELECT')
    for o in asset.objects:o.select_set(True)
    bpy.context.view_layer.objects.active=next(iter(asset.objects));bpy.ops.object.join();model=bpy.context.object;model.name=k
    scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    # Keep transforms portable and finite.
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    bm=bmesh.new();bm.from_mesh(model.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(model.data);bm.free()
    bpy.context.view_layer.update();model.data.calc_loop_triangles()
    bpy.ops.export_scene.gltf(filepath=str(out/(k+'.glb')),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_cameras=False,export_lights=False,export_materials='EXPORT')
    b=(out/(k+'.glb')).read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n])
    assert len(g['meshes'])==1 and len(g['nodes'])==1 and len(g['scenes'])==1
    assert not g.get('images') and all('uri' not in b for b in g['buffers'])
    tris=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
    metadata={'asset':k,'label':title,'selector':spec[2],'triangles':tris,'materials':len(g['materials']),'dimensions_m':[round(v,3) for v in model.dimensions],'origin':'ground center','units':'meters','front_blender':'-Y','front_gltf':'+Z','up_gltf':'+Y','textures':[],'static':True,'glb_bytes':len(b),'validation':'model-only GLB, one scene/mesh/node, embedded materials, no external dependencies'}
    (out/'asset.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf8')
    (out/'generate.py').write_text("import runpy\nfrom pathlib import Path\nns=runpy.run_path(str(Path(__file__).resolve().parents[1]/'generate_buildings.py'))\nns['build']("+repr(k)+")\n",encoding='utf8')
    (out/'README.md').write_text('# '+title+'\n\nLow-Poly-Asset im Stil des Questhauses. GLB enthält nur das Modell mit eingebetteten PBR-Materialien. Die Blender-Datei enthält zusätzlich eine separate Preview_Stage.\n\nEin statisches Mesh, '+str(tris)+' Dreiecke. Ursprung auf Bodenhöhe, Maße in Metern, GLB: Y oben, Front +Z. Keine externen Texturen.\n\nNoch nicht in den 2D-Canvas-Renderer integriert. Erzeugung über generate.py in Blender; vorhandene Modelle werden nicht überschrieben.\n',encoding='utf8')
    stage_scene(scene,title,model);scene.render.filepath=str(out/'preview.png')
    bpy.data.libraries.write(str(out/(k+'.blend')),{scene},fake_user=True)
    if render:bpy.ops.render.render(write_still=True)
    return metadata
