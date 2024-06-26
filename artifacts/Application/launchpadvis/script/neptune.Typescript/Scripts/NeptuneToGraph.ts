interface HierarchyResult {
    id: number;
    x: number;
    y: number;
    shape: string;
    name: string;
    children: HierarchyResult[];
}

function showUsage(id: string, name: string) {
    const tree = [];

    getUsingTree(id, "", 0, tree);

    const preProcessedJSON = {
        id: id,
        name: name,
        shape: "launchpad",
        children: _convertFlatToNested(tree, "key", "parent"),
    };

    const neptuneGraph = processGraph(preProcessedJSON);

    const appData = modelData.getData();
    appData.intial = neptuneGraph;
    modelData.refresh();

    return neptuneGraph;
}

function processGraph(data) {
    delete data["key"];
    delete data["parent"];
    delete data["level"];
    const mapping = { objectId: "id", type: "shape" };
    Object.keys(mapping).forEach((oldKey) => {
        if (data.hasOwnProperty(oldKey)) {
            const newKey = mapping[oldKey];
            data[newKey] = data[oldKey];
            delete data[oldKey];
        }
    });
    if (data.shape === "tile_group") {
        data.shape = "tile-group";
    }
    if (data.children.length !== 0) {
        data.children.forEach((child) => {
            processGraph(child);
        });
    }
    return data;
}

function getUsingTree(objectId, parent, level, tree) {
    const source = modelusingData.getData().find((x) => x.objectId === objectId);
    // const sourceArtifact = modelartifactsData.getData().find((z) => z.objectId === objectId);
    // find users
    const usingTabData = source?.using.map((y) => {
        const artifact = modelartifactsData.getData().find((z) => z.objectId === y.id);
        if (artifact) {
            return { objectId: artifact.objectId, name: artifact.name, type: artifact.type };
        }
    });
    if (usingTabData) {
        for (const element of usingTabData) {
            if (element) {
                const recursive = isRecursive(tree, parent, element.objectId); // tree.find(x => x.objectId === element.objectId);
                const name = recursive ? "RECURSION: " + element.name : element.name;
                const treeNode = {
                    key: crypto.randomUUID(),
                    parent: parent,
                    level: level,
                    name: name,
                    type: element.type,
                    objectId: element.objectId,
                };
                tree.push(treeNode);
                if (!recursive) {
                    getUsingTree(element.objectId, treeNode.key, level + 1, tree);
                }
            }
        }
    }
}

function isRecursive(tree, nodeId, objectId) {
    if (nodeId === "") {
        return false;
    }
    const node = tree.find((x) => x.key === nodeId);
    if (node.objectId === objectId) {
        return true;
    }
    return isRecursive(tree, node.parent, objectId);
}

async function renderSymmetricGraph(data) {
    await render();
    const result = Hierarchy.compactBox(data, {
        direction: "TB",
        getHeight() {
            return 100;
        },
        getWidth() {
            return 30;
        },
        getHGap() {
            return 90;
        },
        getVGap() {
            return 60;
        },
    });

    const model: Model.FromJSONData = { nodes: [], edges: [] };
    const traverse = (data: HierarchyResult) => {
        if (data) {
            const nodeShape = data.data.shape;
            model.nodes?.push({
                id: data.data.id,
                shape: nodeShape,
                x: data.x, // 600
                y: data.y, // 250
                attrs: {
                    text: {
                        text: data.data.name,
                    },
                },
                ports: {
                    groups: ports.groups,
                    items: ports.items.filter(
                        (item) => item.group === (nodeShape === "launchpad" ? "out" : "in")
                    ),
                },
            });
        }
        if (data.children) {
            data.children.forEach((item: HierarchyResult) => {
                model.edges.push({
                    source: { cell: data.data.id, port: "out-port" },
                    target: { cell: item.id, port: "in-port" },
                });
                traverse(item);
            });
        }
    };
    traverse(result);
    graph.fromJSON(model);
    centerContent();
}
