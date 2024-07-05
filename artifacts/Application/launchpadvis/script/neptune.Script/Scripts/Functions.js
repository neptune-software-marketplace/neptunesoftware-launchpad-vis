function addLaunchpadNode() {
    if (graph) {
        graph.addNode({
            shape: "launchpad",
        });
    }
}

function centerContent() {
    if (graph) {
        graph.centerContent();
        graph.zoomToFit({
            padding: 50,
            maxScale: 2,
        });
    }
}

function stencilVisibility(val) {
    const stencilDiv = document.getElementById("stencil");
    stencilDiv.style.display = val ? "block" : "none";
}
function clear() {
    clickedSource = null;
    previousSource = null;
    modelSelectedNode.setData({
        nodeID: null,
        shape: null,
        name: null,
        title: null,
        description: null,
    });
    modelData.getData().focusedCell = false;
    modelSelectedNode.refresh();
    modelData.refresh();
    if (graph) {
        graph.clearCells();
    }
}

function buildNestedStructure(nodeId) {
    const node = graph.getCellById(nodeId);
    if (!node) {
        return null;
    }

    const children = [];
    const connectedEdges = graph.getConnectedEdges(node);

    connectedEdges.forEach((edge) => {
        const source = edge.getSourceNode();
        const target = edge.getTargetNode();

        if (source && source.id === nodeId) {
            const childNode = buildNestedStructure(target.id);
            if (childNode) {
                children.push(childNode);
            }
        }
    });

    switch (node.shape) {
        case "application":
            return {
                id: node.id,
                shape: node.shape,
                name: node.attr("metadata/name"),
                children: children,
            };
        case "tile":
            return {
                id: node.id,
                shape: node.shape,
                name: node.attr("metadata/name"),
                title: node.attr("metadata/title"),
                description: node.attr("metadata/description"),
                children: children,
            };
        case "tile-group":
            return {
                id: node.id,
                shape: node.shape,
                name: node.attr("metadata/name"),
                title: node.attr("metadata/title"),
                description: node.attr("metadata/description"),
                children: children,
            };
        case "launchpad":
            return {
                id: node.id,
                shape: node.shape,
                name: node.attr("metadata/name"),
                title: node.attr("metadata/title"),
                description: node.attr("metadata/description"),
                children: children,
            };
        default:
            break;
    }
}

function graphToJSON() {
    const launchpadNode = graph.toJSON().cells.find((obj) => obj.shape === "launchpad");
    if (!launchpadNode) {
        return {};
    }

    return buildNestedStructure(launchpadNode.id);
}

async function graphToNeptune(data) {
    async function processNode(node) {
        let childResponses = [];

        // if the node has children, process them first
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                const childResponse = await processNode(child);
                childResponses.push(childResponse);
            }
        }

        let payload = { ...node }; // copy of the node
        if (
            (payload.shape === "tile-group" || payload.shape === "launchpad") &&
            childResponses.length > 0
        ) {
            payload.childrenResponses = childResponses;
        }
        let response;
        switch (payload.shape) {
            case "application":
                break;
            case "tile":
                const tilePayload = {
                    name: payload.name,
                    title: payload.title,
                    description: payload.description,
                    actionApplication: payload.children[0].name,
                    ...apiDefinitions["tile"],
                };

                response = await artifactAPI(tilePayload, "Tile", "Save");
                response.shape = "tile";
                break;
            case "tile-group":
                const tilesForTilegroup = [];
                if (childResponses.length > 0) {
                    childResponses.forEach((item) => {
                        tilesForTilegroup.push(item);
                    });
                }
                const groupPayload = {
                    name: payload.name,
                    title: payload.title,
                    description: payload.description,
                    tiles: tilesForTilegroup,
                    ...apiDefinitions["tilegroup"],
                };

                response = await artifactAPI(groupPayload, "Category", "Save");
                response.shape = "tile-group";
                break;
            case "launchpad":
                const tilegroupsForLaunch = [];
                if (childResponses.length > 0) {
                    childResponses.forEach((tilegroup) => {
                        tilegroupsForLaunch.push(tilegroup);
                    });
                }
                const launchpadPayload = {
                    name: payload.name,
                    title: payload.title,
                    description: payload.description,
                    cat: tilegroupsForLaunch,
                    ...apiDefinitions["launchpad"],
                };

                response = await artifactAPI(launchpadPayload, "Launchpad", "Save");
                response.shape = "launchpad";
                break;

            default:
                console.log(`Unknown shape: ${node.shape}`);
        }

        return response;
    }

    return await processNode(data);
}

async function artifactAPI(payload, tool, method) {
    return new Promise((resolve, reject) => {
        sap.n.Planet9.function({
            id: tool,
            method: method,
            data: payload,
            success: function (data) {
                resolve(data);
            },
            error: function (er) {
                console.error(er);
                reject(er);
            },
        });
    });
}

function diffJson(before, after, path = "") {
    let diffs = [];

    if (
        typeof before === "object" &&
        before !== null &&
        typeof after === "object" &&
        after !== null
    ) {
        if (Array.isArray(before) && Array.isArray(after)) {
            const beforeIds = new Set(before.map((item) => item.id));
            const afterIds = new Set(after.map((item) => item.id));

            // find added items
            after.forEach((item) => {
                if (!beforeIds.has(item.id)) {
                    diffs.push({ type: "added", path: `${path}[${item.id}]`, value: item });
                }
            });

            // find removed items
            before.forEach((item) => {
                if (!afterIds.has(item.id)) {
                    diffs.push({ type: "removed", path: `${path}[${item.id}]`, value: item });
                }
            });

            // find common items and recurse
            before.forEach((item) => {
                if (afterIds.has(item.id)) {
                    const beforeItem = before.find((i) => i.id === item.id);
                    const afterItem = after.find((i) => i.id === item.id);
                    diffs = diffs.concat(diffJson(beforeItem, afterItem, `${path}[${item.id}]`));
                }
            });
        } else {
            const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

            allKeys.forEach((key) => {
                const newPath = path ? `${path}/${key}` : key;

                if (!(key in before)) {
                    diffs.push({ type: "added", path: newPath, value: after[key] });
                } else if (!(key in after)) {
                    diffs.push({ type: "removed", path: newPath, value: before[key] });
                } else {
                    diffs = diffs.concat(diffJson(before[key], after[key], newPath));
                }
            });
        }
    } else if (before !== after) {
        diffs.push({ type: "changed", path, before, after });
    }

    return diffs;
}

function refreshMainPage() {
    apiartifactTree();
    $.ajax({
        url: "/api/functions/Launchpad/List",
        method: "POST",
        success: function (data) {
            modelLaunchpads.setData(data.launchpad);
        },
        error: function (er) {
            console.error(er);
        },
    });
}

function checkBeforeCreate() {
    const nodes = graph.getNodes();

    // check 1
    const namesCondition = nodes.every((node) => {
        const name = node.store.data.attrs.text.text;
        return name && name.trim().length > 0;
    });

    // check 2
    const edgesCondition = nodes.every((node) => {
        switch (node.shape) {
            case "application":
            case "launchpad":
                return graph.getConnectedEdges(node).length > 0;
            case "tile":
            case "tile-group":
                return graph.getConnectedEdges(node).length >= 2;
            default:
                return false;
        }
    });

    // check 3
    const requiredShapes = new Set(["application", "launchpad", "tile", "tile-group"]);
    const foundShapes = new Set();

    nodes.forEach((node) => {
        if (requiredShapes.has(node.shape)) {
            foundShapes.add(node.shape);
        }
    });

    const shapeCondition = requiredShapes.size === foundShapes.size;

    return {
        namesCondition: namesCondition,
        edgesCondition: edgesCondition,
        shapeCondition: shapeCondition
    };
}
