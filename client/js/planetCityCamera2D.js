/** Keep the entire viewport inside one finite painting, including behind floating UI. */
export function constrainCityPose(pose, landscape, viewport, area) {
  const minimumZoom=Math.max(viewport.width/landscape.width,viewport.height/landscape.height);
  const zoom=Math.max(minimumZoom,Math.min(Math.max(3,minimumZoom),pose.zoom));
  const cx=area.x+area.width/2,cy=area.y+area.height/2;
  const left=landscape.x+cx/zoom,right=landscape.x+landscape.width-(viewport.width-cx)/zoom;
  const top=landscape.y+cy/zoom,bottom=landscape.y+landscape.height-(viewport.height-cy)/zoom;
  return {x:Math.max(left,Math.min(right,pose.x)),y:Math.max(top,Math.min(bottom,pose.y)),zoom};
}
export function fitCityOverview(bounds,landscape,viewport,area) {
  return constrainCityPose({x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2,
    zoom:Math.min(area.width/bounds.width,area.height/bounds.height)*.96},landscape,viewport,area);
}
