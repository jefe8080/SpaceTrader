"""Validate exported revision-2 GLBs without Blender or third-party packages."""
import json,struct,math
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def validate():
 results=[]
 manifest=json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))
 for descriptor in manifest['assets']:
  raw=(ROOT/descriptor['glb']).read_bytes()
  n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[28+n:]
  def accessor(index):
   a=g['accessors'][index];view=g['bufferViews'][a['bufferView']]
   count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
   fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]
   size=struct.calcsize('<'+fmt*count);stride=view.get('byteStride',size)
   offset=view.get('byteOffset',0)+a.get('byteOffset',0)
   return [struct.unpack_from('<'+fmt*count,binary,offset+i*stride) for i in range(a['count'])]
  degenerate=0;bad_normals=0;triangles=0
  for mesh in g['meshes']:
   for primitive in mesh['primitives']:
    positions=accessor(primitive['attributes']['POSITION'])
    normals=accessor(primitive['attributes']['NORMAL'])
    indices=[v[0] for v in accessor(primitive['indices'])]
    for normal in normals:
     if not all(math.isfinite(v) for v in normal) or abs(sum(v*v for v in normal)-1)>.01:bad_normals+=1
    for i in range(0,len(indices),3):
     a,b,c=[positions[j] for j in indices[i:i+3]]
     u=[b[j]-a[j] for j in range(3)];v=[c[j]-a[j] for j in range(3)]
     cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
     if sum(x*x for x in cross)<1e-12:degenerate+=1
     triangles+=1
  layout=json.loads((ROOT/descriptor['layout']).read_text(encoding='utf-8'))
  by_name={n['name']:n for n in g['nodes']}
  for s in layout['slots']:
   node=by_name[s['node']]
   assert all(abs(a-b)<1e-4 for a,b in zip(node['translation'],s['position']))
  assert len(g['meshes'])==3 and len(layout['slots'])==29
  assert not g.get('images') and not any('uri' in b for b in g['buffers'])
  assert degenerate==0,(descriptor['planet_type'],'degenerate triangles',degenerate)
  assert bad_normals==0,(descriptor['planet_type'],'invalid normals',bad_normals)
  results.append(dict(type=descriptor['planet_type'],triangles=triangles,anchors=29,degenerate_triangles=degenerate,invalid_normals=bad_normals))
 return results
if __name__=='__main__':
 print(json.dumps(validate(),indent=2))
