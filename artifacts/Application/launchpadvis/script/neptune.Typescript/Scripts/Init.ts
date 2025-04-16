let Graph: any = null;
let Shape: any = null;
let Stencil: any = null;
let Keyboard: any = null;
let Hierarchy: any = null;
let Model: any = null;
let X6Selection: any = null;
let Snapline: any = null;

let graph: any = null;
let stencil: any = null;
let clickedSource: any = null;
let previousSource: any = null;
let previousLength: number = 0;
let previousLengthIcon: number = 0;

declare const getX6Object: () => Promise<X6Object>;

namespace Init {
    export async function coreSetup() {
        try {
            const X6Objects = await getX6Object();
            const extraModules = await Modules.getModules();

            Keyboard = extraModules.Keyboard;
            Hierarchy = extraModules.Hierarchy;
            X6Selection = extraModules.Selection;
            Snapline = extraModules.Snapline;
            Graph = X6Objects.Graph;
            Shape = X6Objects.Shape;
            Stencil = X6Objects.Stencil;
            History = X6Objects.History;
            Model = X6Objects.Model;

            await Functions.refreshMainPage();
            modelData.setData({
                mode: "none", // none, create, view, edit
                focusedCell: false,
                createData: {
                    launchpadName: null,
                    title: null,
                    subTitle: "Create a complete launchpad by connecting edges between nodes",
                },
                viewData: {
                    launchpadName: null,
                    title: null,
                    subTitle: "View existing launchpads and understand their structure breakdown",
                },
                selectedLaunchpad: null,
            });
        } catch (error) {
            console.error("Error during core setup:", error);
        }
    }

    export let textColor: string;
    export let systemTheme: string;

    export async function render(themeChange: boolean = false) {
        //@ts-ignore
        if (poSettings.getData().cockpit.theme) { // @ts-ignore
            systemTheme = poSettings.getData().cockpit.theme;
            VBox.addStyleClass("launchpadvis-VBox-23");
        } else {
            const neptuneTheme = sap.ui.getCore().getConfiguration().getTheme();
            const result = neptuneTheme.includes("dark");
            systemTheme = result ? "dark" : "light";

            VBox.removeStyleClass("launchpadvis-VBox-24-light");
            VBox.removeStyleClass("launchpadvis-VBox-24-dark");

            VBox.addStyleClass(`launchpadvis-VBox-24-${systemTheme}`);

           headerIconSelectedNode.removeStyleClass('launchpadvis-light-selectedIcon');
           headerIconSelectedNode.removeStyleClass('launchpadvis-dark-selectedIcon');

           headerIconSelectedNode.addStyleClass(`launchpadvis-${systemTheme}-selectedIcon`);
        }

        if (systemTheme === "light") {
            Init.textColor = "#191919";
        } else {
           Init.textColor = "#FFFFFF";
        }

        stencil = null;

        if (graph) {
            graph.dispose();
            graph = null;
        }

        graph = new Graph({
            container: document.getElementById("graph-container")!,
            grid: true,
            mousewheel: {
                enabled: true,
            },
            panning: {
                enabled: true,
            },
            connecting: {
                router: "manhattan",
                connector: {
                    name: "rounded",
                    args: {
                        radius: 8,
                    },
                },
                anchor: "center",
                connectionPoint: "anchor",
                allowBlank: false,
                snap: {
                    radius: 20,
                },
                createEdge() {
                    return new Shape.Edge({
                        attrs: {
                            line: {
                                stroke: textColor, // A2B1C3
                                strokeWidth: 2,
                                targetMarker: {
                                    name: "block", // ellipse
                                    width: 12,
                                    height: 8,
                                },
                            },
                        },
                        zIndex: 0,
                        tools: [
                            {
                                name: "button-remove",
                                args: { distance: -40 },
                            },
                        ],
                    });
                },
                validateConnection: function (this: any, args: any) {
                    if (args.sourceCell.id === args.targetCell.id) return false;

                    if (args.targetPort === "in-port" && args.sourcePort === "out-port") {
                        if (
                            args.sourceCell.store.data.shape === "launchpad" &&
                            args.targetCell.store.data.shape === "tile"
                        ) {
                            return false;
                        }

                        if (
                            args.sourceCell.store.data.shape === "tile-group" &&
                            args.targetCell.store.data.shape === "application"
                        ) {
                            return false;
                        }

                        if (
                            args.sourceCell.store.data.shape === "tile-group" &&
                            args.targetCell.store.data.shape === "tile-group"
                        ) {
                            return false;
                        }

                        if (
                            args.sourceCell.store.data.shape === "tile" &&
                            args.targetCell.store.data.shape === "tile"
                        ) {
                            return false;
                        }

                        if (
                            args.sourceCell.store.data.shape === "tile" &&
                            args.targetCell.store.data.shape === "tile-group"
                        ) {
                            return false;
                        }

                        if (
                            args.sourceCell.store.data.shape === "launchpad" &&
                            args.targetCell.store.data.shape === "application"
                        ) {
                            return false;
                        }

                        if (args.targetCell) {
                            const cellSource = graph.getCellById(args.sourceCell.id);
                            const edgesOut = graph.getConnectedEdges(cellSource);

                            let count = 0;
                            edgesOut.forEach((edge: any) => {
                                const sourceNodeId = edge.getSourceCellId();
                                const targetNodeId = edge.getTargetCellId();

                                if (
                                    sourceNodeId === args.sourceCell.id &&
                                    targetNodeId === args.targetCell.id
                                ) {
                                    count += 1;
                                }
                            });

                            if (count > 0) {
                                return false;
                            }
                        }

                        if (
                            graph.getConnectedEdges(args.targetCell, {
                                incoming: true,
                                outgoing: false,
                            }).length >= 1
                        ) {
                            return false;
                        }

                        return true;
                    }

                    return false;
                },
                validateMagnet: function (this: any, args: any) {
                    const isOutPort = args.magnet.classList.contains("port-out");

                    if (!isOutPort) {
                        return false;
                    }

                    const shape = args.cell.store.data.shape;
                    const nodeID = args.cell.store.data.id;
                    if (shape === "tile") {
                        const node = graph.getCellById(nodeID);
                        const connectedEdges = graph.getConnectedEdges(node, {
                            incoming: false,
                            outgoing: true,
                        });
                        return connectedEdges.length === 0;
                    } else {
                        return isOutPort;
                    }
                },
            },
            highlighting: {
                magnetAdsorbed: {
                    name: "stroke",
                    args: {
                        attrs: {
                            fill: "#5F95FF",
                            stroke: "#5F95FF",
                        },
                    },
                },
            },
        });
        graph
            .use(new History())
            .use(
                new X6Selection({
                    enabled: true,
                    multiple: true,
                    rubberband: true,
                    movable: true,
                    showNodeSelectionBox: true,
                    modifiers: "shift",
                })
            )
            .use(new Snapline());

        stencil = new Stencil({
            title: "Artifacts",
            target: graph,
            stencilGraphWidth: 400,
            stencilGraphHeight: 400,
            collapsable: false,
            groups: [
                {
                    title: "Tiles and Tiles Groups",
                    name: "group1",
                },
            ],
            layoutOptions: {
                columns: 1,
                columnWidth: 180,
                rowHeight: 100,
            },
        });

        const stencilElement = document.getElementById("stencil");
        if (stencilElement.childNodes.length === 0) {
            stencilElement.appendChild(stencil.container);
        } else {
            stencilElement.textContent = "";
            stencilElement.appendChild(stencil.container);
        }

        const showPorts = (ports: NodeListOf<SVGElement>, show: boolean) => {
            for (let i = 0, len = ports.length; i < len; i += 1) {
                ports[i].style.visibility = show ? "visible" : "hidden";
            }
        };

        Graph.registerNode(
            "application",
            {
                width: 180,
                height: 75, // 60
                attrs: {
                    body: {
                        stroke: "#ff9e33",
                        strokeWidth: 1,
                        fill: "rgba(255, 210, 94, 0.05)", //rgba(95,149,255,0.05)
                        refWidth: 1,
                        refHeight: 1,
                    },
                    title: {
                        text: "Application",
                        refX: 20,
                        refY: 20,
                        fill: textColor, // rgba(0,0,0,0.85)
                        fontSize: 18,
                        "text-anchor": "start",
                    },
                    text: {
                        text: "",
                        refX: 20,
                        refY: 55,
                        fontSize: 12,
                        fill: textColor,
                        "text-anchor": "start",
                    },
                    metadata: {
                        nodeID: null,
                        shape: null,
                        name: null,
                        title: null,
                        description: null,
                        artifactID: null,
                        appType: "application",
                    },
                    icon: {
                        xlinkHref: `/public/icons/solid/app-designer.svg`,
                        refX: 125,
                        refY: 10,
                        width: 40,
                        height: 40,
                        fill: "#FF5733",
                        class: `launchpadvis-${systemTheme}-icon`,
                    },
                },
                markup: [
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
                ],
                ports: {
                    groups: {
                        in: cellPorts.groups.in,
                    },
                    items: cellPorts.items.filter((item) => item.group === "in"),
                },
            },
            true
        );

        Graph.registerNode(
            "tile",
            {
                width: 180,
                height: 75,
                attrs: {
                    body: {
                        stroke: "#ff9e33",
                        strokeWidth: 1,
                        fill: "rgba(255, 210, 94, 0.05)",
                        refWidth: 1,
                        refHeight: 1,
                    },
                    title: {
                        text: "Tile",
                        refX: 20,
                        refY: 20,
                        fill: textColor,
                        fontSize: 18,
                        "text-anchor": "start",
                    },
                    text: {
                        text: "",
                        refX: 20,
                        refY: 55,
                        fontSize: 12,
                        fill: textColor,
                        "text-anchor": "start",
                    },
                    metadata: {
                        id: null,
                        name: null,
                        title: null,
                        description: null,
                        artifactID: null,
                    },
                    icon: {
                        xlinkHref: `/public/icons/solid/tile.svg`,
                        refX: 125,
                        refY: 10,
                        width: 40,
                        height: 40,
                        fill: "#FF5733",
                        class: `launchpadvis-${systemTheme}-icon`,
                    },
                },
                markup: [
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
                ],
                ports: { ...cellPorts },
            },
            true
        );

        Graph.registerNode(
            "tile-group",
            {
                width: 180,
                height: 75,
                attrs: {
                    body: {
                        stroke: "#ff9e33",
                        strokeWidth: 1,
                        fill: "rgba(255, 210, 94, 0.05)",
                        refWidth: 1,
                        refHeight: 1,
                    },
                    title: {
                        text: "Tile Group",
                        refX: 20,
                        refY: 20,
                        fill: textColor,
                        fontSize: 18,
                        "text-anchor": "start",
                    },
                    text: {
                        text: "",
                        refX: 20,
                        refY: 55,
                        fontSize: 12,
                        fill: textColor,
                        "text-anchor": "start",
                    },
                    metadata: {
                        id: null,
                        name: null,
                        title: null,
                        description: null,
                        artifactID: null,
                    },
                    icon: {
                        xlinkHref: `/public/icons/solid/tilegroup.svg`,
                        refX: 125,
                        refY: 10,
                        width: 40,
                        height: 40,
                        fill: "#FF5733",
                        class: `launchpadvis-${systemTheme}-icon`,
                    },
                },
                markup: [
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
                ],
                ports: { ...cellPorts },
            },
            true
        );

        Graph.registerNode(
            "launchpad",
            {
                width: 180,
                height: 75,
                attrs: {
                    body: {
                        stroke: "#ff9e33",
                        strokeWidth: 1,
                        fill: "rgba(255, 210, 94, 0.05)",
                        refWidth: 1,
                        refHeight: 1,
                    },
                    title: {
                        text: "Launchpad",
                        refX: 20,
                        refY: 20,
                        fill: textColor,
                        fontSize: 18,
                        "text-anchor": "start",
                    },
                    text: {
                        text: "",
                        refX: 20,
                        refY: 55,
                        fontSize: 12,
                        fill: textColor,
                        "text-anchor": "start",
                    },
                    metadata: {
                        id: null,
                        name: null,
                        title: null,
                        description: null,
                        artifactID: null,
                    },
                    icon: {
                        xlinkHref: `/public/icons/solid/launchpad.svg`,
                        refX: 125,
                        refY: 10,
                        width: 40,
                        height: 40,
                        fill: "#FF5733",
                        class: `launchpadvis-${systemTheme}-icon`,
                    },
                },
                markup: [
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
                ],
                ports: {
                    groups: {
                        out: cellPorts.groups.out,
                    },
                    items: cellPorts.items.filter((item) => item.group === "out"),
                },
            },
            true
        );

        Graph.registerNode(
            "dynamic",
            {
                width: 180,
                height: 75, // 60
                attrs: {
                    body: {
                        stroke: "#ff9e33",
                        strokeWidth: 1,
                        fill: "rgba(255, 210, 94, 0.05)", //rgba(95,149,255,0.05)
                        refWidth: 1,
                        refHeight: 1,
                    },
                    title: {
                        text: "Dynamic",
                        refX: 20,
                        refY: 20,
                        fill: textColor, // rgba(0,0,0,0.85)
                        fontSize: 18,
                        "text-anchor": "start",
                    },
                    text: {
                        text: "",
                        refX: 20,
                        refY: 55,
                        fontSize: 12,
                        fill: textColor,
                        "text-anchor": "start",
                    },
                    metadata: {
                        nodeID: null,
                        shape: null,
                        name: null,
                        title: null,
                        description: null,
                        artifactID: null,
                        appType: null,
                    },
                    icon: {
                        xlinkHref: `/public/icons/seti/info.svg`,
                        refX: 125,
                        refY: 10,
                        width: 40,
                        height: 40,
                        fill: "#FF5733",
                    },
                },
                markup: [
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
                ],
                ports: {
                    groups: {
                        in: cellPorts.groups.in,
                    },
                    items: cellPorts.items.filter((item) => item.group === "in"),
                },
            },
            true
        );

        const r3 = graph.createNode({
            shape: "tile-group",
            attrs: {
                text: {
                    text: "",
                },
            },
        });
        const r2 = graph.createNode({
            shape: "tile",
            attrs: {
                text: {
                    text: "",
                },
            },
        });

        const r1 = graph.createNode({
            shape: "application",
            attrs: {
                text: {
                    text: "",
                },
            },
        });

        function zoom(event: any) {
            event.preventDefault();

            const zoomDirection = event.deltaY < 0 ? "zoom-in" : "zoom-out";
            if (zoomDirection === "zoom-in") {
                graph.zoom(0.01);
            }
            if (zoomDirection === "zoom-out") {
                graph.zoom(-0.01);
            }
        }
        const graphContainer = graph.container;
        graphContainer.onwheel = zoom;

        stencil.load([r3, r2, r1], "group1");

        if (!themeChange) {
            Functions.addLaunchpadNode();
        }
    }
}

(async () => {
    await Init.coreSetup();
})();
