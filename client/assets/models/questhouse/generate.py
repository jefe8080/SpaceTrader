
import bpy, math, json
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/projects/SpaceTrader/client/assets/models/questhouse')
OUT.mkdir(parents=True, exist_ok=True)
if any((OUT/n).exists() for n in ['questhouse.blend','questhouse.glb']):
    raise RuntimeError('Asset already exists; refusing to overwrite.')
scene=bpy.data.scenes.new('Questhouse_Asset')
bpy.context.window.scene=scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1
asset=bpy.data.collections.new('Questhouse_Model')
stage=bpy.data.collections.new('Preview_Stage')
scene.collection.children.link(asset)
scene.collection.children.link(stage)
def material(name, rgb, metal=0, rough=.65, emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Metallic'].default_value=metal
    p.inputs['Roughness'].default_value=rough
    if emission:
        p.inputs['Emission Color'].default_value=(*rgb,1)
        p.inputs['Emission Strength'].default_value=emission
    return m
cream=material('QH_Warm_Ceramic',(.69,.63,.48))
light=material('QH_Ivory_Trim',(.91,.86,.69))
dark=material('QH_Graphite',(.055,.10,.13),.4)
teal=material('QH_Teal_Paint',(.045,.31,.34),.25)
glass=material('QH_Cyan_Glass',(.12,.65,.72),.35,.25,.25)
orange=material('QH_Amber',(.95,.39,.08),.15)
glow=material('QH_Warm_Light',(1,.73,.30),0,.5,1.5)
concrete=material('QH_Foundation',(.24,.29,.29))
solar=material('QH_Solar_Cells',(.035,.14,.24),.45,.35)
def register(o,name,mat):
    o.name=name
    for c in list(o.users_collection): c.objects.unlink(o)
    asset.objects.link(o)
    if mat: o.data.materials.append(mat)
    return o
def finish(o,bev):
    bpy.context.view_layer.objects.active=o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bev:
        mod=o.modifiers.new('Small chamfers','BEVEL'); mod.width=bev; mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def box(name,loc,size,mat,bev=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=register(bpy.context.object,name,mat); o.scale=size
    return finish(o,bev)
def cyl(name,loc,r,depth,mat,vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
    return register(bpy.context.object,name,mat)
def beam(name,a,b,r,mat):
    a,b=Vector(a),Vector(b)
    o=cyl(name,(a+b)/2,r,(b-a).length,mat)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return o
def text(name,string,loc,size,mat):
    c=bpy.data.curves.new(name,'FONT'); c.body=string;c.align_x='CENTER';c.align_y='CENTER'
    c.size=size;c.extrude=.003;c.resolution_u=1
    o=bpy.data.objects.new(name,c);asset.objects.link(o);o.location=loc
    o.rotation_euler=(math.pi/2,0,0);c.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.convert(target='MESH')
    return bpy.context.object
# Main entrance faces Blender -Y. Ground origin is the footprint center.
box('Foundation',(0,0,.16),(10,7.4,.32),concrete,.10)
box('Foundation_upper',(0,.2,.36),(9.45,6.4,.16),dark,.045)
box('Main_hull',(-.55,.45,1.98),(7.0,4.9,3.08),cream,.13)
box('Lower_protection_band',(-.55,.45,.69),(7.15,5.02,.48),teal,.04)
for x in [-3.83,2.73]:
    box('Corner_column',(x,-2.04,1.95),(.22,.2,3.0),light,.025)
# Front cladding divisions, generous simple shapes for distance readability.
for x in [-2.67,1.68]:
    box('Facade_panel',(x,-2.035,2.23),(1.8,.11,1.98),light,.025)
    box('Window_frame',(x,-2.12,2.47),(1.53,.14,.92),dark,.04)
    box('Window_glass',(x,-2.201,2.47),(1.32,.025,.71),glass,.018)
    box('Window_divider',(x,-2.228,2.47),(.055,.04,.76),teal,.006)
    box('Window_sill',(x,-2.24,1.97),(1.63,.23,.13),teal,.02)
# Door and orange entry frame
box('Entry_frame',(-.50,-2.12,1.57),(1.74,.27,2.26),orange,.07)
box('Entry_recess',(-.50,-2.27,1.54),(1.46,.09,2.08),dark,.025)
for x in [-.85,-.15]:
    box('Door_leaf',(x,-2.33,1.48),(.65,.055,1.86),teal,.025)
    box('Door_window',(x,-2.367,1.94),(.45,.022,.68),glass,.01)
    box('Door_handle',(x+(.17 if x<-.5 else -.17),-2.40,1.28),(.045,.06,.24),light,.01)
box('Door_light',(-.5,-2.33,2.54),(1.12,.06,.07),glow,.01)
for i in range(3):
    box('Entry_step',(-.5,-3.46+i*.36,.07+i*.09),(2.5,.48,.14+i*.18),concrete,.035)
# AUFTRAEGE sign over canopy
box('Sign_housing',(-.55,-2.16,3.12),(5.45,.25,.62),dark,.06)
box('Sign_face',(-.55,-2.305,3.12),(5.18,.035,.43),teal,.01)
text('AUFTRAEGE_letters','AUFTRÄGE',(-.55,-2.337,3.12),.41,light)
for x in [-3.05,1.95]:
    box('Sign_marker',(x,-2.34,3.12),(.08,.05,.29),orange,.01)
box('Entry_canopy',(-.50,-2.83,2.78),(2.7,1.64,.16),dark,.04)
box('Canopy_edge',(-.50,-3.64,2.79),(2.73,.10,.16),orange,.02)
for x in [-1.70,.70]:
    cyl('Canopy_post',(x,-3.43,1.49),.065,2.52,teal)
# Notice terminal to right of entrance.
box('Mission_board',(2.78,-2.35,1.37),(.61,.21,1.32),dark,.035)
box('Board_display',(2.78,-2.47,1.51),(.46,.025,.83),teal,.01)
d=box('Mission_diamond',(2.78,-2.49,1.73),(.16,.03,.16),orange,.008)
d.rotation_euler[1]=math.pi/4
for z,w in [(1.47,.32),(1.35,.25),(1.23,.29)]:
    box('Board_line',(2.78,-2.49,z),(w,.02,.035),light,.003)
# Low pitched graphite roof.
verts=[(-4.25,-2.26,3.53),(3.15,-2.26,3.53),(-.55,-2.26,4.65),
       (-4.25,3.12,3.53),(3.15,3.12,3.53),(-.55,3.12,4.65)]
faces=[(0,1,2),(5,4,3),(0,3,4,1),(0,2,5,3),(2,1,4,5)]
mesh=bpy.data.meshes.new('Roof_mesh');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('Pitched_roof',mesh);asset.objects.link(o);mesh.materials.append(dark)
box('Roof_ridge',(-.55,.43,4.66),(.18,5.5,.12),teal,.02)
slope=math.atan2(1.12,3.7)
for y in [-1.40,.25,1.90]:
    o=box('Solar_frame',(1.28,y,4.17),(2.40,1.35,.09),teal,.025);o.rotation_euler[1]=slope
    o=box('Solar_panel',(1.265,y,4.225),(2.19,1.15,.035),solar,.006);o.rotation_euler[1]=slope
    for yy in [-.35,0,.35]:
        o=box('Solar_grid',(1.254,y+yy,4.245),(2.12,.018,.015),glass,0);o.rotation_euler[1]=slope
# Side windows and ventilation; finished back facade too.
for y in [-.55,1.40]:
    box('Side_frame',(-4.10,y,2.30),(.12,1.34,.97),dark,.025)
    box('Side_glass',(-4.169,y,2.30),(.022,1.14,.76),glass,.01)
for x in [-2.65,.15]:
    box('Rear_window_frame',(x,2.945,2.4),(1.65,.13,.84),dark,.03)
    box('Rear_window',(x,3.019,2.4),(1.45,.025,.64),glass,.01)
box('Rear_service_door',(2.05,2.956,1.35),(1.01,.10,1.80),teal,.025)
# Asymmetric utility / communications annex.
box('Utility_annex',(3.64,.98,1.31),(1.39,3.49,1.73),teal,.08)
box('Annex_roof',(3.64,.98,2.24),(1.63,3.72,.18),dark,.045)
box('Utility_panel',(4.36,.76,1.36),(.06,1.77,.98),dark,.018)
for z in [1.06,1.23,1.40,1.57,1.74]:
    box('Vent_louver',(4.405,.76,z),(.055,1.46,.06),concrete,.006)
cyl('Antenna_mount',(3.55,1.6,2.44),.42,.3,concrete)
beam('Antenna_mast',(3.55,1.6,2.5),(3.55,1.6,4.65),.055,light)
beam('Antenna_crossbar',(3.10,1.6,4.40),(4,1.6,4.40),.035,dark)
cyl('Antenna_beacon',(3.55,1.6,4.72),.10,.17,glow)
# Small beacon at the entrance, chunky supply case by left wall.
box('Supply_case',(-3.42,-2.70,.78),(.82,.72,.72),orange,.055)
for x in [-3.65,-3.19]:
    box('Case_strap',(x,-2.70,.79),(.08,.77,.75),dark,.01)
# Consolidate static geometry; keep material slots but one mesh/pivot.
bpy.ops.object.select_all(action='DESELECT')
for ob in list(asset.objects): ob.select_set(True)
bpy.context.view_layer.objects.active=next(iter(asset.objects))
bpy.ops.object.join()
model=bpy.context.object;model.name='Questhouse'
scene.cursor.location=(0,0,0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
# Export actual model without preview ground/lights.
bpy.ops.export_scene.gltf(filepath=str(OUT/'questhouse.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_cameras=False,export_lights=False,export_materials='EXPORT')
# A studio stage for review only.
floor_mat=material('Preview_Ground',(.075,.11,.135))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025))
floor=bpy.context.object;floor.name='Preview_Ground'
for c in list(floor.users_collection):c.objects.unlink(floor)
stage.objects.link(floor);floor.data.materials.append(floor_mat)
def aim(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
cam_data=bpy.data.cameras.new('Preview_Camera');cam=bpy.data.objects.new('Preview_Camera',cam_data);stage.objects.link(cam)
cam.location=(12,-17,11);aim(cam,(0,0,2));cam_data.type='ORTHO';cam_data.ortho_scale=16.3;scene.camera=cam
def lamp(name,pos,power,color,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);stage.objects.link(o);o.location=pos;aim(o,(0,0,1.7))
lamp('Warm_key',(-5,-9,12),1900,(1,.83,.64),8)
lamp('Cool_fill',(8,-4,7),1150,(.55,.80,1),7)
lamp('Rim_light',(2,7,10),2200,(.66,.84,1),6)
world=bpy.data.worlds.new('Questhouse_Studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.18,.24,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45;scene.world=world
scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.render.filepath=str(OUT/'preview.png')
bpy.context.view_layer.update()
# Save a standalone project containing only our scene.
bpy.data.libraries.write(str(OUT/'questhouse.blend'),{scene},fake_user=True)
model.data.calc_loop_triangles()
bounds=[model.matrix_world @ Vector(v) for v in model.bound_box]
metadata={'asset':'questhouse','game_kind':'questhouse','style':'stylized low-poly colony sci-fi','units':'meters','origin':'ground center','front_blender':'-Y','front_gltf':'+Z','up_gltf':'+Y','triangles':len(model.data.loop_triangles),'materials':len(model.data.materials),'dimensions_m':[round(v,3) for v in model.dimensions],'textures':[],'files':['questhouse.blend','questhouse.glb','preview.png','preview-back.png','generate.py'],'notes':'GLB contains model only; preview ground/camera/lights only in blend. All materials are portable glTF PBR; no external textures.'}
(OUT/'asset.json').write_text(json.dumps(metadata,indent=2),encoding='utf8')
bpy.ops.render.render(write_still=True)
cam.location=(-12,16,10);aim(cam,(0,0,2))
scene.render.filepath=str(OUT/'preview-back.png')
bpy.ops.render.render(write_still=True)
cam.location=(12,-17,11);aim(cam,(0,0,2))
scene.render.filepath=str(OUT/'preview.png')
result=metadata
