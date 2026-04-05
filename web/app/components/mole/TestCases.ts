import * as d3 from "d3";

export function addEllipseTest(svgFrame : any){

    svgFrame.append('ellipse')
    .attr('cx', 10)
    .attr('cy', 10)
    .attr('rx', 10)
    .attr('ry', 10)
    .style('fill', 'green');
}