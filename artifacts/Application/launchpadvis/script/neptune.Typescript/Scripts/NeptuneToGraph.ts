namespace Transform {
    export function showUsage(id: string, name: string, title: string, description: string) {
        const tree = [];

        getUsingTree(id, "", 0, tree);

        const preProcessedJSON = {
            id: id,
            name: name,
            shape: "launchpad",
            title: title,
            description: description,
            children: _convertFlatToNested(tree, "key", "parent"),
        };

        const neptuneGraph = processGraph(preProcessedJSON);

        return neptuneGraph;
    }

    function processGraph(data:any) {
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
        if (data.shape === "app") {
            data.shape = "application";
        }
        if (data.children.length !== 0) {
            data.children.forEach((child:any) => {
                processGraph(child);
            });
        }
        return data;
    }

    function getUsingTree(objectId:string, parent:any, level:number, tree:any) {
        const source = modelArtifactRelations
            .getData()
            .usingData.find((x) => x.objectId === objectId);
        // const sourceArtifact = modelartifactsData.getData().find((z) => z.objectId === objectId);
        // find users
        const usingTabData = source?.using.map((y: any) => {
            // const usingID = y.type === "adaptive" ? y.id.toLowerCase() : y.id;

            const artifact = modelArtifactRelations
                .getData()
                .artifactsData.find((z: any) => z.objectId === y.id);
            if (artifact) {
                return {
                    objectId: artifact.objectId,
                    name: artifact.name,
                    type: artifact.type,
                    title: artifact.title,
                    description: artifact.description,
                };
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
                        title: element.title,
                        description: element.description,
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

    export async function renderSymmetricGraph(data:any) {
        await Init.render();
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
        //@ts-ignore
        const model: Model.FromJSONData = { nodes: [], edges: [] };
        const traverse = (data: HierarchyResult) => {
            if (data) {
                let nodeShape = data.data.shape;
                const nodeName = data.data.name;
                const nodeSize = Functions.calculateCellSize(nodeName);
                let appType = null;

                if (nodeShape === "application") {
                    appType = "application";
                }
                if (nodeShape === "adaptive") {
                    appType = "adaptive";
                }

                if (nodeShape === "adaptive") nodeShape = "application";

                model.nodes.push({
                    id: data.data.id, // node id and artifact id
                    shape: nodeShape,
                    width: nodeSize.width,
                    height: nodeSize.height,
                    x: data.x,
                    y: data.y,
                    attrs: {
                        text: {
                            text: data.data.name,
                        },
                        metadata: {
                            nodeID: data.data.id,
                            shape: nodeShape,
                            name: nodeName,
                            title: data.data.title || null,
                            description: data.data.description || null,
                            artifactID: data.data.id || null,
                            appType: appType,
                        },
                    },
                    ports: {
                        groups: cellPorts.groups,
                        items: cellPorts.items.filter(
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
                        attrs: {
                            line: {
                                stroke: Init.textColor,
                                strokeWidth: 2,
                                targetMarker: {
                                    name: "block",
                                    width: 12,
                                    height: 8,
                                },
                            },
                        }
                    });
                    traverse(item);
                });
            }
        };
        traverse(result);
        graph.fromJSON(model);
        Functions.centerContent();
    }
}
