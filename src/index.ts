import JSZip from "jszip"
import * as JSZipUtils from "jszip-utils"
import saveAs from 'file-saver';
import path from 'path'

const pageW = 8.5;
const pageH = 5.8;
const padding = 150;
const groupPadding = 1;

const nodeImages = {
	'WANCloud': '11',
	'cloud': '11',
	'Router': '14',
	'Server': '15',
	'Switch': '16',
	'AccessPoint': '17',
	'Firewall': '18',
	'MultilayerSwitch': '19',
};

const getGroupData = (nodes) => {
	const extremes = nodes.reduce(
		(acc, n) => ({
			x: [Math.min(acc.x[0], n.x), Math.max(acc.x[1], n.x)], 
			y: [Math.min(acc.y[0], n.y), Math.max(acc.y[1], n.y)], 
		}),
		{x: [nodes[0].x, nodes[0].x], y: [nodes[0].y, nodes[0].y]}
	);

	return {
		extremes,
		w: Math.abs(extremes.x[1] - extremes.x[0]) - (padding * 2),
		h: Math.abs(extremes.y[1] - extremes.y[0]) - (padding * 2),
		shiftX: padding - extremes.x[0],
		shiftY: padding - extremes.y[0]
	};
}

export async function generate({nodes = [], edges = [], groups = []}: any, fileName = 'diagram') {
	// console.log("data", nodes, edges, groups);
	const templateZip = require("binary-loader!./template.zip");
	const nodeTmpl = require("./templates/node.xml").default;
	const connShapeTmpl = require("./templates/connector-shape.xml").default;
	const groupTmpl = require("./templates/group.xml").default;
	const logoTmpl = require("./templates/logo.xml").default;
	// console.log('shape', nodeTmpl);

	const zip = await JSZip.loadAsync(templateZip);
	const template = await zip.file("visio/pages/page1.xml").async("text");
	const drawing = getGroupData(nodes);
	const { shiftX, shiftY } = drawing;
	// console.log("drawing data", drawing);
	// console.log('template', template);


	nodes = nodes.map(({x, y, image, ...node}, i) => ({
		...node,
		id: i + 2,
		// x: pageW * (x + shiftX) / drawing.w,
		// y: pageH * (pageH - y + shiftY) / drawing.h,
		x: 0.8 * (x + shiftX) / 50,
		y: -0.8 * (y + shiftY) / 50,
		image: path.basename(image).split(".")[0],
	}));
	const getNodeId = ({name}) => nodes.find(n => n.name === name).id;
	const getGroupId = (groupI) => nodes.length + edges.length + (groupI * 10) + 2;
	const xml = template
		.replace(`<Shapes></Shapes>`, `<Shapes>
			${logoTmpl
				.replace(`<Cell N='Width'/>`, `<Cell N='Width' V='${1.69912977314407 * 2}'/>`)
				.replace(`<Cell N='Height'/>`, `<Cell N='Height' V='${0.3944408401941592 * 2}'/>`)
			}
			${groups.map((group, i) => {
				const gnodes = nodes.filter(n => n.group === group.id);
				const { extremes } = getGroupData(gnodes);
				const width = Math.abs(extremes.x[1] - extremes.x[0]) + (groupPadding * 2);
				const height = Math.abs(extremes.y[1] - extremes.y[0]) + (groupPadding * 2);
				const groupId = getGroupId(i);
				// return '';
				return groupTmpl
					.replace(`ID='1'`, `ID='${groupId}'`)
					.replace(`ID='2'`, `ID='${groupId + 1}'`)
					.replace(`ID='3'`, `ID='${groupId + 2}'`)
					.replace(`ID='4'`, `ID='${groupId + 3}'`)
					.replace(`ID='5'`, `ID='${groupId + 4}'`)
					.replace(`<Cell N='Width'/>`, `<Cell N='Width' V='${width}'/>`)
					.replace(`<Cell N='Height'/>`, `<Cell N='Height' V='${height}'/>`)
					.replace(`<Cell N='PinX'/>`, `<Cell N='PinX' V='${extremes.x[0] - groupPadding + (width / 2)}'/>`)
					.replace(`<Cell N='PinY'/>`, `<Cell N='PinY' V='${extremes.y[0] - groupPadding + (height / 2)}'/>`)
					.replace('<Text></Text>', `<Text><cp IX='0'/>${group.name}</Text>`)
					.replace(`<Cell N='Relationships' V='0'/>`, `<Cell N='Relationships' V='0' F='SUM(DEPENDSON(1,${gnodes.map(n => `Sheet.${getNodeId(n)}!SheetRef()`)}))'/>`)
					// .replace(`<Cell N='Relationships' V='0'/>`, '')
				}).join('\n')}
			${edges.map(({source, target, isStaticWan, warning, width}, i) => {
				const color = isStaticWan ? '#000000' : (warning ? '#c00000' : '#00b050');
				return connShapeTmpl
					.replace(`ID='1'`, `ID='${nodes.length + i + 2}'`)
					.replace(`<Cell N='LineColor'/>`, `<Cell N='LineColor' V='${color}' />`)
					.replace(`<Cell N='LineWeight'/>`, `<Cell N='LineWeight' V='${width * 0.005208333333333335}' U='PT' />`)
			}).join('\n')}
			${nodes.map(({x, y, image, group, name, isCloud, id}, i) => nodeTmpl
				.replace(`<Shape ID='1'`, `<Shape ID='${id}'`)
				.replace(`<Cell N='PinX'/>`, `<Cell N='PinX' V='${x}'/>`)
				.replace(`<Cell N='PinY'/>`, `<Cell N='PinY' V='${y}'/>`)
				.replace(`Master='1'`, `Master='${nodeImages[image]}'`)
				.replace('<Text></Text>', `<Text>${
					image === 'WANCloud'
					?
					'WAN'
					:
					name.replace('Cloud-', '')
				}</Text>`)
				// .replace(`<Cell N='TxtPinY' V='0.1' />`, `<Cell N='TxtPinY' V='${isCloud ? 0.52 : 0.1}' />`)
				.replace(`<Cell N='Relationships' V='0'/>`, 
					// group != undefined 
					// ? 
					// `<Cell N='Relationships' V='0' F='SUM(DEPENDSON(4,Sheet.${getGroupId(group)}!SheetRef()))'/>`
					// :
					''
				)
				.replace(`<Cell N='Size'/>`, isCloud ? (image === 'WANCloud' ? `<Cell N='Size' V='0.3333333333333333'/><Cell N='Style' V='17'/>` : `<Cell N='Size' V='0.194444'/>`) : '')
				.replace(`<Cell N='TxtWidth' V='10' />`, image === 'WANCloud' ? `<Cell N='TxtLocPinY' V='0.1'/><Cell N='TxtWidth' V='10' />`: `<Cell N='TxtWidth' V='10' />`)
			).join('\n')}
			</Shapes>
			<Connects>
				${edges.map(({source, target}, i) => `
					<Connect FromSheet='${nodes.length + i + 2}' ToSheet='${getNodeId(source)}' FromCell='EndX' FromPart='12' ToCell='Connections.X1' ToPart='100' />
					<Connect FromSheet='${nodes.length + i + 2}' ToSheet='${getNodeId(target)}' FromCell='BeginX' FromPart='9' ToCell='Connections.X1' ToPart='100' />
				`).join(`\n`)}
			</Connects>`
		);
	// console.log("xml", xml);
	const blob = await zip
		.file("visio/pages/page1.xml", xml)
		.generateAsync({ type: "blob" });
	
	saveAs(blob, `${fileName}.vsdx`);
}