/** Keep the entire viewport inside one finite painting, including behind floating UI. */
export function constrainCityPose(pose, landscape, viewport, area) {
  const minimumZoom=Math.max(viewport.width/landscape.width,viewport.height/landscape.height);
  const zoom=Math.max(minimumZoom,Math.min(Math.max(8,minimumZoom),pose.zoom));
  const cx=area.x+area.width/2,cy=area.y+area.height/2;
  const left=landscape.x+cx/zoom,right=landscape.x+landscape.width-(viewport.width-cx)/zoom;
  const top=landscape.y+cy/zoom,bottom=landscape.y+landscape.height-(viewport.height-cy)/zoom;
  return {x:Math.max(left,Math.min(right,pose.x)),y:Math.max(top,Math.min(bottom,pose.y)),zoom};
}
/** Edge landmarks sometimes need extra magnification to clear opaque controls without leaving the painting. */
export function fitCityFocus(record,landscape,viewport,area,overviewZoom){
  const x=record.x,y=record.y-record.h/2,margin=Math.min(22,area.width/6,area.height/6);
  const base=Math.min(2.1,Math.max(overviewZoom*1.6,Math.min(area.width/410,area.height/310)));
  const zoom=Math.max(base,(area.x+margin)/Math.max(1,x-landscape.x),
    (viewport.width-area.x-area.width+margin)/Math.max(1,landscape.x+landscape.width-x),
    (area.y+margin)/Math.max(1,y-landscape.y),
    (viewport.height-area.y-area.height+margin)/Math.max(1,landscape.y+landscape.height-y));
  return constrainCityPose({x,y,zoom},landscape,viewport,area);
}
export function fitCityOverview(bounds,landscape,viewport,area) {
  return constrainCityPose({x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2,
    zoom:Math.min(area.width/bounds.width,area.height/bounds.height)*.96},landscape,viewport,area);
}
