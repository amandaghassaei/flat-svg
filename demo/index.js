const container = document.getElementById('container');
const errorsAndWarnings = document.getElementById('errorsAndWarnings');
const elementsHover = document.getElementById('elementsHover');
const pathsHover = document.getElementById('pathsHover');
const segmentsHover = document.getElementById('segmentsHover');
const filenameInput = document.getElementById('exportFilename');
const saveButton = document.getElementById('save');

const { FlatSVG } = FlatSVGLib;
let flatSVG, svg;

const viewSelector = document.getElementById('viewType');
viewSelector.onchange = updateView;
const preserveArcsSelector = document.getElementById('preserveArcs');
preserveArcsSelector.onchange = () => { update(svg) };
const applyFilter = document.getElementById('applyFilter');
applyFilter.onchange = updateView;
const filterAttribute = document.getElementById('filterAttribute');
filterAttribute.addEventListener('keyup', updateView);
const filterValue = document.getElementById('filterValue');
filterValue.addEventListener('keyup', updateView);
const filterTolerance = document.getElementById('filterTolerance');
filterTolerance.addEventListener('keyup', updateView);
filterTolerance.onchange = updateView;
const invalidFilter = document.getElementById('invalidFilter');
invalidFilter.style.display = 'none';
const filterSettings = document.getElementById('filterSettings');

function disableFilterToggle(disabled) {
	applyFilter.disabled = disabled;
	filterToggle.style.opacity = disabled ? 0.5: 1;
	filterSettings.style.display = !disabled && applyFilter.checked ? 'block' : 'none';
}

function deepIterChildren(el, parentTags, callback) {
	for (let i = 0; i < el.children.length; i++) {
		const child = el.children[i];
		if (child.tagName !== 'g') {
			callback(child, parentTags);
		} else {
			parentTags.push('g');
		}
		deepIterChildren(child, [...parentTags], callback);
	}
}

const MENU_OFFSET = 10;
function placeMenu(e, div) {
	const { style } = div;
	style.display = 'block';
	const placeLeft = e.clientX < window.innerWidth / 2;
	style.left = placeLeft ? (e.clientX + window.scrollX + MENU_OFFSET) : 'auto';
	style.right = !placeLeft ? (window.innerWidth - (e.clientX + window.scrollX) + MENU_OFFSET) : 'auto';
	style.top = Math.max(window.scrollY + MENU_OFFSET, e.clientY + window.scrollY - div.clientHeight / 2);
}

function updateView() {

	// Remove hover interactions.
	if (document.getElementsByTagName('svg') && document.getElementsByTagName('svg')[0]) {
		deepIterChildren(document.getElementsByTagName('svg')[0], [], (child) => {
			child.onmouseover = undefined;
			child.onmousemove = undefined;
			child.onmouseout = undefined;
		});
	}

	// Get current view selection.
	const selection = viewSelector.options[viewSelector.selectedIndex].value;

	// Get current filter.
	invalidFilter.style.display = 'none';
	disableFilterToggle(selection === 'svg');
	const filter = {
		key: filterAttribute.value,
		value: filterValue.value,
		tolerance: filterTolerance.value,
	};

	try {
		// Add svg string to page.
		switch (selection) {
			case 'svg':
				container.innerHTML = svg;
				break;
			case 'elements':
				if (applyFilter.checked) {
					container.innerHTML = FlatSVG.elementsAsSVG(flatSVG.root, flatSVG.filterElementsByStyle(filter));
				} else {
					container.innerHTML = flatSVG.elementsAsSVG;
				}
				break;
			case 'paths':
				if (applyFilter.checked) {
					container.innerHTML = FlatSVG.pathsAsSVG(flatSVG.root, flatSVG.filterPathsByStyle(filter));
				} else {
					container.innerHTML = flatSVG.pathsAsSVG;
				}
				break;
			case 'segments':
				if (applyFilter.checked) {
					container.innerHTML = FlatSVG.segmentsAsSVG(flatSVG.root, flatSVG.filterSegmentsByStyle(filter));
				} else {
					container.innerHTML = flatSVG.segmentsAsSVG;
				}
				break;
		}
	} catch (error) {
			if (applyFilter.checked && error.message.includes('flat-svg cannot handle filters with key')) {
			// Filter is not valid.
			invalidFilter.style.display = 'inline-block';
			container.innerHTML = svg;
		} else {
			alert(error);
		}
	}

	// Add hover interactions.
	const svgElement = document.getElementsByTagName('svg')[0];
	
	let index = 0;
	deepIterChildren(svgElement, [], (child, parentTags) => {
		const _index = index;
		child.onmouseover = (e) => {
			elementsHover.innerHTML = '';
			const tagName = document.createElement('div');
			const parentTagString = parentTags.length ? parentTags.map(tag => `${tag} > `).join('') : '';
			tagName.innerText = `${parentTagString}${child.tagName}` + (selection === 'svg' ? '' :  ` #${_index}`);
			elementsHover.append(tagName);
			for (let i = 0, num = child.attributes.length; i < num; i++) {
				const attribute = child.attributes[i];
				const div = document.createElement('div');
				div.innerText = `${attribute.name} = ${attribute.value}`;
				elementsHover.append(div);
			}
			placeMenu(e, elementsHover);
		}
		child.onmousemove = (e) => {
			placeMenu(e, elementsHover);
		}
		child.onmouseout = () => {
			elementsHover.style.display = 'none';
		}
		index++;
	});
}

function update(_svg) {
	svg = _svg;
	// Get current view selection.
	const preserveArcs = preserveArcsSelector.options[preserveArcsSelector.selectedIndex].value === 'true';
	flatSVG = new FlatSVG(svg, { preserveArcs });

	const { elements, paths, segments, viewBox, errors, warnings, defs, units } = flatSVG;
	document.getElementById('viewBox').innerText = `[ ${viewBox.join(',  ')} ]`;
	if (viewBox[2] !== 0) {
		let width = viewBox[2];
		switch (units)  {
			case 'px':
				break;
			case 'pt':
				width *= 96 / 72;
			case 'in':
				width *= 96;
				break;
			case 'cm':
				width *= 96 / 2.54;
				break;
			case 'mm':
				width *= 96 / 25.4;
				break;
			case 'pc':
				width *= 96 / 6;
				break;
			// These are approximate.
			case 'em':
				width *= 32;
				break;
			case 'ex':
				width *= 6;
				break;
		}
		container.parentElement.style['max-width'] = width + 'px';
	}
	document.getElementById('numDefs').innerText = defs.length;
	document.getElementById('defs').style.display = defs.length ? 'block' : 'none';
	document.getElementById('numElements').innerText = elements.length;
	document.getElementById('numPaths').innerText = paths.length;
	document.getElementById('numSegments').innerText = segments.length;

	errorsAndWarnings.innerHTML = '';
	if (errors.length) {
		errors.forEach(error => {
			const div = document.createElement('div');
			div.className = 'error';
			div.innerText = 'Error: ' + error;
			errorsAndWarnings.append(div);
		});
	}
	if (warnings.length) {
		warnings.forEach(warning => {
			const div = document.createElement('div');
			div.className = 'warning';
			div.innerText = 'Warning: ' + warning;
			errorsAndWarnings.append(div);
		});
	}
	errorsAndWarnings.style.display = (errors.length || warnings.length) ? 'block' : 'none';

	updateView();
}

// Load an initial svg file from test files.
const initialFile = new XMLHttpRequest();
initialFile.open("GET", './demo.svg', false);
initialFile.onreadystatechange = () => {
	if (initialFile.readyState === 4) {
		if(initialFile.status === 200 || initialFile.status == 0) {
			const svgString = initialFile.responseText;
			update(svgString);
		}
	}
}
initialFile.send(null);

function loadFile(file) {
	if (file.type !== "image/svg+xml" && file.type !== "image/svg") {
		return false;
	}
	let filename = file.name.split('.');
	filename.pop();
	filename = filename.join('.');
	filenameInput.value = filename;
	reader.onload = (e) => {
		// Get data url.
		const _svg = e.target?.result;
		if (!_svg) return;
		update(_svg);
	}; 
	reader.readAsText(file);
	return true;
}

const badFileAlert = (error = 'Unsupported file') => {
	alert(`${error}: Please upload an svg.`);
}

// Paste event.
const reader = new FileReader();
window.addEventListener('paste', e => {
    e.preventDefault();
    const files = (e.clipboardData || e.originalEvent.clipboardData).items;
	if (!files || files.length === 0) return;
	for (let index in files) {
		const item = files[index];
		if (item.kind === 'file') {
			const file = item.getAsFile();
			if (!file) continue;
			if (loadFile(file)) return;
		}
	}
	badFileAlert();
});

// Drop event.
window.addEventListener("dragover",(e) => {
  e.preventDefault();
}, false);
window.addEventListener('drop', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const files = e.dataTransfer?.files; // Array of all files
	if (!files || files.length === 0) return;
	for (let index in files) {
		const file = files[index];
		if (loadFile(file)) return;
	}
	badFileAlert();
}, false);

// File input.
const fileInput = document.getElementById('input');
fileInput.onchange = () => {
	const { files } = fileInput;
	if (!files || files.length === 0) return;
	const file = files[0];
	if(!loadFile(file)) badFileAlert();
}
document.getElementById('upload').onclick = (e) => {
	e.preventDefault();
	fileInput.click();
}

saveButton.onclick = (e) => {
	e.preventDefault();
	const svgBlob = new Blob([container.innerHTML], {type:"image/svg+xml;charset=utf-8"});
	saveAs(svgBlob, filenameInput.value + '.svg');
}