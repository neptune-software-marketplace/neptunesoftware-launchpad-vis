namespace Transform {
    export async function showUsage(id: string, name: string, title: string, description: string) {
        const tree = [];

        getUsingTree(id, "", 0, tree);

        let childrenArray: any;

        // @ts-ignore
        if (typeof _convertFlatToNested === "function") {
            // @ts-ignore
            childrenArray = _convertFlatToNested(tree, "key", "parent");
        } else {
            // @ts-ignore
            childrenArray = neptune.Utils.convertFlatToNested(tree, "key", "parent");
        }

        const preProcessedJSON = {
            id: id,
            name: name,
            shape: "launchpad",
            title: title,
            description: description,
            children: childrenArray,
        };

        const neptuneGraph = processGraph(preProcessedJSON);

        await addNodeIfActionType(neptuneGraph);

        return neptuneGraph;
    }

    async function addNodeIfActionType(node: any) {
        const newNode = {
            id: crypto.randomUUID(),
            name: "",
            shape: "",
            title: "",
            description: "",
            actionURL: null,
            actiongroup: null,
            actionWebApp: null,
            children: [],
        };

        if (node.actionType === "T") {
            const tilegroup = await Functions.artifactAPI({}, "Category", "Get");

            // @ts-ignore
            newNode.name = tilegroup.name;
            // @ts-ignore
            newNode.id = tilegroup.id;
            // @ts-ignore
            newNode.title = tilegroup.title;
            // @ts-ignore
            newNode.description = tilegroup.description;

            newNode.shape = "tile-group";
            node.children.push(newNode);
        }
        if (node.actionType === "U") {
            // @ts-ignore
            newNode.name =
                node.actionURL === "" || node.actionURL === null
                    ? "No selected Webapp"
                    : node.actionURL;
            // @ts-ignore
            newNode.actionURL =
                node.actionURL === "" || node.actionURL === null
                    ? "No selected Webapp"
                    : node.actionURL;

            newNode.shape = "dynamic";
            node.children.push(newNode);
        }
        if (node.actionType === "W") {
            // @ts-ignore
            newNode.name =
                node.actionWebApp === "" || node.actionWebApp === null
                    ? "No selected Webapp"
                    : node.actionWebApp;
            // @ts-ignore
            newNode.actionWebApp =
                node.actionWebApp === "" || node.actionWebApp === null
                    ? "No selected Webapp"
                    : node.actionWebApp;

            newNode.shape = "webapp";
            node.children.push(newNode);
        }

        if (node.shape === "launchpad") {
            const usingLaunch = modelArtifactRelations.getData().usingData.find((item: any) => {
                return item.objectId === node.id;
            }).using;
            if (usingLaunch.length === 1) {
                const usingItem = usingLaunch[0];
                if (usingItem.type === "app") {
                    // @ts-ignore
                    newNode.name = usingItem.id;
                    newNode.shape = "application";
                    node.children.push(newNode);
                }
            }
        }

        if (node.children && node.children.length > 0) {
            node.children.forEach((child: any) => addNodeIfActionType(child));
        }
    }

    function processGraph(data: any) {
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
            data.children.forEach((child: any) => {
                processGraph(child);
            });
        }
        return data;
    }

    function getUsingTree(objectId: string, parent: any, level: number, tree: any) {
        const source = modelArtifactRelations
            .getData()
            .usingData.find((x) => x.objectId === objectId);

        const usingTabData = source?.using.map((y: any) => {
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

                    actionType: artifact.actionType,
                    actionURL: artifact.actionURL,
                    actiongroup: artifact.actiongroup,
                    actionWebApp: artifact.actionWebApp,
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

                        actionType: element.actionType,
                        actionURL: element.actionURL,
                        actiongroup: element.actiongroup,
                        actionWebApp: element.actionWebApp,
                    };
                    tree.push(treeNode);
                    if (!recursive) {
                        getUsingTree(element.objectId, treeNode.key, level + 1, tree);
                    }
                }
            }
        }
    }

    function isRecursive(tree: any, nodeId: string, objectId: string) {
        if (nodeId === "") {
            return false;
        }
        const node = tree.find((x: any) => x.key === nodeId);
        if (node.objectId === objectId) {
            return true;
        }
        return isRecursive(tree, node.parent, objectId);
    }

    const expandedNodes = new Set<string>();
    let originalData: any = null;

    export function calculateSizes(data: any): void {
        let name = data.name;
        let title = data.title;

        //@ts-ignore
        if (data.shape === "dynamic") {
            name = "URL";
        }

        const { cellSize, iconPosition } = Functions.getSize(name, title);

        data.nodeSize = cellSize;
        data.iconSize = iconPosition;

        data.hasChildren = data.children && data.children.length > 0;

        if (data.children) {
            data.children.forEach(calculateSizes);
        }
    }

    export function filterData(node: any): any {
        const filteredNode = { ...node };

        if (node.children && node.children.length > 0) {
            if (expandedNodes.has(node.id)) {
                filteredNode.children = node.children.map(filterData);
            } else {
                delete filteredNode.children;
            }
        }

        return filteredNode;
    }

    export function toggleNodeExpansion(nodeId: string): void {
        if (expandedNodes.has(nodeId)) {
            expandedNodes.delete(nodeId);
        } else {
            expandedNodes.add(nodeId);
        }

        const filteredData = filterData(originalData);
        renderGraph(filteredData);
    }

    export function renderGraph(data: any): void {
        const result = Hierarchy.compactBox(data, {
            direction: "TB",
            getHeight: (d) => d.nodeSize.height,
            getWidth: (d) => d.nodeSize.width,
            getHGap: () => 20,
            getVGap: () => 25,
            getSiblingGap: () => 5,
            alignment: "compact",
            justifyContent: "start",
        });

        //@ts-ignore
        const model: Model.FromJSONData = { nodes: [], edges: [] };

        traverseHierarchy(result, model);

        graph.fromJSON(model);
    }

    export function traverseHierarchy(data: HierarchyResult, model: any): void {
        if (data) {
            let nodeShape = data.data.shape;
            let nodeName = data.data.name;
            const nodeSize = data.data.nodeSize;
            const iconSize = data.data.iconSize;
            let nodeTitle = data.data.name;
            let nodeText = data.data.title;
            let appType = null;
            let icon: string;

            if (nodeShape === "application") {
                appType = "application";
                nodeShape = "application";
                icon = `/public/icons/solid/app-designer.svg`;
            } else if (nodeShape === "adaptive") {
                appType = "adaptive";
                nodeShape = "application";
                icon = `/public/icons/solid/adaptive-designer.svg`;
            } else if (nodeShape === "webapp") {
                appType = "webapp";
                nodeShape = "application";
                icon = `/public/font/neptune/1.25/svg/webapp.svg`;
            } else if (nodeShape === "dynamic") {
                nodeTitle = "URL";
            } else {
                icon = null;
            }

            let nodeMarkup = undefined;

            // @ts-ignore
            if (data.data.hasChildren) {
                nodeMarkup = [
                    {
                        tagName: "rect",
                        selector: "body",
                    },
                    {
                        tagName: "text",
                        selector: "title",
                    },
                    {
                        tagName: "text",
                        selector: "text",
                    },
                    {
                        tagName: "image",
                        selector: "icon",
                    },
                    {
                        tagName: "circle",
                        selector: "btn-circle",
                    },
                    {
                        tagName: "text",
                        selector: "btn-text",
                    },
                ];
            }

            const attrs = {
                title: {
                    text: nodeTitle,
                },
                text: {
                    text: nodeText,
                },
                metadata: {
                    nodeID: data.data.id,
                    shape: nodeShape,
                    name: nodeName,
                    title: data.data.title || null,
                    description: data.data.description || null,
                    artifactID: data.data.id || null,
                    appType: appType, // @ts-ignore
                    hasChildren: data.data.hasChildren,
                },
                icon: Object.assign(
                    {
                        refX: iconSize,
                    },
                    icon ? { xlinkHref: icon } : {}
                ),
            };

            // @ts-ignore
            if (data.data.hasChildren) {
                const buttonX = nodeSize.width - 10;
                const buttonY = nodeSize.height - 10;

                attrs["btn-circle"] = {
                    r: 8,
                    cx: buttonX,
                    cy: buttonY,
                    fill: "#ffffff",
                    stroke: "#888888",
                    strokeWidth: 1,
                    cursor: "pointer",
                    class: "expand-collapse-btn",
                };

                attrs["btn-text"] = {
                    x: buttonX,
                    y: buttonY + 4,
                    textAnchor: "middle",
                    fontSize: 12,
                    fontWeight: "bold",
                    fill: "#333333",
                    text: expandedNodes.has(data.data.id) ? "−" : "+",
                    cursor: "pointer",
                    pointerEvents: "none",
                };
            }

            model.nodes.push({
                id: data.data.id,
                shape: nodeShape,
                width: nodeSize.width,
                height: nodeSize.height,
                x: data.x,
                y: data.y,
                markup: nodeMarkup,
                attrs: attrs,
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
                    },
                });
                traverseHierarchy(item, model);
            });
        }
    }

    export async function renderSymmetricGraph(data: any) {
        expandedNodes.clear();

        if (data && data.id) {
            expandedNodes.add(data.id);
        }

        calculateSizes(data);

        await Init.render();

        originalData = JSON.parse(JSON.stringify(data));

        const filteredData = filterData(originalData);
        renderGraph(filteredData);
        Functions.centerContent();
    }
}
